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

---

## Option C: Railway / Render

Both Railway and Render support Docker-based deployments. Simply:

1. Connect your GitHub repository
2. Set environment variables in the platform dashboard
3. Railway auto-detects `Dockerfile`; Render requires you select **Docker** as the runtime

---

## Post-Deployment Checklist

- [ ] Change default admin password (`Admin@AMPM2024!`)
- [ ] Set strong `NEXTAUTH_SECRET` (32+ random chars)
- [ ] Configure Gmail App Password for email notifications
- [ ] Set `NEXTAUTH_URL` to the production URL
- [ ] Enable Google OAuth if desired (add Authorized Redirect URI in GCP console)
- [ ] Test loan creation → payment recording → email receipt flow
- [ ] Verify audit logs are recording correctly
- [ ] Set up database backups (pg_dump cron or Neon auto-backup)

---

## Environment Variables for Production

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="https://yourdomain.com"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GMAIL_USER="noreply@yourdomain.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
EMAIL_FROM_NAME="AMPM Lending"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_NAME="AMPM Lending"
NODE_ENV="production"
```
