import { z } from "zod";

export const recordPaymentSchema = z.object({
  loanId: z.string().min(1, "Loan is required"),
  borrowerId: z.string().min(1, "Borrower is required"),
  amount: z
    .number({ required_error: "Payment amount is required" })
    .positive("Amount must be greater than 0"),
  paymentDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Valid payment date required"),
  paymentType: z.enum(["CASH", "BANK_TRANSFER", "GCASH", "MAYA", "CUSTOM"]),
  scheduleIds: z.array(z.string()).optional(), // which schedule periods this covers
  waiverType: z.preprocess(
    (val) => (val === "" ? null : val),
    z.enum(["PER_PAYMENT", "FULL_LOAN"]).optional().nullable()
  ),
  waiverReason: z.string().max(1000).optional().nullable(),
  penaltyOverride: z.number().min(0).optional().nullable(), // manual penalty entry
  allowOverpayment: z.boolean().default(false),
  remarks: z.string().max(1000).optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const updatePaymentSchema = z.object({
  amount: z
    .number({ required_error: "Payment amount is required" })
    .positive("Amount must be greater than 0")
    .optional(),
  paymentDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Valid payment date required")
    .optional(),
  paymentType: z.enum(["CASH", "BANK_TRANSFER", "GCASH", "MAYA", "CUSTOM"]).optional(),
  principalPaid: z.number().min(0).optional(),
  interestPaid: z.number().min(0).optional(),
  penaltyPaid: z.number().min(0).optional(),
  remarks: z.string().max(1000).optional().nullable(),
});

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
