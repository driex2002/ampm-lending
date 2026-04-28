import { z } from "zod";

export const createLoanSchema = z.object({
  borrowerId: z.string().min(1, "Borrower is required"),
  principalAmount: z
    .number({ required_error: "Principal amount is required" })
    .positive("Amount must be greater than 0")
    .max(10_000_000, "Amount too large"),
  interestRate: z
    .number()
    .min(0, "Interest rate cannot be negative")
    .max(100, "Interest rate cannot exceed 100%"),
  interestRateType: z.enum(["PERCENTAGE_PER_PERIOD", "FLAT_RATE", "DIMINISHING"]),
  termId: z.string().optional().nullable(),
  customTermDescription: z.string().max(500).optional().nullable(),
  penaltyAmount: z.number().min(0).default(0),
  penaltyType: z
    .enum(["FLAT", "PERCENTAGE_OF_PRINCIPAL", "PERCENTAGE_OF_OUTSTANDING"])
    .optional()
    .nullable(),
  graceDays: z.number().int().min(0).max(365).default(0),
  startDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Valid start date required"),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateLoanSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
  status: z
    .enum(["ACTIVE", "COMPLETED", "DEFAULTED", "RESTRUCTURED", "CANCELLED"])
    .optional(),
  penaltyAmount: z.number().min(0).optional(),
  penaltyType: z
    .enum(["FLAT", "PERCENTAGE_OF_PRINCIPAL", "PERCENTAGE_OF_OUTSTANDING"])
    .optional()
    .nullable(),
  graceDays: z.number().int().min(0).max(365).optional(),
});

export const waiveInterestSchema = z.object({
  waiverType: z.enum(["PER_PAYMENT", "FULL_LOAN"]),
  waiverReason: z.string().min(1, "Reason is required").max(1000),
  scheduleId: z.string().optional(), // required for PER_PAYMENT
  customWaivedAmount: z.number().min(0).optional(), // override for FULL_LOAN
});

export const createLoanTermSchema = z.object({
  name: z.string().min(1).max(200),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  totalPeriods: z.number().int().positive(),
  intervalDays: z.number().int().positive().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;
export type WaiveInterestInput = z.infer<typeof waiveInterestSchema>;
export type CreateLoanTermInput = z.infer<typeof createLoanTermSchema>;
