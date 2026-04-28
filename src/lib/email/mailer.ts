/**
 * Email Service
 * Uses Nodemailer with SMTP (Gmail App Password or SendGrid)
 * Renders React Email templates to HTML
 *
 * For production at scale, wrap sendEmail calls with a queue
 * (e.g., BullMQ + Redis). For small to medium lending operations,
 * direct SMTP is reliable enough.
 */
import "server-only";
import nodemailer from "nodemailer";
import { db } from "@/lib/db";

// ---------------------------------------------------------------
// SMTP Transport
// ---------------------------------------------------------------

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 10, // max 10 messages per second
  });

  return transporter;
}

// ---------------------------------------------------------------
// Email sending
// ---------------------------------------------------------------

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.sendMail({
      from: process.env.EMAIL_FROM ?? `AMPM Lending <noreply@ampmlending.com>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error) {
    console.error("[Email] Send failed:", error);
    return false;
  }
}

// ---------------------------------------------------------------
// Notification helpers (log to DB + send)
// ---------------------------------------------------------------

export interface NotificationPayload {
  recipientId: string;
  recipientEmail: string;
  type: string;
  subject: string;
  html: string;
  metadata?: Record<string, unknown>;
}

export async function sendNotification(
  payload: NotificationPayload
): Promise<void> {
  // 1. Create notification record (PENDING)
  const notification = await db.notification.create({
    data: {
      type: payload.type as any,
      status: "PENDING",
      recipientId: payload.recipientId,
      recipientEmail: payload.recipientEmail,
      subject: payload.subject,
      metadata: payload.metadata as any,
    },
  });

  // 2. Attempt to send
  const success = await sendEmail({
    to: payload.recipientEmail,
    subject: payload.subject,
    html: payload.html,
  });

  // 3. Update notification status
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: success ? "SENT" : "FAILED",
      sentAt: success ? new Date() : undefined,
      failReason: success ? undefined : "SMTP delivery failed",
    },
  });
}
