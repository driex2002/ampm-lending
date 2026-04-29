/**
 * DB migration: replace old loan terms with new frequency-based terms.
 * Run inside the container: node /app/migrate-terms.js
 */
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  // --- Delete old terms (soft-delete any that aren't in use, hard-delete the rest) ---
  const OLD_NAMES = [
    "7 Days (Daily)", "15 Days (Daily)", "30 Days (Daily)",
    "4 Weeks (Weekly)", "8 Weeks (Weekly)", "12 Weeks (Weekly)",
    "3 Months (Bi-weekly)", "6 Months (Bi-weekly)",
    "3 Months (Monthly)", "6 Months (Monthly)", "12 Months (Monthly)", "24 Months (Monthly)",
    "Custom Schedule",
    // Also match "× " style from any partial previous run
  ];

  // Find all existing terms
  const existing = await db.loanTerm.findMany();
  console.log(`Found ${existing.length} existing loan terms`);

  for (const term of existing) {
    // Check if any active loan uses this term
    const activeLoans = await db.loan.count({ where: { termId: term.id, status: "ACTIVE" } });
    if (activeLoans > 0) {
      console.log(`  Skipping "${term.name}" — ${activeLoans} active loans`);
      // Just mark inactive so it won't appear in UI
      await db.loanTerm.update({ where: { id: term.id }, data: { isActive: false } });
    } else {
      console.log(`  Deleting "${term.name}"`);
      await db.loanTerm.delete({ where: { id: term.id } });
    }
  }

  // --- Insert new terms ---
  const NEW_TERMS = [
    // Daily
    { name: "Daily × 7",   frequency: "DAILY",       totalPeriods: 7,  description: "7 daily payments (1 week)" },
    { name: "Daily × 15",  frequency: "DAILY",       totalPeriods: 15, description: "15 daily payments" },
    { name: "Daily × 30",  frequency: "DAILY",       totalPeriods: 30, description: "30 daily payments (1 month)" },
    // Weekly
    { name: "Weekly × 4",  frequency: "WEEKLY",      totalPeriods: 4,  description: "4 weekly payments (1 month)" },
    { name: "Weekly × 8",  frequency: "WEEKLY",      totalPeriods: 8,  description: "8 weekly payments (2 months)" },
    { name: "Weekly × 12", frequency: "WEEKLY",      totalPeriods: 12, description: "12 weekly payments (3 months)" },
    // Semi-Monthly
    { name: "Semi-Monthly × 6",  frequency: "SEMI_MONTHLY", totalPeriods: 6,  description: "6 semi-monthly payments (3 months)" },
    { name: "Semi-Monthly × 12", frequency: "SEMI_MONTHLY", totalPeriods: 12, description: "12 semi-monthly payments (6 months)" },
    { name: "Semi-Monthly × 24", frequency: "SEMI_MONTHLY", totalPeriods: 24, description: "24 semi-monthly payments (1 year)" },
    // Monthly
    { name: "Monthly × 3",  frequency: "MONTHLY",    totalPeriods: 3,  description: "3 monthly payments" },
    { name: "Monthly × 6",  frequency: "MONTHLY",    totalPeriods: 6,  description: "6 monthly payments (6 months)" },
    { name: "Monthly × 12", frequency: "MONTHLY",    totalPeriods: 12, description: "12 monthly payments (1 year)" },
    { name: "Monthly × 24", frequency: "MONTHLY",    totalPeriods: 24, description: "24 monthly payments (2 years)" },
    // Quarterly
    { name: "Quarterly × 4", frequency: "QUARTERLY", totalPeriods: 4,  description: "4 quarterly payments (1 year)" },
    { name: "Quarterly × 8", frequency: "QUARTERLY", totalPeriods: 8,  description: "8 quarterly payments (2 years)" },
    // Semi-Annual
    { name: "Semi-Annual × 2", frequency: "SEMI_ANNUAL", totalPeriods: 2, description: "2 semi-annual payments (1 year)" },
    { name: "Semi-Annual × 4", frequency: "SEMI_ANNUAL", totalPeriods: 4, description: "4 semi-annual payments (2 years)" },
    // Yearly
    { name: "Yearly × 1", frequency: "YEARLY",       totalPeriods: 1,  description: "1 yearly payment" },
    { name: "Yearly × 2", frequency: "YEARLY",       totalPeriods: 2,  description: "2 yearly payments" },
  ];

  let created = 0;
  for (const term of NEW_TERMS) {
    // Avoid duplicate inserts
    const exists = await db.loanTerm.findFirst({ where: { name: term.name } });
    if (exists) {
      console.log(`  Already exists: "${term.name}" — ensuring active`);
      await db.loanTerm.update({ where: { id: exists.id }, data: { isActive: true, ...term } });
    } else {
      await db.loanTerm.create({ data: { ...term, isActive: true } });
      console.log(`  Created: "${term.name}"`);
      created++;
    }
  }

  console.log(`\nDone. ${created} new terms created.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
