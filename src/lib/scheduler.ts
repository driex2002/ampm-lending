/**
 * Email Reminder Scheduler
 *
 * Runs daily inside the Next.js process (started via instrumentation.ts).
 * Three jobs:
 *   1. sendDueDateReminders  — 3-day and 1-day advance notice before a payment is due
 *   2. sendOverdueAlerts     — daily nudge for every unpaid schedule that is past due
 *
 * Loan-completed emails are triggered synchronously in the payments route (not here)
 * so they fire immediately when a payment finalises the loan.
 *
 * Deduplication: the Notification table is checked before each send — if a record
 * of the same type/schedule already exists for today, the email is skipped.
 *
 * Timing: jobs run once at startup (to catch any missed sends on restart), then
 * again every day at midnight UTC (= 8 AM Philippine time, UTC+8).
 */
import "server-only";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/email/mailer";
import {
  paymentReminderTemplate,
  overdueAlertTemplate,
} from "@/lib/email/templates";

// Days before due date to send advance reminders
const ADVANCE_REMINDER_DAYS = [3, 1];

// ---------------------------------------------------------------
// Job 1 — Due-date reminders (3 days before, 1 day before)
// ---------------------------------------------------------------
export async function sendDueDateReminders(): Promise<void> {
  console.log("[Scheduler] Running due-date reminder job…");
  const todayStart = startOfDay(new Date());

  for (const daysBefore of ADVANCE_REMINDER_DAYS) {
    const targetDay = addDays(todayStart, daysBefore);

    const schedules = await db.paymentSchedule.findMany({
      where: {
        status: { in: ["PENDING", "PARTIAL"] },
        dueDate: { gte: startOfDay(targetDay), lte: endOfDay(targetDay) },
        loan: { status: "ACTIVE", deletedAt: null },
      },
      include: {
        loan: {
          include: {
            borrower: {
              select: { id: true, email: true, firstName: true },
            },
          },
        },
      },
    });

    for (const schedule of schedules) {
      const { id: borrowerId, email, firstName } = schedule.loan.borrower;

      // Skip if already sent this type today for this schedule
      const alreadySent = await db.notification.findFirst({
        where: {
          type: "PAYMENT_REMINDER",
          recipientId: borrowerId,
          sentAt: { gte: todayStart },
          metadata: { path: ["scheduleId"], equals: schedule.id },
        },
      });
      if (alreadySent) continue;

      const { subject, html } = paymentReminderTemplate({
        firstName,
        loanNumber: schedule.loan.loanNumber,
        dueDate: format(schedule.dueDate, "MMM dd, yyyy"),
        dueAmount: Number(schedule.totalDue) - Number(schedule.paidAmount),
        daysUntilDue: daysBefore,
        remainingBalance: Number(schedule.loan.outstandingBalance),
      });

      await sendNotification({
        recipientId: borrowerId,
        recipientEmail: email,
        type: "PAYMENT_REMINDER",
        subject,
        html,
        metadata: {
          scheduleId: schedule.id,
          loanId: schedule.loanId,
          daysUntilDue: daysBefore,
          dueDate: schedule.dueDate.toISOString(),
        },
      });

      console.log(
        `[Scheduler] Reminder sent to ${email} — ${schedule.loan.loanNumber} due in ${daysBefore} day(s)`
      );
    }
  }

  console.log("[Scheduler] Due-date reminders done.");
}

// ---------------------------------------------------------------
// Job 2 — Daily overdue alerts (every day until settled)
// ---------------------------------------------------------------
export async function sendOverdueAlerts(): Promise<void> {
  console.log("[Scheduler] Running overdue alert job…");
  const todayStart = startOfDay(new Date());

  const overdueSchedules = await db.paymentSchedule.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      dueDate: { lt: todayStart },
      loan: { status: "ACTIVE", deletedAt: null },
    },
    include: {
      loan: {
        include: {
          borrower: {
            select: { id: true, email: true, firstName: true },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  for (const schedule of overdueSchedules) {
    const { id: borrowerId, email, firstName } = schedule.loan.borrower;

    // Skip if already alerted today for this schedule
    const alreadySent = await db.notification.findFirst({
      where: {
        type: "OVERDUE_ALERT",
        recipientId: borrowerId,
        sentAt: { gte: todayStart },
        metadata: { path: ["scheduleId"], equals: schedule.id },
      },
    });
    if (alreadySent) continue;

    const daysOverdue = Math.floor(
      (todayStart.getTime() - startOfDay(schedule.dueDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const amountStillDue =
      Number(schedule.totalDue) - Number(schedule.paidAmount);

    const { subject, html } = overdueAlertTemplate({
      firstName,
      loanNumber: schedule.loan.loanNumber,
      dueDate: format(schedule.dueDate, "MMM dd, yyyy"),
      dueAmount: amountStillDue,
      daysOverdue,
      penalty: Number(schedule.penaltyDue),
      remainingBalance: Number(schedule.loan.outstandingBalance),
    });

    await sendNotification({
      recipientId: borrowerId,
      recipientEmail: email,
      type: "OVERDUE_ALERT",
      subject,
      html,
      metadata: {
        scheduleId: schedule.id,
        loanId: schedule.loanId,
        daysOverdue,
        dueDate: schedule.dueDate.toISOString(),
      },
    });

    console.log(
      `[Scheduler] Overdue alert sent to ${email} — ${schedule.loan.loanNumber} (${daysOverdue} day(s) overdue)`
    );
  }

  console.log("[Scheduler] Overdue alerts done.");
}

// ---------------------------------------------------------------
// Runner — executes all jobs and swallows errors so one failure
// doesn't block the next job
// ---------------------------------------------------------------
async function runAllJobs(): Promise<void> {
  try {
    await sendDueDateReminders();
  } catch (err) {
    console.error("[Scheduler] Due-date reminder job failed:", err);
  }
  try {
    await sendOverdueAlerts();
  } catch (err) {
    console.error("[Scheduler] Overdue alert job failed:", err);
  }
}

// ---------------------------------------------------------------
// Scheduler bootstrap — called once from instrumentation.ts
// ---------------------------------------------------------------
let _started = false;

export function startScheduler(): void {
  if (_started) return;
  _started = true;

  // Run immediately on startup to catch any missed sends (e.g. after a restart)
  runAllJobs();

  // Schedule next run at midnight UTC (= 8 AM PHT)
  function scheduleNext() {
    const now = new Date();
    const next = new Date(now);
    next.setUTCHours(0, 0, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    const delayMs = next.getTime() - now.getTime();
    console.log(
      `[Scheduler] Next run in ${Math.round(delayMs / 60_000)} minutes (midnight UTC)`
    );
    setTimeout(async () => {
      await runAllJobs();
      scheduleNext(); // reschedule for the following day
    }, delayMs);
  }

  scheduleNext();
}
