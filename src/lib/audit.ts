/**
 * Audit Logger
 * Call this in every API route that mutates data.
 * Writes to the audit_logs table for full traceability.
 */
import "server-only";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

export interface AuditOptions {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  performedByRole: Role;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string;
  targetUserId?: string;
  loanId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(options: AuditOptions): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        entityType: options.entityType,
        entityId: options.entityId,
        action: options.action,
        performedBy: options.performedBy,
        performedByRole: options.performedByRole,
        oldValue: options.oldValue ?? undefined,
        newValue: options.newValue ?? undefined,
        reason: options.reason,
        targetUserId: options.targetUserId,
        loanId: options.loanId,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: options.metadata ?? undefined,
      },
    });
  } catch (error) {
    // Never let audit logging crash the main operation
    console.error("[AuditLog] Failed to write audit log:", error);
  }
}

// ----------------------------------------------------------------
// Convenience wrappers
// ----------------------------------------------------------------

export function auditBorrowerCreated(
  adminId: string,
  borrowerId: string,
  borrowerData: Record<string, unknown>,
  req?: { ip?: string; headers?: Headers }
) {
  return createAuditLog({
    entityType: "User",
    entityId: borrowerId,
    action: "CREATE",
    performedBy: adminId,
    performedByRole: "ADMIN",
    newValue: borrowerData,
    targetUserId: borrowerId,
    ipAddress: req?.ip,
  });
}

export function auditBorrowerUpdated(
  adminId: string,
  borrowerId: string,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>
) {
  return createAuditLog({
    entityType: "User",
    entityId: borrowerId,
    action: "UPDATE",
    performedBy: adminId,
    performedByRole: "ADMIN",
    oldValue,
    newValue,
    targetUserId: borrowerId,
  });
}

export function auditEmailChanged(
  adminId: string,
  borrowerId: string,
  oldEmail: string,
  newEmail: string
) {
  return createAuditLog({
    entityType: "User",
    entityId: borrowerId,
    action: "EMAIL_CHANGED",
    performedBy: adminId,
    performedByRole: "ADMIN",
    oldValue: { email: oldEmail },
    newValue: { email: newEmail },
    targetUserId: borrowerId,
  });
}

export function auditLoanCreated(
  adminId: string,
  loanId: string,
  loanData: Record<string, unknown>
) {
  return createAuditLog({
    entityType: "Loan",
    entityId: loanId,
    action: "CREATE",
    performedBy: adminId,
    performedByRole: "ADMIN",
    newValue: loanData,
    loanId,
  });
}

export function auditInterestWaived(
  adminId: string,
  loanId: string,
  waiverData: Record<string, unknown>
) {
  return createAuditLog({
    entityType: "Loan",
    entityId: loanId,
    action: "WAIVE_INTEREST",
    performedBy: adminId,
    performedByRole: "ADMIN",
    newValue: waiverData,
    loanId,
  });
}

export function auditPaymentRecorded(
  adminId: string,
  paymentId: string,
  loanId: string,
  paymentData: Record<string, unknown>
) {
  return createAuditLog({
    entityType: "Payment",
    entityId: paymentId,
    action: "RECORD_PAYMENT",
    performedBy: adminId,
    performedByRole: "ADMIN",
    newValue: paymentData,
    loanId,
  });
}

export function auditLogin(
  userId: string,
  role: Role,
  ipAddress?: string,
  userAgent?: string
) {
  return createAuditLog({
    entityType: "User",
    entityId: userId,
    action: "LOGIN",
    performedBy: userId,
    performedByRole: role,
    ipAddress,
    userAgent,
  });
}

export function auditPasswordChange(userId: string, role: Role) {
  return createAuditLog({
    entityType: "User",
    entityId: userId,
    action: "PASSWORD_CHANGED",
    performedBy: userId,
    performedByRole: role,
  });
}

export function auditBlacklist(
  adminId: string,
  borrowerId: string,
  reason: string,
  action: "BLACKLIST" | "UNBLACKLIST"
) {
  return createAuditLog({
    entityType: "User",
    entityId: borrowerId,
    action,
    performedBy: adminId,
    performedByRole: "ADMIN",
    newValue: { reason },
    targetUserId: borrowerId,
  });
}
