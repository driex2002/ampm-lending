/**
 * Email Templates
 * Pure HTML/inline-CSS templates compatible with all email clients.
 * Deliberately NOT using React Email JSX to avoid server rendering complexity.
 * These are production-grade, mobile-responsive HTML emails.
 */

const BRAND_COLOR = "#1d4ed8";
const BRAND_LIGHT = "#eff6ff";

function baseTemplate(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:1px;">
                💳 AMPM LENDING
              </h1>
              <p style="color:#bfdbfe;margin:4px 0 0;font-size:12px;">Loan Management System</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;">
                This is an automated email from AMPM Lending. Please do not reply to this email.<br />
                If you need assistance, contact your lending officer.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoRow(label: string, value: string, highlight = false): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#64748b;background:${highlight ? BRAND_LIGHT : "transparent"};border-radius:4px;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#1e293b;text-align:right;background:${highlight ? BRAND_LIGHT : "transparent"};">${value}</td>
  </tr>`;
}

// ---------------------------------------------------------------
// Template: Welcome / Account Created
// ---------------------------------------------------------------

export function welcomeEmailTemplate(params: {
  firstName: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="color:#1e293b;margin:0 0 8px;">Welcome to AMPM Lending!</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hello <strong>${params.firstName}</strong>, your borrower account has been created.
      Use the credentials below to log in for the first time.
    </p>

    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Your Login Credentials</p>
      <p style="margin:0 0 4px;font-size:15px;"><strong>Email:</strong> ${params.email}</p>
      <p style="margin:0;font-size:15px;"><strong>Temporary Password:</strong> <code style="background:#1d4ed8;color:#fff;padding:2px 8px;border-radius:4px;font-family:monospace;">${params.tempPassword}</code></p>
    </div>

    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        ⚠️ <strong>Important:</strong> You must change your password upon first login. 
        This temporary password expires in 48 hours.
      </p>
    </div>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${params.loginUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;">
        Login to Your Account →
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
      Keep your credentials confidential. AMPM Lending will never ask for your password.
    </p>
  `;

  return {
    subject: "Welcome to AMPM Lending – Your Account is Ready",
    html: baseTemplate(content, "Welcome to AMPM Lending"),
  };
}

// ---------------------------------------------------------------
// Template: Payment Confirmation
// ---------------------------------------------------------------

export function paymentConfirmationTemplate(params: {
  firstName: string;
  loanNumber: string;
  referenceNumber: string;
  paymentAmount: number;
  paymentDate: string;
  paymentType: string;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  waivedInterest: number;
  remainingBalance: number;
  nextDueDate?: string;
  nextDueAmount?: number;
  remarks?: string;
  currency?: string;
}): { subject: string; html: string } {
  const c = params.currency ?? "₱";
  const fmt = (n: number) => `${c}${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:56px;height:56px;line-height:56px;font-size:28px;text-align:center;">✅</div>
      <h2 style="color:#15803d;margin:8px 0 0;">Payment Confirmed</h2>
      <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Reference: <strong>${params.referenceNumber}</strong></p>
    </div>

    <p style="color:#475569;font-size:14px;margin:0 0 20px;">
      Dear <strong>${params.firstName}</strong>, your payment has been successfully recorded.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:${BRAND_COLOR};">
          <th colspan="2" style="color:#fff;padding:10px 12px;font-size:13px;text-align:left;">Payment Details</th>
        </tr>
      </thead>
      <tbody>
        ${infoRow("Loan Number", params.loanNumber)}
        ${infoRow("Payment Date", params.paymentDate)}
        ${infoRow("Payment Method", params.paymentType)}
        ${infoRow("Total Payment", fmt(params.paymentAmount), true)}
        ${infoRow("Principal Paid", fmt(params.principalPaid))}
        ${infoRow("Interest Paid", fmt(params.interestPaid))}
        ${params.penaltyPaid > 0 ? infoRow("Penalty Paid", fmt(params.penaltyPaid)) : ""}
        ${params.waivedInterest > 0 ? infoRow("Interest Waived", fmt(params.waivedInterest)) : ""}
        ${infoRow("Remaining Balance", fmt(params.remainingBalance), true)}
        ${params.nextDueDate ? infoRow("Next Due Date", params.nextDueDate) : ""}
        ${params.nextDueAmount ? infoRow("Next Due Amount", fmt(params.nextDueAmount)) : ""}
      </tbody>
    </table>

    ${params.remarks ? `<div style="background:#f8fafc;border-radius:4px;padding:12px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#64748b;"><strong>Admin Remarks:</strong> ${params.remarks}</p>
    </div>` : ""}

    ${params.remainingBalance === 0 ? `
    <div style="background:#dcfce7;border-left:4px solid #16a34a;border-radius:4px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">
        🎉 Congratulations! Your loan has been fully paid!
      </p>
    </div>` : ""}

    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:16px 0 0;">
      Please keep this email as your official payment record.
    </p>
  `;

  return {
    subject: `Payment Confirmed – ${params.referenceNumber} | AMPM Lending`,
    html: baseTemplate(content, "Payment Confirmation"),
  };
}

// ---------------------------------------------------------------
// Template: Payment Reminder
// ---------------------------------------------------------------

export function paymentReminderTemplate(params: {
  firstName: string;
  loanNumber: string;
  dueDate: string;
  dueAmount: number;
  daysUntilDue: number;
  remainingBalance: number;
  currency?: string;
}): { subject: string; html: string } {
  const c = params.currency ?? "₱";
  const fmt = (n: number) => `${c}${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;">🔔</div>
      <h2 style="color:#1e293b;margin:8px 0 0;">Payment Reminder</h2>
    </div>

    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Dear <strong>${params.firstName}</strong>, this is a friendly reminder that your loan payment is due 
      in <strong>${params.daysUntilDue} day(s)</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tbody>
        ${infoRow("Loan Number", params.loanNumber)}
        ${infoRow("Due Date", params.dueDate, true)}
        ${infoRow("Amount Due", fmt(params.dueAmount), true)}
        ${infoRow("Outstanding Balance", fmt(params.remainingBalance))}
      </tbody>
    </table>

    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        💡 Please ensure payment is made on or before the due date to avoid penalties.
      </p>
    </div>
  `;

  return {
    subject: `Payment Due in ${params.daysUntilDue} Day(s) – ${params.loanNumber} | AMPM Lending`,
    html: baseTemplate(content, "Payment Reminder"),
  };
}

// ---------------------------------------------------------------
// Template: Overdue Alert
// ---------------------------------------------------------------

export function overdueAlertTemplate(params: {
  firstName: string;
  loanNumber: string;
  dueDate: string;
  dueAmount: number;
  daysOverdue: number;
  penalty: number;
  remainingBalance: number;
  currency?: string;
}): { subject: string; html: string } {
  const c = params.currency ?? "₱";
  const fmt = (n: number) => `${c}${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const content = `
    <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;">⚠️</div>
      <h2 style="color:#dc2626;margin:8px 0 0;">Payment Overdue</h2>
      <p style="color:#b91c1c;margin:4px 0 0;font-size:13px;">${params.daysOverdue} day(s) overdue</p>
    </div>

    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Dear <strong>${params.firstName}</strong>, your loan payment was due on <strong>${params.dueDate}</strong> 
      and has not been received. Please settle your account as soon as possible.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <tbody>
        ${infoRow("Loan Number", params.loanNumber)}
        ${infoRow("Original Due Date", params.dueDate)}
        ${infoRow("Days Overdue", `${params.daysOverdue} days`)}
        ${infoRow("Amount Due", fmt(params.dueAmount), true)}
        ${params.penalty > 0 ? infoRow("Penalty Applied", fmt(params.penalty)) : ""}
        ${infoRow("Outstanding Balance", fmt(params.remainingBalance), true)}
      </tbody>
    </table>

    <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;padding:16px;">
      <p style="margin:0;font-size:13px;color:#991b1b;">
        ⚠️ Continued non-payment may result in additional penalties and may affect your credit standing with AMPM Lending.
        Please contact us immediately to arrange payment.
      </p>
    </div>
  `;

  return {
    subject: `URGENT: Payment Overdue – ${params.loanNumber} | AMPM Lending`,
    html: baseTemplate(content, "Overdue Payment Alert"),
  };
}

// ---------------------------------------------------------------
// Template: Password Reset
// ---------------------------------------------------------------

export function passwordResetTemplate(params: {
  firstName: string;
  newTempPassword: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const content = `
    <h2 style="color:#1e293b;margin:0 0 8px;">Password Reset</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Hello <strong>${params.firstName}</strong>, your password has been reset by the administrator.
      Use the temporary password below to log in.
    </p>

    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_COLOR};border-radius:4px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Temporary Password</p>
      <p style="margin:0;font-size:18px;"><code style="background:#1d4ed8;color:#fff;padding:4px 12px;border-radius:4px;font-family:monospace;font-size:16px;">${params.newTempPassword}</code></p>
    </div>

    <div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#92400e;">
        You must change this password upon your next login. This temporary password expires in 48 hours.
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${params.loginUrl}" style="display:inline-block;background-color:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:15px;font-weight:600;">
        Login Now →
      </a>
    </div>

    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:16px 0 0;">
      Or copy this link into your browser:<br/>
      <a href="${params.loginUrl}" style="color:#3b82f6;word-break:break-all;">${params.loginUrl}</a>
    </p>
  `;

  return {
    subject: "AMPM Lending – Your Password Has Been Reset",
    html: baseTemplate(content, "Password Reset"),
  };
}

// ---------------------------------------------------------------
// Template: Loan Created
// ---------------------------------------------------------------

export function loanCreatedTemplate(params: {
  firstName: string;
  loanNumber: string;
  principalAmount: number;
  totalAmount: number;
  interestRate: number;
  termName: string;
  startDate: string;
  firstDueDate: string;
  firstDueAmount: number;
  currency?: string;
}): { subject: string; html: string } {
  const c = params.currency ?? "₱";
  const fmt = (n: number) => `${c}${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const content = `
    <h2 style="color:#1e293b;margin:0 0 8px;">Loan Created</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Dear <strong>${params.firstName}</strong>, a new loan has been created for your account.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:${BRAND_COLOR};">
          <th colspan="2" style="color:#fff;padding:10px 12px;font-size:13px;text-align:left;">Loan Details</th>
        </tr>
      </thead>
      <tbody>
        ${infoRow("Loan Number", params.loanNumber, true)}
        ${infoRow("Principal Amount", fmt(params.principalAmount))}
        ${infoRow("Total Payable", fmt(params.totalAmount))}
        ${infoRow("Interest Rate", `${params.interestRate}%`)}
        ${infoRow("Payment Term", params.termName)}
        ${infoRow("Start Date", params.startDate)}
        ${infoRow("First Due Date", params.firstDueDate, true)}
        ${infoRow("First Payment Due", fmt(params.firstDueAmount))}
      </tbody>
    </table>

    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">
      Please keep track of your payment schedule to avoid penalties. Contact your lending officer for any questions.
    </p>
  `;

  return {
    subject: `New Loan Created – ${params.loanNumber} | AMPM Lending`,
    html: baseTemplate(content, "Loan Created"),
  };
}

// ---------------------------------------------------------------
// Template: Loan Completed (Fully Paid)
// ---------------------------------------------------------------

export function loanCompletedTemplate(params: {
  firstName: string;
  loanNumber: string;
  principalAmount: number;
  totalPaid: number;
  completedAt: string;
  currency?: string;
}): { subject: string; html: string } {
  const c = params.currency ?? "₱";
  const fmt = (n: number) =>
    `${c}${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const content = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:36px;text-align:center;">🎉</div>
      <h2 style="color:#15803d;margin:12px 0 4px;font-size:22px;">Loan Fully Paid!</h2>
      <p style="color:#64748b;font-size:13px;margin:0;">Congratulations, you are debt-free with AMPM Lending.</p>
    </div>

    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Dear <strong>${params.firstName}</strong>, we are pleased to confirm that your loan
      <strong>${params.loanNumber}</strong> has been <strong>fully settled</strong> as of
      <strong>${params.completedAt}</strong>. Thank you for your commitment!
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bbf7d0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <thead>
        <tr style="background:#16a34a;">
          <th colspan="2" style="color:#fff;padding:10px 12px;font-size:13px;text-align:left;">Loan Summary</th>
        </tr>
      </thead>
      <tbody>
        ${infoRow("Loan Number", params.loanNumber, true)}
        ${infoRow("Original Principal", fmt(params.principalAmount))}
        ${infoRow("Total Amount Paid", fmt(params.totalPaid), true)}
        ${infoRow("Completed On", params.completedAt)}
        ${infoRow("Outstanding Balance", fmt(0), true)}
      </tbody>
    </table>

    <div style="background:#dcfce7;border-left:4px solid #16a34a;border-radius:4px;padding:16px;margin-bottom:16px;text-align:center;">
      <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">
        Your loan account is now closed. No further payments are required.
      </p>
    </div>

    <p style="color:#94a3b8;font-size:12px;text-align:center;margin:16px 0 0;">
      Please keep this email as your official loan completion record.<br/>
      Thank you for choosing AMPM Lending!
    </p>
  `;

  return {
    subject: `🎉 Loan Fully Paid – ${params.loanNumber} | AMPM Lending`,
    html: baseTemplate(content, "Loan Fully Paid"),
  };
}
