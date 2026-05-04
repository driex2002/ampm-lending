// AMPM Lending — Database Seed (compiled CommonJS, no tsx required)
// Run via: node prisma/seed.js  OR  prisma db seed
"use strict";

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { randomBytes } = require("crypto");

const prisma = new PrismaClient();

const SUPER_ADMIN_EMAIL = (
  process.env.SUPER_ADMIN_EMAIL ?? "driex2002@gmail.com"
).toLowerCase();

async function main() {
  console.log("🌱 Seeding AMPM Lending database...\n");

  // Super admin — created only on first seed; random one-time password
  const existing = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
  if (!existing) {
    const tempPassword = randomBytes(12).toString("base64url").slice(0, 16);
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await prisma.user.create({
      data: {
        email: SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        role: "ADMIN",
        firstName: "Super",
        lastName: "Admin",
        cellphone: "N/A",
        sex: "Other",
        birthDate: new Date("1990-01-01"),
        barangay: "N/A",
        townCity: "N/A",
        province: "N/A",
        country: "Philippines",
        mustChangePassword: true,
        isActive: true,
      },
    });
    console.log(`✅ Super admin created: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   One-time password : ${tempPassword}`);
    console.log(`   Change this after first login!\n`);
  } else {
    console.log(`ℹ️  Super admin already exists: ${SUPER_ADMIN_EMAIL}\n`);
  }

  // Default loan terms
  const loanTerms = [
    { name: "Daily \u00d7 7",          frequency: "DAILY",        totalPeriods: 7,  description: "7 daily payments (1 week)" },
    { name: "Daily \u00d7 15",         frequency: "DAILY",        totalPeriods: 15, description: "15 daily payments (2 weeks)" },
    { name: "Daily \u00d7 30",         frequency: "DAILY",        totalPeriods: 30, description: "30 daily payments (1 month)" },
    { name: "Weekly \u00d7 4",         frequency: "WEEKLY",       totalPeriods: 4,  description: "4 weekly payments (1 month)" },
    { name: "Weekly \u00d7 8",         frequency: "WEEKLY",       totalPeriods: 8,  description: "8 weekly payments (2 months)" },
    { name: "Weekly \u00d7 12",        frequency: "WEEKLY",       totalPeriods: 12, description: "12 weekly payments (3 months)" },
    { name: "Semi-Monthly \u00d7 6",   frequency: "SEMI_MONTHLY", totalPeriods: 6,  description: "6 semi-monthly payments (3 months)" },
    { name: "Semi-Monthly \u00d7 12",  frequency: "SEMI_MONTHLY", totalPeriods: 12, description: "12 semi-monthly payments (6 months)" },
    { name: "Semi-Monthly \u00d7 24",  frequency: "SEMI_MONTHLY", totalPeriods: 24, description: "24 semi-monthly payments (1 year)" },
    { name: "Monthly \u00d7 3",        frequency: "MONTHLY",      totalPeriods: 3,  description: "3 monthly payments" },
    { name: "Monthly \u00d7 6",        frequency: "MONTHLY",      totalPeriods: 6,  description: "6 monthly payments" },
    { name: "Monthly \u00d7 12",       frequency: "MONTHLY",      totalPeriods: 12, description: "12 monthly payments (1 year)" },
    { name: "Monthly \u00d7 24",       frequency: "MONTHLY",      totalPeriods: 24, description: "24 monthly payments (2 years)" },
    { name: "Quarterly \u00d7 4",      frequency: "QUARTERLY",    totalPeriods: 4,  description: "4 quarterly payments (1 year)" },
    { name: "Quarterly \u00d7 8",      frequency: "QUARTERLY",    totalPeriods: 8,  description: "8 quarterly payments (2 years)" },
    { name: "Semi-Annual \u00d7 2",    frequency: "SEMI_ANNUAL",  totalPeriods: 2,  description: "2 semi-annual payments (1 year)" },
    { name: "Semi-Annual \u00d7 4",    frequency: "SEMI_ANNUAL",  totalPeriods: 4,  description: "4 semi-annual payments (2 years)" },
    { name: "Yearly \u00d7 1",         frequency: "YEARLY",       totalPeriods: 1,  description: "1 yearly payment" },
    { name: "Yearly \u00d7 2",         frequency: "YEARLY",       totalPeriods: 2,  description: "2 yearly payments" },
  ];
  for (const term of loanTerms) {
    await prisma.loanTerm.upsert({ where: { name: term.name }, update: {}, create: term });
  }
  console.log(`✅ ${loanTerms.length} loan terms created`);

  // Default interest configurations
  const interestConfigs = [
    { name: "5% Monthly (Flat)",       rate: 5.0,  rateType: "PERCENTAGE_PER_PERIOD", description: "5% of principal per month" },
    { name: "10% Monthly (Flat)",      rate: 10.0, rateType: "PERCENTAGE_PER_PERIOD", description: "10% of principal per month" },
    { name: "3% Monthly (Diminishing)",rate: 3.0,  rateType: "DIMINISHING",           description: "3% on remaining balance per month" },
    { name: "20% Total (Flat Rate)",   rate: 20.0, rateType: "FLAT_RATE",             description: "20% of principal as total fixed interest" },
    { name: "Zero Interest",           rate: 0.0,  rateType: "FLAT_RATE",             description: "No interest (humanitarian / special case)" },
  ];
  for (const config of interestConfigs) {
    await prisma.interestConfig.upsert({ where: { name: config.name }, update: {}, create: config });
  }
  console.log(`✅ ${interestConfigs.length} interest configurations created`);

  // Default penalty configurations
  const penaltyConfigs = [
    { name: "\u20b1200 Flat Penalty", amount: 200.0, penaltyType: "FLAT",                    graceDays: 3, description: "\u20b1200 fixed penalty per late payment after 3 grace days" },
    { name: "\u20b1500 Flat Penalty", amount: 500.0, penaltyType: "FLAT",                    graceDays: 0, description: "\u20b1500 fixed penalty per late payment, no grace period" },
    { name: "5% of Principal",        amount: 5.0,   penaltyType: "PERCENTAGE_OF_PRINCIPAL", graceDays: 5, description: "5% of original principal as penalty after 5 grace days" },
    { name: "No Penalty",             amount: 0.0,   penaltyType: "FLAT",                    graceDays: 0, description: "No penalty applied" },
  ];
  for (const config of penaltyConfigs) {
    await prisma.penaltyConfig.upsert({ where: { name: config.name }, update: {}, create: config });
  }
  console.log(`✅ ${penaltyConfigs.length} penalty configurations created`);

  // System settings
  const settings = [
    { key: "app_name",              value: "AMPM Lending",  description: "Application name shown in the sidebar and browser tab", category: "branding" },
    { key: "app_icon",              value: "",              description: "Application icon (base64 data URL). Leave empty for default.", category: "branding" },
    { key: "app_favicon",           value: "",              description: "Browser tab favicon (base64 data URL). Leave empty for default.", category: "branding" },
    { key: "login_bg",              value: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2560&auto=format&fit=crop", description: "Login page background image URL or base64 data URL.", category: "branding" },
    { key: "login_bg_opacity",      value: "0.25",          description: "Login background image opacity (0.05-0.95).", category: "branding" },
    { key: "dashboard_bg",          value: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=2560&auto=format&fit=crop", description: "Dashboard background image URL or base64.", category: "branding" },
    { key: "dashboard_bg_opacity",  value: "0.08",          description: "Dashboard background image opacity (0.02-0.50).", category: "branding" },
    { key: "business_name",         value: "AMPM Lending",  description: "Business display name", category: "general" },
    { key: "business_address",      value: "Philippines",   description: "Business address", category: "general" },
    { key: "business_contact",      value: "",              description: "Business contact number", category: "general" },
    { key: "currency_symbol",       value: "\u20b1",        description: "Currency symbol used in the system", category: "finance" },
    { key: "currency_code",         value: "PHP",           description: "ISO currency code", category: "finance" },
    { key: "loan_number_prefix",    value: "AMPM",          description: "Prefix for loan reference numbers", category: "finance" },
    { key: "payment_ref_prefix",    value: "PAY",           description: "Prefix for payment reference numbers", category: "finance" },
    { key: "overdue_check_enabled", value: "true",          description: "Whether to automatically mark loans as overdue", category: "automation" },
    { key: "reminder_days_before",  value: "3",             description: "Days before due date to send payment reminder", category: "notifications" },
    { key: "max_login_attempts",    value: "5",             description: "Maximum failed login attempts before account lockout", category: "security" },
  ];
  for (const setting of settings) {
    await prisma.systemSetting.upsert({ where: { key: setting.key }, update: {}, create: setting });
  }
  console.log(`✅ ${settings.length} system settings initialized`);

  console.log("\n✅ Database seeding complete!");
  console.log(`\n📋 Login: ${SUPER_ADMIN_EMAIL}`);
  console.log("   Password shown above (one-time, change after first login)\n");
}

main()
  .catch((e) => { console.error("❌ Seeding failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
