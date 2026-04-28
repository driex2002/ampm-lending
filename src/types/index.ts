/**
 * Shared TypeScript types used across the application
 */
import type {
  User,
  Loan,
  Payment,
  PaymentSchedule,
  AuditLog,
  LoanTerm,
  SystemSetting,
  LoanStatus,
  PaymentFrequency,
  RateType,
  PenaltyType,
  PaymentType,
  WaiverType,
  ScheduleStatus,
  Role,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export type {
  LoanStatus,
  PaymentFrequency,
  RateType,
  PenaltyType,
  PaymentType,
  WaiverType,
  ScheduleStatus,
  Role,
};

// ---------------------------------------------------------------
// API Response wrappers
// ---------------------------------------------------------------

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ---------------------------------------------------------------
// Borrower (User with relevant computed fields)
// ---------------------------------------------------------------

export type BorrowerSummary = Pick<
  User,
  | "id"
  | "email"
  | "firstName"
  | "middleName"
  | "lastName"
  | "cellphone"
  | "sex"
  | "birthDate"
  | "isActive"
  | "isBlacklisted"
  | "createdAt"
> & {
  fullName: string;
  activeLoansCount: number;
  totalOutstanding: number;
};

export type BorrowerDetail = User & {
  loans: LoanSummary[];
  activeLoansCount: number;
  totalOutstanding: number;
  totalPaid: number;
};

// ---------------------------------------------------------------
// Loan summary types
// ---------------------------------------------------------------

export type LoanSummary = Pick<
  Loan,
  | "id"
  | "loanNumber"
  | "principalAmount"
  | "totalAmount"
  | "outstandingBalance"
  | "totalPaid"
  | "status"
  | "isOverdue"
  | "startDate"
  | "endDate"
  | "interestRate"
  | "interestRateType"
  | "waivedAmount"
  | "isInterestWaived"
> & {
  term: Pick<LoanTerm, "name" | "frequency"> | null;
  borrowerName?: string;
  nextDueDate?: Date | null;
  nextDueAmount?: number;
};

export type LoanDetail = Loan & {
  borrower: Pick<
    User,
    "id" | "email" | "firstName" | "middleName" | "lastName" | "cellphone"
  >;
  term: LoanTerm | null;
  payments: PaymentSummary[];
  paymentSchedules: PaymentSchedule[];
};

// ---------------------------------------------------------------
// Payment types
// ---------------------------------------------------------------

export type PaymentSummary = Pick<
  Payment,
  | "id"
  | "referenceNumber"
  | "amount"
  | "principalPaid"
  | "interestPaid"
  | "penaltyPaid"
  | "waivedInterest"
  | "paymentDate"
  | "paymentType"
  | "balanceBefore"
  | "balanceAfter"
  | "remarks"
  | "processedBy"
  | "createdAt"
>;

// ---------------------------------------------------------------
// Dashboard analytics
// ---------------------------------------------------------------

export interface AdminDashboardStats {
  totalBorrowers: number;
  activeBorrowers: number;
  totalActiveLoans: number;
  totalOutstandingBalance: number;
  totalCollectedToday: number;
  totalCollectedThisMonth: number;
  overdueLoans: number;
  loansCompletedThisMonth: number;
  recentPayments: PaymentSummary[];
  overdueAccounts: LoanSummary[];
}

export interface BorrowerDashboardStats {
  activeLoans: LoanSummary[];
  completedLoans: LoanSummary[];
  totalOutstanding: number;
  nextPaymentDate: Date | null;
  nextPaymentAmount: number;
  recentPayments: PaymentSummary[];
}

// ---------------------------------------------------------------
// Form types (used in React Hook Form)
// ---------------------------------------------------------------

export interface CreateBorrowerForm {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  cellphone: string;
  sex: string;
  birthDate: string;
  purok?: string;
  street?: string;
  barangay: string;
  townCity: string;
  province: string;
  country: string;
}

export interface CreateLoanForm {
  borrowerId: string;
  principalAmount: number;
  interestRate: number;
  interestRateType: RateType;
  termId?: string;
  customTermDescription?: string;
  penaltyAmount: number;
  penaltyType?: PenaltyType;
  graceDays: number;
  startDate: string;
  notes?: string;
}

export interface RecordPaymentForm {
  loanId: string;
  borrowerId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  scheduleIds?: string[];
  waiverType?: WaiverType;
  waiverReason?: string;
  penaltyOverride?: number;
  allowOverpayment?: boolean;
  remarks?: string;
}
