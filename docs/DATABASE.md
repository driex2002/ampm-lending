# Database Guide

## Schema Overview

The AMPM Lending database uses **PostgreSQL** managed via **Prisma ORM**.

### Entity Relationship Summary

```
User (admin/borrower)
  └─ Loan (many per borrower)
       ├─ LoanTerm (one per loan — payment frequency, periods)
       ├─ PaymentSchedule (one row per installment period)
       └─ Payment (actual received payments)

SystemSetting (key-value config — branding, appearance, business rules)
AuditLog (immutable event log)
```

---

## Key Models

### `User`
Represents both **admins** and **borrowers**. Role is stored in `role: UserRole` (ADMIN | BORROWER).

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| email | String (unique) | Login identifier |
| firstName / middleName / lastName | String | Full name parts |
| nickname | String? | Optional display name; shown in greetings if set |
| role | UserRole | ADMIN or BORROWER |
| isActive | Boolean | Soft-disable account |
| isBlacklisted | Boolean | Blacklist flag |
| failedLoginAttempts | Int | Lockout counter |
| lockedUntil | DateTime? | Lockout expiry |
| passwordChangedAt | DateTime? | Force re-auth tracking |
| mustChangePassword | Boolean | Forces password change on next login |
| avatarUrl | String? | Base64 or URL of profile avatar |

### `Loan`
Core lending record.

| Field | Type | Notes |
|---|---|---|
| loanNumber | String (unique) | Auto-generated (AMPM-YYYY-NNNNN) |
| principalAmount | Decimal | Original loan amount |
| interestRate | Decimal | Rate value |
| interestRateType | InterestRateType | PERCENTAGE_PER_PERIOD, FLAT_RATE, DIMINISHING |
| penaltyAmount | Decimal | Penalty charged on overdue |
| penaltyType | PenaltyType? | FIXED or PERCENTAGE |
| graceDays | Int | Days before penalty kicks in |
| status | LoanStatus | PENDING, ACTIVE, COMPLETED, DEFAULTED, WRITTEN_OFF |
| isOverdue | Boolean | Updated by scheduler |
| outstandingBalance | Decimal | Running balance |
| startDate / endDate | DateTime | Loan term dates |

### `LoanTerm`
Defines the repayment schedule template.

| Field | Type | Notes |
|---|---|---|
| frequency | PaymentFrequency | DAILY, WEEKLY, BIWEEKLY, MONTHLY, CUSTOM |
| totalPeriods | Int | Number of installments |
| intervalDays | Int? | Used for CUSTOM frequency |

### `PaymentSchedule`
One row per installment period — the amortization table.

| Field | Type | Notes |
|---|---|---|
| periodNumber | Int | 1-based installment index |
| dueDate | DateTime | When this installment is due |
| principalDue | Decimal | Principal portion |
| interestDue | Decimal | Interest portion |
| totalDue | Decimal | Total expected payment |
| paidAmount | Decimal | Amount actually paid so far |
| status | ScheduleStatus | PENDING, PARTIAL, PAID, OVERDUE, WAIVED |
| penaltyDue | Decimal | Penalty accrued |
| isInterestWaived | Boolean | Whether interest was waived |
| waivedAmount | Decimal | Amount waived |
| paidAt | DateTime? | When fully paid |

### `Payment`
An actual payment received from a borrower.

| Field | Type | Notes |
|---|---|---|
| referenceNumber | String (unique) | Auto-generated (PAY-YYYYMMDD-NNNNN) |
| amount | Decimal | Amount received |
| paymentType | PaymentType | CASH, BANK_TRANSFER, GCASH, MAYA, CUSTOM |
| waivedInterest | Decimal | Interest waived on this payment |
| remarks | String? | Free-text notes |
| processedBy | String | Admin user ID who recorded it |

### `SystemSetting`
Key-value store for all application configuration. Managed via **Admin → Settings**.

| Field | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| key | String (unique) | Setting identifier |
| value | String | Setting value (always string — cast as needed) |
| description | String? | Human-readable description |
| category | String | Grouping: `branding`, `general`, `security`, `business` |
| updatedBy | String? | Admin user ID of last editor |

#### Full list of system setting keys

**Branding (`category = "branding"`)**

| Key | Default | Description |
|---|---|---|
| `app_name` | `AMPM Lending` | Application name shown in sidebar, login page, and browser title |
| `app_icon` | _(empty)_ | App icon shown in sidebar header — base64 or URL |
| `app_favicon` | _(empty)_ | Browser tab favicon — base64 or URL |
| `login_bg` | Unsplash financial district photo | Login page background image — base64 or URL |
| `login_bg_opacity` | `0.25` | Opacity of login background overlay (0.05–0.95) |
| `dashboard_bg` | Unsplash business desk photo | Background image for all admin/borrower internal pages — base64 or URL |
| `dashboard_bg_opacity` | `0.08` | Opacity of dashboard background overlay (0.02–0.50) |

**Business (`category = "business"`)**

| Key | Default | Description |
|---|---|---|
| `business_name` | `AMPM Lending` | Business display name (used in emails/PDFs) |
| `business_address` | `Philippines` | Business address |
| `business_contact` | _(empty)_ | Contact number |
| `business_email` | _(empty)_ | Contact email |
| `default_penalty_rate` | `0` | Default penalty % applied when creating loans |
| `default_grace_period_days` | `0` | Default grace days before penalty applies |
| `currency_symbol` | `₱` | Currency symbol used in UI |
| `timezone` | `Asia/Manila` | Server timezone for scheduling |

**Security (`category = "security"`)**

| Key | Default | Description |
|---|---|---|
| `max_login_attempts` | `5` | Failed attempts before lockout |
| `login_lockout_minutes` | `15` | Lockout duration in minutes |

---

## Migrations

### Development

```bash
# Create and apply a migration
npx prisma migrate dev --name <migration_name>

# Reset database (drops all data and re-runs migrations)
npx prisma migrate reset
```

### Production

```bash
# Apply pending migrations only (no data loss)
npx prisma migrate deploy
```

### View migration history

```bash
npx prisma migrate status
```

---

## Seeding

The seed file (`prisma/seed.ts`) creates:

1. **Admin user** — `admin@ampmlending.com` / `Admin@AMPM2024!`
2. **Demo borrower** — `juan.delacruz@example.com` / `Borrower@AMPM2024!`
3. **Loan terms** — Weekly (12 weeks), Monthly (12 months), Monthly (24 months), Monthly (36 months)
4. **System settings** — Full set of defaults including branding (app name, login BG, dashboard BG) and business/security parameters

> The seed uses `upsert` with `update: {}` for system settings — re-seeding will **not** overwrite values you have already customized through the Settings UI.

```bash
npx prisma db seed
```

---

## Updating system_settings category (manual fix)

If the `app_name` key has `category = 'general'` instead of `'branding'` (pre-existing installs), run:

```sql
UPDATE system_settings
SET category = 'branding'
WHERE key IN ('app_name', 'app_icon', 'app_favicon', 'login_bg', 'login_bg_opacity', 'dashboard_bg', 'dashboard_bg_opacity');
```

In Docker:
```bash
docker exec -i ampm-postgres psql -U ampm -d ampm_lending -c \
  "UPDATE system_settings SET category = 'branding' WHERE key IN ('app_name','app_icon','app_favicon','login_bg','login_bg_opacity','dashboard_bg','dashboard_bg_opacity');"
```

---

## Backups

### Manual (pg_dump)

```bash
pg_dump -U ampm -d ampm_lending -F c -f backup_$(date +%Y%m%d).dump
```

### Restore

```bash
pg_restore -U ampm -d ampm_lending backup_YYYYMMDD.dump
```

### Docker volume backup

```bash
docker run --rm \
  -v ampm-lending_postgres_data:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /source .
```

---

## Prisma Studio (GUI)

Launch an interactive database browser:

```bash
npx prisma studio
```

Opens at [http://localhost:5555](http://localhost:5555).


### `Loan`
Core lending record.

| Field | Type | Notes |
|---|---|---|
| loanNumber | String (unique) | Auto-generated (AMPM-YYYY-NNNNN) |
| principalAmount | Decimal | Original loan amount |
| interestRate | Decimal | Rate value |
| interestRateType | InterestRateType | PERCENTAGE_PER_PERIOD, FLAT_RATE, DIMINISHING |
| penaltyAmount | Decimal | Penalty charged on overdue |
| penaltyType | PenaltyType? | FIXED or PERCENTAGE |
| graceDays | Int | Days before penalty kicks in |
| status | LoanStatus | PENDING, ACTIVE, COMPLETED, DEFAULTED, WRITTEN_OFF |
| isOverdue | Boolean | Updated by scheduler |
| outstandingBalance | Decimal | Running balance |
| startDate / endDate | DateTime | Loan term dates |

### `LoanTerm`
Defines the repayment schedule template.

| Field | Type | Notes |
|---|---|---|
| frequency | PaymentFrequency | DAILY, WEEKLY, BIWEEKLY, MONTHLY, CUSTOM |
| totalPeriods | Int | Number of installments |
| intervalDays | Int? | Used for CUSTOM frequency |

### `PaymentSchedule`
One row per installment period — the amortization table.

| Field | Type | Notes |
|---|---|---|
| periodNumber | Int | 1-based installment index |
| dueDate | DateTime | When this installment is due |
| principalDue | Decimal | Principal portion |
| interestDue | Decimal | Interest portion |
| totalDue | Decimal | Total expected payment |
| paidAmount | Decimal | Amount actually paid so far |
| status | ScheduleStatus | PENDING, PARTIAL, PAID, OVERDUE, WAIVED |
| penaltyDue | Decimal | Penalty accrued |
| isInterestWaived | Boolean | Whether interest was waived |
| waivedAmount | Decimal | Amount waived |
| paidAt | DateTime? | When fully paid |

### `Payment`
An actual payment received from a borrower.

| Field | Type | Notes |
|---|---|---|
| referenceNumber | String (unique) | Auto-generated (PAY-YYYYMMDD-NNNNN) |
| amount | Decimal | Amount received |
| paymentType | PaymentType | CASH, BANK_TRANSFER, GCASH, MAYA, CUSTOM |
| waivedInterest | Decimal | Interest waived on this payment |
| remarks | String? | Free-text notes |
| processedBy | String | Admin user ID who recorded it |

---

## Migrations

### Development

```bash
# Create and apply a migration
npx prisma migrate dev --name <migration_name>

# Reset database (drops all data and re-runs migrations)
npx prisma migrate reset
```

### Production

```bash
# Apply pending migrations only (no data loss)
npx prisma migrate deploy
```

### View migration history

```bash
npx prisma migrate status
```

---

## Seeding

The seed file (`prisma/seed.ts`) creates:

1. **Admin user** — `admin@ampmlending.com` / `Admin@AMPM2024!`
2. **Demo borrower** — `juan.delacruz@example.com` / `Borrower@AMPM2024!`
3. **Loan terms** — Weekly (12 weeks), Monthly (12 months), Monthly (24 months), Monthly (36 months)
4. **System settings** — Default app-wide configuration

```bash
npx prisma db seed
```

---

## Backups

### Manual (pg_dump)

```bash
pg_dump -U ampm -d ampm_lending -F c -f backup_$(date +%Y%m%d).dump
```

### Restore

```bash
pg_restore -U ampm -d ampm_lending backup_YYYYMMDD.dump
```

### Docker volume backup

```bash
docker run --rm \
  -v ampm-lending_postgres_data:/source:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data_$(date +%Y%m%d).tar.gz -C /source .
```

---

## Prisma Studio (GUI)

Launch an interactive database browser:

```bash
npx prisma studio
```

Opens at [http://localhost:5555](http://localhost:5555).
