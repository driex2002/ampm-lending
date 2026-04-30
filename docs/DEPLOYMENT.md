# Deployment Guide

## Option A: Vercel + Neon (Recommended for Cloud)

### 1. Create Neon Database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project: `ampm-lending`
3. Copy the **Pooled connection string** → use as `DATABASE_URL`
4. Copy the **Direct connection string** → use as `DIRECT_URL`

### 2. Deploy to Vercel

1. Push your code to GitHub (see main README)
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repository
3. Set **Framework Preset**: Next.js
4. Set **Root Directory**: `.` (project root)
5. Add **Environment Variables** (all from `.env.example`)
6. Click **Deploy**

### 3. Run Migrations

After first deploy, run migrations via Vercel's terminal or locally targeting Neon:

```bash
DATABASE_URL="..." DIRECT_URL="..." npx prisma migrate deploy
DATABASE_URL="..." DIRECT_URL="..." npx prisma db seed
```

### 4. Set NEXTAUTH_URL

Set `NEXTAUTH_URL` to your Vercel production URL, e.g.:
```
NEXTAUTH_URL=https://ampm-lending.vercel.app
```

---

## Option B: VPS / Dedicated Server (Docker)

### Requirements
- Ubuntu 22.04+ or Debian 12+
- Docker Engine 24+
- Docker Compose v2+
- Domain with DNS A record pointing to your server IP

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone & Configure

```bash
git clone https://github.com/<your-username>/ampm-lending.git
cd ampm-lending
cp .env.example .env
nano .env  # fill in all required values
```

### 3. Start

```bash
chmod +x start.sh
./start.sh
```

App runs at port 3000. PostgreSQL data is persisted in a Docker volume.

### 4. Setup Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### 6. Seed the database (first run)

```bash
docker exec -it ampm-app npx prisma db seed
```

### 7. Rebuild after code changes

```bash
./rebuild.sh                  # standard rebuild (uses Docker layer cache)
./rebuild.sh --clear-cache    # full rebuild without cache
```

---

## Option C: Railway / Render

Both Railway and Render support Docker-based deployments. Simply:

1. Connect your GitHub repository
2. Set environment variables in the platform dashboard
3. Railway auto-detects `Dockerfile`; Render requires you select **Docker** as the runtime

---

## Post-Deployment Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (32+ random chars)
- [ ] Set `SUPER_ADMIN_EMAIL` to the permanent super-admin email address
- [ ] Configure Gmail App Password for email notifications
- [ ] Set `NEXTAUTH_URL` to the production URL
- [ ] Enable Google OAuth if desired (add Authorized Redirect URI in GCP console)
- [ ] Log in and visit **Admin → Settings → Branding** to:
  - Set your app name
  - Upload app icon and favicon
  - Set login page and dashboard background images
- [ ] Test loan creation → payment recording → email receipt flow
- [ ] Verify audit logs are recording correctly
- [ ] Set up database backups (pg_dump cron or Neon auto-backup)

> **Note:** For default credentials, contact the project owner at **driex2002@gmail.com**

---

## Environment Variables for Production

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="https://yourdomain.com"

# Super admin protection (this account cannot be deleted or deactivated)
SUPER_ADMIN_EMAIL="admin@yourdomain.com"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Email notifications (Gmail SMTP)
GMAIL_USER="noreply@yourdomain.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
EMAIL_FROM_NAME="AMPM Lending"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_NAME="AMPM Lending"
NODE_ENV="production"
```

> **Note on `SUPER_ADMIN_EMAIL`**: This environment variable designates one account as permanently protected. The matching admin cannot be deactivated, deleted, or have their role downgraded via the UI. Set it to the email of your primary admin account.

---

## Branding System

All branding settings are stored in the `system_settings` database table and can be changed live via **Admin → Settings** without a redeploy.

| Setting | Where it appears |
|---|---|
| `app_name` | Sidebar header, login page heading, browser tab title |
| `app_icon` | Sidebar header logo |
| `app_favicon` | Browser tab favicon (dynamic, no rebuild needed) |
| `login_bg` | Full-bleed background behind the login/change-password forms |
| `login_bg_opacity` | How strongly the login background image shows (5–95%) |
| `dashboard_bg` | Background behind all admin and borrower portal pages |
| `dashboard_bg_opacity` | How strongly the dashboard background shows (2–50%) |

Default background images are sourced from Unsplash (free under the [Unsplash License](https://unsplash.com/license)):
- **Login**: Modern glass office / financial district
- **Dashboard**: Professional business desk with documents

Both images are stored as URLs in the DB by default; uploading a custom image converts them to base64 and stores inline.

