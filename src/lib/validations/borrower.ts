import { z } from "zod";

export const createBorrowerSchema = z.object({
  email: z.string().email("Valid email is required").toLowerCase(),
  firstName: z.string().min(1, "First name is required").max(100),
  middleName: z.string().max(100).optional().nullable(),
  lastName: z.string().min(1, "Last name is required").max(100),
  cellphone: z
    .string()
    .min(10, "Valid Philippine cellphone number required")
    .max(15)
    .regex(/^[0-9+\-\s()]+$/, "Invalid cellphone number"),
  sex: z.enum(["Male", "Female", "Other"]),
  birthDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Valid date required"),
  purok: z.string().max(100).optional().nullable(),
  street: z.string().max(200).optional().nullable(),
  barangay: z.string().min(1, "Barangay is required").max(200),
  townCity: z.string().min(1, "Town/City is required").max(200),
  province: z.string().min(1, "Province is required").max(200),
  country: z.string().min(1).max(100).default("Philippines"),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateBorrowerSchema = createBorrowerSchema.partial().extend({
  isActive: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateBorrowerEmailSchema = z.object({
  newEmail: z.string().email("Valid email is required").toLowerCase(),
  reason: z.string().min(1, "Reason is required").max(500),
});

export const blacklistBorrowerSchema = z.object({
  reason: z.string().min(1, "Reason is required").max(1000),
  action: z.enum(["BLACKLIST", "UNBLACKLIST"]),
});

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>;
export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>;
export type UpdateBorrowerEmailInput = z.infer<typeof updateBorrowerEmailSchema>;
export type BlacklistBorrowerInput = z.infer<typeof blacklistBorrowerSchema>;
