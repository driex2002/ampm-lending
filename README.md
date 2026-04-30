# AMPM Lending — Lending Management System

A full-featured, production-ready Lending Management Web Application built with **Next.js 15**, **TypeScript**, **Prisma**, **PostgreSQL**, and **NextAuth v5**.

---

## Features

### Admin Portal
- **Dashboard** — Portfolio overview, overdue alerts, collection stats with charts, customizable background image
- **Borrower Management** — Full CRUD, status/blacklist controls, ID document tracking
- **Loan Management** — Create/edit loans, interest rate types, payment schedules
- **Payment Recording** — One-click payment capture, interest waiver support, PDF receipts
- **Reports** — Monthly collections (bar chart), portfolio breakdown, overdue ageing
- **Audit Logs** — Immutable action history with IP and user tracking
- **Admin Management** — Any admin can create and manage other admin accounts
- **System Settings** — App-wide configuration, branding, and appearance controls

### Borrower Portal
- **Dashboard** — Active loan summary, next payment due, overdue alerts
- **Loan History** — Full schedule view per loan
- **Payment History** — All recorded payments with receipts
- **Profile** — Nickname, contact info, avatar, password change

### Branding & Appearance
- **Dynamic App Name** — Updates site title, sidebar, login page, and browser tab instantly
- **App Icon & Favicon** — Upload custom images; displayed in sidebar header and browser tab
- **Login Background** — Upload a custom image or keep the default (financial district photo). Adjustable opacity (5–95%).
- **Dashboard Background** — Subtle background image shown behind all admin and borrower pages. Adjustable opacity (2–50%). Defaults to a professional business desk photo.
- **Color Schemes** — 6 built-in schemes: Ocean Blue, Emerald, Violet, Rose, Amber, Slate
- **Light / Dark / System Mode** — Per-browser preference, stored in `localStorage`
- **Icon Style** — 6 Phosphor icon weights selectable per user: Thin, Light, Regular, Bold, Fill, Duotone (default). Active nav item always renders in Fill style.
- **Sidebar Collapse** — Two controls: header toggle button + labeled bottom banner with keyboard hint

### Security
- NextAuth v5 (JWT strategy, 8-hour sessions)
- Account lockout after configurable failed attempts (default 5, 15-minute timeout)
- Google OAuth (admin-controlled — only pre-registered emails can login)
- Bcrypt password hashing (12 rounds)
- Role-based route protection via middleware
- Audit logging on all sensitive operations
- Super admin account protected via `SUPER_ADMIN_EMAIL` environment variable

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | PostgreSQL (Neon or self-hosted) |
| ORM | Prisma 5 |
| Auth | NextAuth v5 (Auth.js) |
| Styling | Tailwind CSS 3 + tailwindcss-animate |
| Icons | Phosphor Icons v2 (`@phosphor-icons/react`) |
| State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Email | Nodemailer (Gmail SMTP) |
| PDF | jsPDF + jspdf-autotable |
| Toasts | Sonner |
| Deployment | Docker / Vercel + Neon |

---

## Prerequisites

- **Node.js** 20+
- **npm** 10+ (or pnpm / yarn)
- **PostgreSQL** 15+ (or a [Neon](https://neon.tech) account)
- **Docker + Docker Compose** (for containerized deployment)
- **Gmail account** with App Password enabled (for email)
- **Google Cloud project** (optional, for Google OAuth)

---

## Quick Start (Local Development)

### 1. Clone & install dependencies

```bash
git clone https://github.com/<your-username>/ampm-lending.git
cd ampm-lending
npm install --legacy-peer-deps
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/ampm_lending?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/ampm_lending?schema=public"

# Auth
NEXTAUTH_SECRET="your-32-char-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Super admin (this email cannot be deleted or deactivated)
SUPER_ADMIN_EMAIL="admin@ampmlending.com"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email (Gmail)
GMAIL_USER="youremail@gmail.com"
GMAIL_APP_PASSWORD="your-16-char-app-password"
EMAIL_FROM_NAME="AMPM Lending"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="AMPM Lending"
```

> **Tip:** Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

### 3. Setup database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Default Credentials

Default credentials are generated during seed and masked for security reasons.

> **Note:** If you need the default credentials for local development, please contact the project owner at **driex2002@gmail.com**

---

## Docker Deployment

### 1. Configure environment

Copy `.env.example` to `.env` and fill in values (same as above). For Docker, `DATABASE_URL` and `DIRECT_URL` will automatically point to the bundled PostgreSQL container — you only need to set auth, email, and app keys.

### 2. Start containers (Windows)

```bat
start.bat
```

### 2. Start containers (Linux / macOS)

```bash
chmod +x start.sh
./start.sh
```

This starts:
- **ampm-app** on port `3000`
- **ampm-postgres** (PostgreSQL 16) on port `5432`

Database migrations run automatically on startup.

### 3. Seed the database (first run only)

```bash
docker exec -it ampm-app npx prisma db seed
```

### 4. Rebuild after code changes

```bash
./rebuild.sh            # Linux / macOS / Git Bash
rebuild.bat             # Windows CMD

./rebuild.sh --clear-cache   # force full rebuild without Docker layer cache
```

### 5. Stop containers

```bat
stop.bat      # Windows
./stop.sh     # Linux / macOS
```

---

## Vercel + Neon Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full Vercel + Neon cloud deployment guide.

---

## Project Structure

```
ampm-lending/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data (incl. branding defaults)
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, change-password pages (with dynamic bg)
│   │   ├── (admin)/         # Admin route group (with dynamic dashboard bg)
│   │   ├── (borrower)/      # Borrower route group (with dynamic dashboard bg)
│   │   └── api/
│   │       ├── admin/       # Admin APIs
│   │       ├── borrower/    # Borrower APIs
│   │       └── public/      # Unauthenticated APIs (app-config branding)
│   ├── components/
│   │   ├── admin/           # Admin view components
│   │   ├── auth/            # Login / change-password forms
│   │   ├── borrower/        # Borrower view components
│   │   ├── theme-provider.tsx   # Color mode + scheme + icon weight context
│   │   └── dynamic-favicon.tsx  # Live favicon swap from DB setting
│   ├── lib/
│   │   ├── auth/            # Password utilities
│   │   ├── email/           # Mailer + templates
│   │   ├── validations/     # Zod schemas
│   │   ├── audit.ts         # Audit log helpers
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── loan-calculator.ts
│   │   └── utils.ts         # Shared utilities
│   ├── auth.ts              # NextAuth v5 config (JWT callbacks incl. nickname)
│   ├── auth.config.ts       # Shared auth config (Edge-compatible)
│   ├── middleware.ts         # Route protection
│   └── types/               # TypeScript declarations
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
├── start.bat / stop.bat / rebuild.bat
├── start.sh / stop.sh / rebuild.sh
└── docs/
    ├── DEPLOYMENT.md
    └── DATABASE.md
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma migrate dev` | Run pending migrations (dev) |
| `npx prisma db seed` | Seed database |
| `npx prisma generate` | Regenerate Prisma client |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (pooled for Neon) |
| `DIRECT_URL` | ✅ | Direct (non-pooled) PostgreSQL URL |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char secret for JWT signing |
| `NEXTAUTH_URL` | ✅ | Full URL of the app (e.g. `https://app.example.com`) |
| `SUPER_ADMIN_EMAIL` | ✅ | Email of the protected super-admin account (cannot be deleted/deactivated) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `GMAIL_USER` | Optional | Gmail address for sending notifications |
| `GMAIL_APP_PASSWORD` | Optional | Gmail App Password (not your login password) |
| `EMAIL_FROM_NAME` | Optional | Display name on emails (default: AMPM Lending) |
| `NEXT_PUBLIC_APP_URL` | Optional | Public URL shown in emails |
| `NEXT_PUBLIC_APP_NAME` | Optional | App name shown in UI (overridden by DB setting at runtime) |
| `NEXT_PUBLIC_LOAN_NUMBER_PREFIX` | Optional | Prefix for loan numbers (default: AMPM) |
| `NEXT_PUBLIC_PAYMENT_REF_PREFIX` | Optional | Prefix for payment refs (default: PAY) |

---

## License

Proprietary — AMPM Lending. All rights reserved.

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="AMPM Lending"
```

> **Tip:** Generate `NEXTAUTH_SECRET` with: `openssl rand -base64 32`

### 3. Setup database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Default Credentials

Default credentials are generated during seed and masked for security reasons.

> **Note:** If you need the default credentials for local development, please contact the project owner at **driex2002@gmail.com**

---

## Docker Deployment

### 1. Configure environment

Copy `.env.example` to `.env` and fill in values (same as above). For Docker, `DATABASE_URL` and `DIRECT_URL` will automatically point to the bundled PostgreSQL container — you only need to set auth, email, and app keys.

### 2. Start containers (Windows)

```bat
start.bat
```

### 2. Start containers (Linux / macOS)

```bash
chmod +x start.sh
./start.sh
```

This starts:
- **ampm-app** on port `3000`
- **ampm-postgres** (PostgreSQL 16) on port `5432`

Database migrations run automatically on startup.

### 3. Seed the database (first run only)

```bash
docker exec -it ampm-app npx prisma db seed
```

### 4. Stop containers

```bat
stop.bat      # Windows
./stop.sh     # Linux / macOS
```

---

## Vercel + Neon Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full Vercel + Neon cloud deployment guide.

---

## Project Structure

```
ampm-lending/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, change-password pages
│   │   ├── (admin)/         # Admin route group
│   │   ├── (borrower)/      # Borrower route group
│   │   └── api/             # API route handlers
│   │       ├── admin/       # Admin APIs
│   │       └── borrower/    # Borrower APIs
│   ├── components/
│   │   ├── admin/           # Admin view components
│   │   ├── borrower/        # Borrower view components
│   │   └── ui/              # Shared UI primitives
│   ├── lib/
│   │   ├── auth/            # Password utilities
│   │   ├── email/           # Mailer + templates
│   │   ├── validations/     # Zod schemas
│   │   ├── audit.ts         # Audit log helpers
│   │   ├── db.ts            # Prisma client singleton
│   │   ├── loan-calculator.ts
│   │   └── utils.ts         # Shared utilities
│   ├── auth.ts              # NextAuth v5 config
│   ├── middleware.ts         # Route protection
│   └── types/               # TypeScript declarations
├── Dockerfile
├── docker-compose.yml
├── docker-entrypoint.sh
├── start.bat / stop.bat
├── start.sh / stop.sh
└── docs/
    ├── DEPLOYMENT.md
    └── DATABASE.md
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma migrate dev` | Run pending migrations (dev) |
| `npx prisma db seed` | Seed database |
| `npx prisma generate` | Regenerate Prisma client |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (pooled for Neon) |
| `DIRECT_URL` | ✅ | Direct (non-pooled) PostgreSQL URL |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char secret for JWT signing |
| `NEXTAUTH_URL` | ✅ | Full URL of the app (e.g. `https://app.example.com`) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `GMAIL_USER` | Optional | Gmail address for sending notifications |
| `GMAIL_APP_PASSWORD` | Optional | Gmail App Password (not your login password) |
| `EMAIL_FROM_NAME` | Optional | Display name on emails (default: AMPM Lending) |
| `NEXT_PUBLIC_APP_URL` | Optional | Public URL shown in emails |
| `NEXT_PUBLIC_APP_NAME` | Optional | App name shown in UI |
| `NEXT_PUBLIC_LOAN_NUMBER_PREFIX` | Optional | Prefix for loan numbers (default: AMPM) |
| `NEXT_PUBLIC_PAYMENT_REF_PREFIX` | Optional | Prefix for payment refs (default: PAY) |

---

## License

Proprietary — AMPM Lending. All rights reserved.
