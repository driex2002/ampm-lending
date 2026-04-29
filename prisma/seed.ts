/**
 * AMPM Lending — Database Seed
 * Creates the initial admin account and default system settings
 * Run with: npm run db:seed
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AMPM Lending database...\n");

  // -----------------------------------------------------------
  // 1. ADMIN ACCOUNT
  // -----------------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL ?? "driex2002@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "pass1234";
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      firstName: "System",
      middleName: null,
      lastName: "Administrator",
      cellphone: "09000000000",
      sex: "Other",
      birthDate: new Date("1990-01-01"),
      barangay: "N/A",
      townCity: "N/A",
      province: "N/A",
      country: "Philippines",
      mustChangePassword: false,
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // -----------------------------------------------------------
  // 2. DEFAULT LOAN TERMS
  // -----------------------------------------------------------
  const loanTerms = [
    // ── Daily ───────────────────────────────────────────────
    { name: "Daily × 7",  frequency: "DAILY" as const, totalPeriods: 7,  description: "7 daily payments (1 week)" },
    { name: "Daily × 15", frequency: "DAILY" as const, totalPeriods: 15, description: "15 daily payments (2 weeks)" },
    { name: "Daily × 30", frequency: "DAILY" as const, totalPeriods: 30, description: "30 daily payments (1 month)" },
    // ── Weekly ──────────────────────────────────────────────
    { name: "Weekly × 4",  frequency: "WEEKLY" as const, totalPeriods: 4,  description: "4 weekly payments (1 month)" },
    { name: "Weekly × 8",  frequency: "WEEKLY" as const, totalPeriods: 8,  description: "8 weekly payments (2 months)" },
    { name: "Weekly × 12", frequency: "WEEKLY" as const, totalPeriods: 12, description: "12 weekly payments (3 months)" },
    // ── Semi-Monthly ────────────────────────────────────────
    { name: "Semi-Monthly × 6",  frequency: "SEMI_MONTHLY" as const, totalPeriods: 6,  description: "6 semi-monthly payments (3 months)" },
    { name: "Semi-Monthly × 12", frequency: "SEMI_MONTHLY" as const, totalPeriods: 12, description: "12 semi-monthly payments (6 months)" },
    { name: "Semi-Monthly × 24", frequency: "SEMI_MONTHLY" as const, totalPeriods: 24, description: "24 semi-monthly payments (1 year)" },
    // ── Monthly ─────────────────────────────────────────────
    { name: "Monthly × 3",  frequency: "MONTHLY" as const, totalPeriods: 3,  description: "3 monthly payments" },
    { name: "Monthly × 6",  frequency: "MONTHLY" as const, totalPeriods: 6,  description: "6 monthly payments" },
    { name: "Monthly × 12", frequency: "MONTHLY" as const, totalPeriods: 12, description: "12 monthly payments (1 year)" },
    { name: "Monthly × 24", frequency: "MONTHLY" as const, totalPeriods: 24, description: "24 monthly payments (2 years)" },
    // ── Quarterly ───────────────────────────────────────────
    { name: "Quarterly × 4", frequency: "QUARTERLY" as const, totalPeriods: 4, description: "4 quarterly payments (1 year)" },
    { name: "Quarterly × 8", frequency: "QUARTERLY" as const, totalPeriods: 8, description: "8 quarterly payments (2 years)" },
    // ── Semi-Annual ─────────────────────────────────────────
    { name: "Semi-Annual × 2", frequency: "SEMI_ANNUAL" as const, totalPeriods: 2, description: "2 semi-annual payments (1 year)" },
    { name: "Semi-Annual × 4", frequency: "SEMI_ANNUAL" as const, totalPeriods: 4, description: "4 semi-annual payments (2 years)" },
    // ── Yearly ──────────────────────────────────────────────
    { name: "Yearly × 1", frequency: "YEARLY" as const, totalPeriods: 1, description: "1 yearly payment" },
    { name: "Yearly × 2", frequency: "YEARLY" as const, totalPeriods: 2, description: "2 yearly payments" },
  ];

  for (const term of loanTerms) {
    await prisma.loanTerm.upsert({
      where: { name: term.name },
      update: {},
      create: term,
    });
  }
  console.log(`✅ ${loanTerms.length} loan terms created`);

  // -----------------------------------------------------------
  // 3. DEFAULT INTEREST CONFIGURATIONS
  // -----------------------------------------------------------
  const interestConfigs = [
    {
      name: "5% Monthly (Flat)",
      rate: 5.0,
      rateType: "PERCENTAGE_PER_PERIOD" as const,
      description: "5% of principal per month",
    },
    {
      name: "10% Monthly (Flat)",
      rate: 10.0,
      rateType: "PERCENTAGE_PER_PERIOD" as const,
      description: "10% of principal per month",
    },
    {
      name: "3% Monthly (Diminishing)",
      rate: 3.0,
      rateType: "DIMINISHING" as const,
      description: "3% on remaining balance per month",
    },
    {
      name: "20% Total (Flat Rate)",
      rate: 20.0,
      rateType: "FLAT_RATE" as const,
      description: "20% of principal as total fixed interest",
    },
    {
      name: "Zero Interest",
      rate: 0.0,
      rateType: "FLAT_RATE" as const,
      description: "No interest (humanitarian / special case)",
    },
  ];

  for (const config of interestConfigs) {
    await prisma.interestConfig.upsert({
      where: { name: config.name },
      update: {},
      create: config,
    });
  }
  console.log(`✅ ${interestConfigs.length} interest configurations created`);

  // -----------------------------------------------------------
  // 4. DEFAULT PENALTY CONFIGURATIONS
  // -----------------------------------------------------------
  const penaltyConfigs = [
    {
      name: "₱200 Flat Penalty",
      amount: 200.0,
      penaltyType: "FLAT" as const,
      graceDays: 3,
      description: "₱200 fixed penalty per late payment after 3 grace days",
    },
    {
      name: "₱500 Flat Penalty",
      amount: 500.0,
      penaltyType: "FLAT" as const,
      graceDays: 0,
      description: "₱500 fixed penalty per late payment, no grace period",
    },
    {
      name: "5% of Principal",
      amount: 5.0,
      penaltyType: "PERCENTAGE_OF_PRINCIPAL" as const,
      graceDays: 5,
      description: "5% of original principal as penalty after 5 grace days",
    },
    {
      name: "No Penalty",
      amount: 0.0,
      penaltyType: "FLAT" as const,
      graceDays: 0,
      description: "No penalty applied",
    },
  ];

  for (const config of penaltyConfigs) {
    await prisma.penaltyConfig.upsert({
      where: { name: config.name },
      update: {},
      create: config,
    });
  }
  console.log(`✅ ${penaltyConfigs.length} penalty configurations created`);

  // -----------------------------------------------------------
  // 5. SYSTEM SETTINGS
  // -----------------------------------------------------------
  const settings = [
    {
      key: "business_name",
      value: "AMPM Lending",
      description: "Business display name",
      category: "general",
    },
    {
      key: "business_address",
      value: "Philippines",
      description: "Business address",
      category: "general",
    },
    {
      key: "business_contact",
      value: "",
      description: "Business contact number",
      category: "general",
    },
    {
      key: "currency_symbol",
      value: "₱",
      description: "Currency symbol used in the system",
      category: "finance",
    },
    {
      key: "currency_code",
      value: "PHP",
      description: "ISO currency code",
      category: "finance",
    },
    {
      key: "loan_number_prefix",
      value: "AMPM",
      description: "Prefix for loan reference numbers",
      category: "finance",
    },
    {
      key: "payment_ref_prefix",
      value: "PAY",
      description: "Prefix for payment reference numbers",
      category: "finance",
    },
    {
      key: "overdue_check_enabled",
      value: "true",
      description: "Whether to automatically mark loans as overdue",
      category: "automation",
    },
    {
      key: "reminder_days_before",
      value: "3",
      description: "Days before due date to send payment reminder",
      category: "notifications",
    },
    {
      key: "max_login_attempts",
      value: "5",
      description: "Maximum failed login attempts before account lockout",
      category: "security",
    },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ ${settings.length} system settings initialized`);

  console.log("\n✅ Database seeding complete!");
  console.log(`\n📋 Admin Login:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log(`\n⚠️  IMPORTANT: Change the admin password after first login!\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
