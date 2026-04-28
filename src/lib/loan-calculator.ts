/**
 * Loan Calculator
 * All financial calculations are handled here to keep business logic
 * separate from API and UI layers.
 *
 * Supports:
 * - PERCENTAGE_PER_PERIOD: rate% of principal each period
 * - FLAT_RATE: rate% of principal as total interest (spread across periods)
 * - DIMINISHING: rate% of outstanding balance each period
 */

import { PaymentFrequency, RateType } from "@prisma/client";
import { addDays, addWeeks, addMonths } from "date-fns";
import { toDecimal } from "@/lib/utils";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface LoanCalculationInput {
  principalAmount: number;
  interestRate: number; // e.g. 5 for 5%
  interestRateType: RateType;
  frequency: PaymentFrequency;
  totalPeriods: number;
  intervalDays?: number; // for CUSTOM frequency
  startDate: Date;
  penaltyAmount?: number;
  penaltyType?: string;
  graceDays?: number;
}

export interface ScheduleEntry {
  periodNumber: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  penaltyDue: number;
  totalDue: number;
  openingBalance: number;
  closingBalance: number;
}

export interface LoanSummary {
  principalAmount: number;
  totalInterest: number;
  totalAmount: number;
  schedule: ScheduleEntry[];
}

// ----------------------------------------------------------------
// Due date generator
// ----------------------------------------------------------------

function getNextDueDate(
  current: Date,
  frequency: PaymentFrequency,
  intervalDays?: number
): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(current, 1);
    case "WEEKLY":
      return addWeeks(current, 1);
    case "BIWEEKLY":
      return addWeeks(current, 2);
    case "MONTHLY":
      return addMonths(current, 1);
    case "CUSTOM":
      return addDays(current, intervalDays ?? 30);
    default:
      return addMonths(current, 1);
  }
}

// ----------------------------------------------------------------
// Main loan calculator
// ----------------------------------------------------------------

export function calculateLoan(input: LoanCalculationInput): LoanSummary {
  const {
    principalAmount,
    interestRate,
    interestRateType,
    frequency,
    totalPeriods,
    intervalDays,
    startDate,
  } = input;

  const rate = interestRate / 100; // convert percent to decimal
  const schedule: ScheduleEntry[] = [];

  let totalInterest = 0;
  let currentDate = new Date(startDate);
  let remainingBalance = principalAmount;

  // ---- Per-period interest ----
  const perPeriodInterest = (() => {
    switch (interestRateType) {
      case "PERCENTAGE_PER_PERIOD":
        // e.g. 5% of principal each period
        return toDecimal(principalAmount * rate);
      case "FLAT_RATE":
        // total interest = rate% of principal, divide by periods
        return toDecimal((principalAmount * rate) / totalPeriods);
      case "DIMINISHING":
        // calculated per period below
        return 0;
      default:
        return 0;
    }
  })();

  // ---- Per-period principal payment ----
  const perPeriodPrincipal = toDecimal(principalAmount / totalPeriods);

  for (let i = 1; i <= totalPeriods; i++) {
    const dueDate = i === 1 ? getNextDueDate(currentDate, frequency, intervalDays) : getNextDueDate(currentDate, frequency, intervalDays);
    currentDate = dueDate;

    const openingBalance = remainingBalance;

    let interestDue = 0;
    let principalDue = 0;

    if (interestRateType === "DIMINISHING") {
      interestDue = toDecimal(remainingBalance * rate);
    } else {
      interestDue = perPeriodInterest;
    }

    // Last period: settle any rounding difference on principal
    if (i === totalPeriods) {
      principalDue = toDecimal(remainingBalance);
    } else {
      principalDue = perPeriodPrincipal;
    }

    const totalDue = toDecimal(principalDue + interestDue);
    remainingBalance = toDecimal(remainingBalance - principalDue);
    const closingBalance = Math.max(0, remainingBalance);

    totalInterest += interestDue;

    schedule.push({
      periodNumber: i,
      dueDate,
      principalDue,
      interestDue,
      penaltyDue: 0,
      totalDue,
      openingBalance,
      closingBalance,
    });
  }

  const totalAmount = toDecimal(principalAmount + totalInterest);

  return {
    principalAmount,
    totalInterest: toDecimal(totalInterest),
    totalAmount,
    schedule,
  };
}

// ----------------------------------------------------------------
// Payment application logic
// ----------------------------------------------------------------

export interface PaymentApplicationInput {
  paymentAmount: number;
  outstandingBalance: number;
  currentSchedule: {
    principalDue: number;
    interestDue: number;
    penaltyDue: number;
    waivedAmount: number;
  };
  allowOverpayment?: boolean;
}

export interface PaymentApplicationResult {
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  waivedInterest: number;
  totalApplied: number;
  newBalance: number;
  isOverpayment: boolean;
  overpaymentAmount: number;
}

export function applyPayment(
  input: PaymentApplicationInput
): PaymentApplicationResult {
  const { paymentAmount, outstandingBalance, currentSchedule, allowOverpayment = false } = input;
  const { principalDue, interestDue, penaltyDue, waivedAmount } = currentSchedule;

  const effectiveInterest = toDecimal(interestDue - waivedAmount);
  const scheduledTotal = toDecimal(principalDue + effectiveInterest + penaltyDue);

  const isOverpayment = paymentAmount > scheduledTotal && !allowOverpayment;
  const overpaymentAmount = Math.max(0, toDecimal(paymentAmount - scheduledTotal));

  // Apply in order: penalty → interest → principal
  let remaining = paymentAmount;

  const penaltyPaid = Math.min(remaining, penaltyDue);
  remaining = toDecimal(remaining - penaltyPaid);

  const interestPaid = Math.min(remaining, effectiveInterest);
  remaining = toDecimal(remaining - interestPaid);

  const principalPaid = Math.min(remaining, principalDue);
  remaining = toDecimal(remaining - principalPaid);

  const totalApplied = toDecimal(penaltyPaid + interestPaid + principalPaid);
  const newBalance = toDecimal(Math.max(0, outstandingBalance - principalPaid));

  return {
    principalPaid,
    interestPaid,
    penaltyPaid,
    waivedInterest: waivedAmount,
    totalApplied,
    newBalance,
    isOverpayment,
    overpaymentAmount,
  };
}

// ----------------------------------------------------------------
// Penalty calculator
// ----------------------------------------------------------------

export interface PenaltyInput {
  penaltyType: string;
  penaltyAmount: number;
  principalAmount: number;
  outstandingBalance: number;
  graceDays: number;
  dueDate: Date;
  paymentDate: Date;
}

export function calculatePenalty(input: PenaltyInput): number {
  const {
    penaltyType,
    penaltyAmount,
    principalAmount,
    outstandingBalance,
    graceDays,
    dueDate,
    paymentDate,
  } = input;

  const daysLate = Math.floor(
    (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLate <= graceDays) return 0;

  switch (penaltyType) {
    case "FLAT":
      return penaltyAmount;
    case "PERCENTAGE_OF_PRINCIPAL":
      return toDecimal(principalAmount * (penaltyAmount / 100));
    case "PERCENTAGE_OF_OUTSTANDING":
      return toDecimal(outstandingBalance * (penaltyAmount / 100));
    default:
      return 0;
  }
}
