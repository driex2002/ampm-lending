import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isAfter, isBefore } from "date-fns";

// ----------------------------------------------------------------
// Tailwind className merger
// ----------------------------------------------------------------
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ----------------------------------------------------------------
// Currency formatting (Philippine Peso)
// ----------------------------------------------------------------
export function formatCurrency(
  amount: number | string | null | undefined,
  symbol = "₱"
): string {
  const num = Number(amount ?? 0);
  if (isNaN(num)) return `${symbol}0.00`;
  return `${symbol}${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ----------------------------------------------------------------
// Date formatting helpers
// ----------------------------------------------------------------
export function formatDate(
  date: Date | string | null | undefined,
  fmt = "MMM dd, yyyy"
): string {
  if (!date) return "—";
  return format(new Date(date), fmt);
}

export function formatDateTime(
  date: Date | string | null | undefined
): string {
  if (!date) return "—";
  return format(new Date(date), "MMM dd, yyyy hh:mm a");
}

export function formatRelative(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

// ----------------------------------------------------------------
// Reference number generators
// ----------------------------------------------------------------
export function generateLoanNumber(sequence: number): string {
  const prefix = process.env.NEXT_PUBLIC_LOAN_NUMBER_PREFIX ?? "AMPM";
  const year = new Date().getFullYear();
  const paddedSeq = String(sequence).padStart(5, "0");
  return `${prefix}-${year}-${paddedSeq}`;
}

export function generatePaymentReference(sequence: number): string {
  const prefix = process.env.NEXT_PUBLIC_PAYMENT_REF_PREFIX ?? "PAY";
  const dateStr = format(new Date(), "yyyyMMdd");
  const paddedSeq = String(sequence).padStart(5, "0");
  return `${prefix}-${dateStr}-${paddedSeq}`;
}

export function generateTempPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "@#$!";
  const all = upper + lower + digits + special;

  const randomFrom = (str: string) =>
    str[Math.floor(Math.random() * str.length)];

  // Guarantee at least one of each required type
  const chars = [
    randomFrom(upper),
    randomFrom(upper),
    randomFrom(lower),
    randomFrom(lower),
    randomFrom(digits),
    randomFrom(digits),
    randomFrom(special),
    ...Array.from({ length: 3 }, () => randomFrom(all)),
  ];

  // Shuffle
  return chars
    .sort(() => Math.random() - 0.5)
    .join("")
    .slice(0, 10);
}

// ----------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------
export function isOverdue(dueDate: Date | string): boolean {
  return isBefore(new Date(dueDate), new Date());
}

export function isDueSoon(
  dueDate: Date | string,
  daysThreshold = 3
): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + daysThreshold);
  return isAfter(due, now) && isBefore(due, threshold);
}

// ----------------------------------------------------------------
// Pagination helpers
// ----------------------------------------------------------------
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function getPaginationOffset(page = 1, limit = 10) {
  const skip = (Math.max(1, page) - 1) * limit;
  const take = limit;
  return { skip, take };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ----------------------------------------------------------------
// String helpers
// ----------------------------------------------------------------
export function getFullName(
  firstName: string,
  middleName: string | null | undefined,
  lastName: string
): string {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(" ");
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ----------------------------------------------------------------
// Object helpers
// ----------------------------------------------------------------
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

// ----------------------------------------------------------------
// Error message extraction
// ----------------------------------------------------------------
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

// ----------------------------------------------------------------
// Decimal arithmetic (avoid floating point issues)
// ----------------------------------------------------------------
export function toDecimal(value: number | string, places = 2): number {
  return parseFloat(Number(value).toFixed(places));
}
