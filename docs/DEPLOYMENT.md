# Byline Deployment Guide

## Quick Deploy (5 minutes)

Deploy Byline to production-ready infrastructure using these cloud platforms.

---

## Option 1: Deploy Reader App to Vercel (2 minutes)

**Vercel is the fastest way to deploy the React frontend.**

### Step 1: Connect GitHub

1. Go to https://vercel.com
2. Click **"New Project"**
3. Select your Byline GitHub repository
4. Click **"Import"**

### Step 2: Configure Build

Vercel auto-detects React/Vite. Verify:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**Environment Variables** (add before deployment):

```
VITE_CONTRACT_ID=YOUR_CONTRACT_ID_HERE
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_API_URL=YOUR_BACKEND_URL_HERE
```

### Step 3: Deploy

Click **"Deploy"**

**Result:** Your app is live at `https://byline-[random].vercel.app`

---

## Option 2: Deploy Backend to Railway (5 minutes)

**Railway is easiest for Node.js backend deployment.**

### Step 1: Connect GitHub

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select `Just-Bamford/Byline` repository

### Step 2: Configure Service

Railway auto-detects Node.js. Verify:

```
Root Directory: publisher-backend
Start Command: npm run dev
Node Version: 18+
```

**Environment Variables:**

```
SOROBAN_CONTRACT_ID=YOUR_CONTRACT_ID_HERE
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
DATABASE_URL=postgresql://...
NODE_ENV=production
PORT=3000
```

For PostgreSQL, Railway can provision it automatically:

1. Click **"Add"** in Railway dashboard
2. Select **"PostgreSQL"**
3. Railway auto-generates `DATABASE_URL`

### Step 3: Deploy

Click **"Deploy"**

**Result:** Your API is live at `https://byline-api-[random].railway.app`

---

## Option 3: Deploy Everything with Docker Compose (Cloud)

**For production on AWS, GCP, DigitalOcean, etc.**

### Step 1: Build Docker Images

```bash
cd byline
docker-compose build

# Tag images
docker tag byline-backend:latest YOUR_REGISTRY/byline-backend:latest
docker tag byline-reader:latest YOUR_REGISTRY/byline-reader:latest

# Push to registry
docker push YOUR_REGISTRY/byline-backend:latest
docker push YOUR_REGISTRY/byline-reader:latest
```

### Step 2: Deploy to Cloud

**AWS ECS:**

```bash
aws ecs create-cluster --cluster-name byline
aws ecs register-task-definition --cli-input-json file://ecs-task-def.json
aws ecs create-service --cluster byline --service-name byline --task-definition byline
```

**DigitalOcean App Platform:**

1. Go to https://cloud.digitalocean.com/apps
2. Click **"Create App"**
3. Connect GitHub repo
4. Upload `docker-compose.yml`
5. Set environment variables
6. Deploy

**Google Cloud Run:**

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/byline-backend
gcloud run deploy byline-backend --image gcr.io/PROJECT_ID/byline-backend
```

---

## Environment Variables for Production

### Backend (`publisher-backend/.env`)

```
# Soroban Contract
SOROBAN_CONTRACT_ID=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Database
DATABASE_URL=postgresql://user:password@host:5432/byline_prod

# Server
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# CORS
CORS_ORIGIN=https://byline-reader.vercel.app

# Optional: Error tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/...
```

### Frontend (`.env` or Vercel dashboard)

```
VITE_CONTRACT_ID=CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
VITE_API_URL=https://byline-api.railway.app
```

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] Contract deployed to testnet (see TESTNET.md)
- [ ] Database migrations applied
- [ ] SSL certificates ready
- [ ] Monitoring/logging configured

### Deployment

- [ ] Backend deployed and health check passing
- [ ] Reader app deployed and accessible
- [ ] Database connected and accessible
- [ ] Contract ID verified in both frontend and backend
- [ ] CORS properly configured
- [ ] Error tracking enabled (Sentry, etc)

### Post-Deployment

- [ ] Full end-to-end test (purchase, verify, read)
- [ ] Check logs for errors
- [ ] Verify analytics endpoints
- [ ] Monitor performance
- [ ] Test from different networks/devices

---

## Monitoring & Logging

### Error Tracking (Sentry)

```bash
npm install @sentry/node @sentry/integrations

# In publisher-backend/src/server.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Application Metrics

Monitor these key metrics:

- **API Response Time** - Should be <500ms
- **Database Query Time** - Should be <100ms
- **Contract Call Time** - Should be <5s (Soroban RPC)
- **Error Rate** - Should be <1%
- **Uptime** - Target >99.9%

### Log Aggregation

All services output JSON logs. Aggregate with:

- **ELK Stack** - Elasticsearch + Logstash + Kibana
- **Datadog** - Log management + APM
- **CloudWatch** - AWS native logging
- **Grafana Loki** - Open-source log aggregation

---

## Scaling

### Backend Scaling

```yaml
# docker-compose.yml - Scale backend to 3 replicas
services:
  publisher-backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "1"
          memory: 512M
```

### Load Balancing

Use a reverse proxy:

```nginx
upstream backend {
  server byline-backend-1:3000;
  server byline-backend-2:3000;
  server byline-backend-3:3000;
}

server {
  listen 80;
  server_name api.byline.app;

  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
  }
}
```

### Database

PostgreSQL scaling:

```sql
-- Create read replica
SELECT * FROM pg_create_physical_replication_slot('standby_slot');

-- Scale with connection pooling (pgBouncer)
-- Max connections: (cores * 2) + spare
```

---

## Security Checklist

- [ ] HTTPS/TLS enabled
- [ ] CORS properly restricted
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection headers
- [ ] CSRF tokens (if applicable)
- [ ] Environment secrets not in version control
- [ ] Regular dependency updates
- [ ] Security audit completed

---

## Rollback Plan

If deployment fails:

### Quick Rollback (Docker)

```bash
# Revert to previous image
docker pull YOUR_REGISTRY/byline-backend:previous
docker-compose down
docker-compose -f docker-compose.yml up -d

# Or with version tags
docker service update --image YOUR_REGISTRY/byline-backend:v1.0 byline_backend
```

### Database Rollback

```sql
-- Backup current state
pg_dump byline_prod > backup_$(date +%s).sql

-- Restore from backup
psql byline_prod < backup_timestamp.sql
```

---

## Support

- **Documentation:** https://byline.github.io
- **Issues:** https://github.com/Just-Bamford/Byline/issues
- **Discussions:** https://github.com/Just-Bamford/Byline/discussions

Last Updated: August 4, 2026
