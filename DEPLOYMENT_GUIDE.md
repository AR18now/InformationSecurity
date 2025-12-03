# Deployment Guide

## Overview

This guide provides instructions for deploying the **Secure End-to-End Encrypted Messaging & File-Sharing System** to production environments.

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                              │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/TLS
                          │
        ┌─────────────────┴─────────────────┐
        │                                     │
┌───────▼────────┐                  ┌────────▼──────┐
│   CDN/Proxy    │                  │  Load Balancer│
│  (Optional)    │                  │   (Optional)  │
└───────┬────────┘                  └────────┬──────┘
        │                                     │
        │                                     │
┌───────▼────────────────────────────────────▼──────┐
│            Frontend (Static Hosting)               │
│  • Netlify / Vercel / AWS S3 + CloudFront         │
│  • HTTPS enabled                                   │
│  • Domain: https://yourdomain.com                  │
└────────────────────────────────────────────────────┘
                          │
                          │ API Calls (HTTPS)
                          │
┌─────────────────────────▼──────────────────────────┐
│            Backend (Node.js Server)                │
│  • Express.js application                         │
│  • HTTPS enabled                                   │
│  • Domain: https://api.yourdomain.com             │
│  • Process Manager: PM2 / Docker                  │
└─────────────────────────┬──────────────────────────┘
                          │
                          │ MongoDB Connection (TLS)
                          │
┌─────────────────────────▼──────────────────────────┐
│            Database (MongoDB)                      │
│  • MongoDB Atlas (Cloud)                          │
│  • Or Self-hosted MongoDB                         │
│  • Encryption at rest enabled                     │
└────────────────────────────────────────────────────┘
```

---

## Pre-Deployment Checklist

### Security

- [ ] Change all default passwords and secrets
- [ ] Generate strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure secure cookies (httpOnly, secure, sameSite)
- [ ] Set up MongoDB authentication
- [ ] Enable MongoDB encryption at rest
- [ ] Configure CORS properly (production domains only)
- [ ] Set up rate limiting
- [ ] Enable security logging
- [ ] Review and update environment variables

### Infrastructure

- [ ] Choose hosting provider (AWS, Azure, GCP, Heroku, etc.)
- [ ] Set up domain name and DNS
- [ ] Obtain SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Set up log rotation
- [ ] Plan for scalability

### Application

- [ ] Test all features in staging environment
- [ ] Build production frontend (`npm run build`)
- [ ] Optimize bundle size
- [ ] Test API endpoints
- [ ] Verify database connections
- [ ] Test key exchange flow
- [ ] Test message encryption/decryption
- [ ] Test file upload/download
- [ ] Verify security logging

---

## Deployment Options

### Option 1: Heroku

#### Backend Deployment

1. **Install Heroku CLI**
```bash
# Download from: https://devcenter.heroku.com/articles/heroku-cli
```

2. **Login to Heroku**
```bash
heroku login
```

3. **Create Heroku App**
```bash
cd backend
heroku create your-app-name-backend
```

4. **Set Environment Variables**
```bash
heroku config:set MONGODB_URI=mongodb+srv://...
heroku config:set JWT_SECRET=your_secret_key
heroku config:set NODE_ENV=production
heroku config:set PORT=3005
```

5. **Deploy**
```bash
git push heroku main
# or
git push heroku master
```

6. **Check Logs**
```bash
heroku logs --tail
```

#### Frontend Deployment

1. **Build Frontend**
```bash
cd frontend
npm run build
```

2. **Deploy to Netlify/Vercel**
   - Connect GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Set environment variable: `VITE_API_URL=https://your-app-name-backend.herokuapp.com`

### Option 2: AWS (EC2 + S3)

#### Backend on EC2

1. **Launch EC2 Instance**
   - Choose Ubuntu 22.04 LTS
   - Instance type: t2.micro (free tier) or larger
   - Configure security group (open port 3005, 22)

2. **SSH into Instance**
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

3. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. **Install MongoDB (or use Atlas)**
```bash
# Or use MongoDB Atlas (recommended)
```

5. **Clone and Setup**
```bash
git clone <your-repo>
cd IS_Project/backend
npm install --production
```

6. **Create .env File**
```bash
nano .env
# Add: MONGODB_URI, JWT_SECRET, PORT, NODE_ENV
```

7. **Install PM2**
```bash
sudo npm install -g pm2
```

8. **Start Application**
```bash
pm2 start server.js --name "secure-messaging-api"
pm2 save
pm2 startup
```

9. **Configure Nginx (Reverse Proxy)**
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/default
```

Nginx config:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

10. **Enable HTTPS (Let's Encrypt)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

#### Frontend on S3 + CloudFront

1. **Create S3 Bucket**
```bash
aws s3 mb s3://your-frontend-bucket
```

2. **Build and Upload**
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://your-frontend-bucket --delete
```

3. **Configure S3 for Static Hosting**
   - Enable static website hosting
   - Set index document: `index.html`

4. **Create CloudFront Distribution**
   - Origin: S3 bucket
   - Enable HTTPS
   - Set custom domain

### Option 3: Docker Deployment

#### Create Dockerfile (Backend)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3005

CMD ["node", "server.js"]
```

#### Create Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3005:3005"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/secure_messaging_db
      - JWT_SECRET=${JWT_SECRET}
      - NODE_ENV=production
    depends_on:
      - mongo

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

#### Deploy with Docker

```bash
docker-compose up -d
```

---

## Environment Configuration

### Production Environment Variables

#### Backend (.env)

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/secure_messaging_db?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_very_strong_random_secret_key_here_min_32_chars

# Server
PORT=3005
NODE_ENV=production

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Logging
LOG_RETENTION_DAYS=30
LOG_LEVEL=info

# Security
COOKIE_SECURE=true
COOKIE_SAMESITE=strict
COOKIE_HTTPONLY=true
```

#### Frontend (.env.production)

```env
VITE_API_URL=https://api.yourdomain.com
```

---

## SSL/TLS Configuration

### Let's Encrypt (Free SSL)

1. **Install Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
```

2. **Obtain Certificate**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. **Auto-Renewal**
```bash
sudo certbot renew --dry-run
# Certbot auto-renews certificates
```

### Cloudflare SSL

1. **Add Domain to Cloudflare**
2. **Update DNS Records**
3. **Enable SSL/TLS**
   - Set to "Full" or "Full (strict)"
4. **Enable Automatic HTTPS Rewrites**

---

## Database Setup (MongoDB Atlas)

### Create Cluster

1. **Sign Up**: https://www.mongodb.com/cloud/atlas
2. **Create Free Cluster** (M0)
3. **Choose Region** (closest to your server)

### Configure Security

1. **Database Access**
   - Create database user
   - Set strong password
   - Grant read/write permissions

2. **Network Access**
   - Add IP address: `0.0.0.0/0` (for development)
   - For production: Add specific server IPs

3. **Encryption**
   - Enable encryption at rest
   - Enable TLS/SSL

### Get Connection String

```
mongodb+srv://username:password@cluster.mongodb.net/secure_messaging_db?retryWrites=true&w=majority
```

---

## Monitoring and Logging

### Application Monitoring

#### PM2 Monitoring

```bash
# Install PM2
npm install -g pm2

# Start with monitoring
pm2 start server.js --name "api" --log-date-format="YYYY-MM-DD HH:mm:ss"

# Monitor
pm2 monit

# View logs
pm2 logs api

# Restart on crash
pm2 start server.js --name "api" --max-restarts 10
```

#### Log Rotation

```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Security Log Monitoring

```bash
# Monitor security logs
tail -f backend/logs/security.log | grep ERROR

# Check for attacks
grep "REPLAY_ATTACK\|INVALID_SIGNATURE" backend/logs/security.log
```

### Database Monitoring

- **MongoDB Atlas**: Built-in monitoring dashboard
- **Self-hosted**: Use MongoDB Compass or mongostat

---

## Backup Strategy

### Database Backups

#### MongoDB Atlas

- **Automated Backups**: Enabled by default
- **Point-in-Time Recovery**: Available on M10+ clusters
- **Manual Backup**: Use MongoDB Compass

#### Self-Hosted MongoDB

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://localhost:27017/secure_messaging_db" --out=/backups/$DATE
```

### Application Backups

```bash
# Backup logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz backend/logs/

# Backup environment files (encrypted)
# Store .env files securely (not in git)
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**
   - Distribute requests across multiple backend instances
   - Use sticky sessions if needed

2. **Multiple Backend Instances**
   - Run multiple Node.js processes
   - Use PM2 cluster mode:
   ```bash
   pm2 start server.js -i max
   ```

3. **Database Replication**
   - MongoDB replica sets
   - Read replicas for read-heavy workloads

### Vertical Scaling

1. **Increase Server Resources**
   - More CPU/RAM
   - Faster storage (SSD)

2. **Optimize Application**
   - Database indexing
   - Query optimization
   - Caching (Redis)

---

## Security Hardening

### Server Security

1. **Firewall Configuration**
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

2. **SSH Hardening**
```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (use keys only)
```

3. **Regular Updates**
```bash
sudo apt update && sudo apt upgrade -y
```

### Application Security

1. **Rate Limiting** (Add to Express)
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

2. **Helmet.js** (Security Headers)
```javascript
const helmet = require('helmet');
app.use(helmet());
```

3. **Input Validation**
```javascript
// Use express-validator or joi
const { body, validationResult } = require('express-validator');
```

---

## Post-Deployment Testing

### Functional Testing

1. **User Registration**
   - [ ] Sign up new user
   - [ ] Verify key generation
   - [ ] Check database entry

2. **Authentication**
   - [ ] Login with credentials
   - [ ] Verify JWT token
   - [ ] Test protected routes

3. **Key Exchange**
   - [ ] Start conversation
   - [ ] Verify key exchange completes
   - [ ] Check session key storage

4. **Messaging**
   - [ ] Send encrypted message
   - [ ] Receive and decrypt message
   - [ ] Verify no plaintext in database

5. **File Sharing**
   - [ ] Upload encrypted file
   - [ ] Download and decrypt file
   - [ ] Verify file integrity

### Security Testing

1. **Replay Attack Protection**
   - [ ] Attempt to replay message
   - [ ] Verify rejection
   - [ ] Check security logs

2. **MITM Protection**
   - [ ] Attempt to modify key exchange
   - [ ] Verify signature check fails
   - [ ] Check security logs

3. **Access Control**
   - [ ] Try to access other user's messages
   - [ ] Verify access denied

---

## Maintenance

### Regular Tasks

1. **Daily**
   - [ ] Check application logs
   - [ ] Monitor security logs
   - [ ] Verify backups completed

2. **Weekly**
   - [ ] Review security events
   - [ ] Check database size
   - [ ] Review error rates

3. **Monthly**
   - [ ] Update dependencies
   - [ ] Review and rotate secrets
   - [ ] Test disaster recovery

### Updates

```bash
# Update dependencies
npm audit
npm update

# Update Node.js
# Use nvm or download latest LTS

# Update MongoDB
# Follow MongoDB upgrade guide
```

---

## Troubleshooting Production Issues

### Application Won't Start

```bash
# Check logs
pm2 logs api
# or
journalctl -u your-service

# Check environment variables
printenv | grep MONGODB_URI

# Test database connection
mongosh "mongodb+srv://..."
```

### High Memory Usage

```bash
# Check PM2 memory
pm2 monit

# Restart if needed
pm2 restart api

# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=2048" pm2 start server.js
```

### Database Connection Issues

```bash
# Test connection
mongosh "mongodb+srv://..."

# Check network
ping cluster.mongodb.net

# Verify IP whitelist in MongoDB Atlas
```

---

## Disaster Recovery

### Recovery Procedures

1. **Database Recovery**
   - Restore from MongoDB backup
   - Verify data integrity

2. **Application Recovery**
   - Redeploy from Git repository
   - Restore environment variables
   - Restart services

3. **Key Recovery**
   - Users must re-import private keys
   - Cannot recover private keys from server

---

## Support and Resources

### Documentation

- System Architecture: `SYSTEM_ARCHITECTURE.md`
- Protocol Flows: `PROTOCOL_FLOW_DIAGRAMS.md`
- Database Schema: `DATABASE_SCHEMA.md`
- Setup Instructions: `SETUP_INSTRUCTIONS.md`

### Monitoring Tools

- **Application**: PM2, New Relic, Datadog
- **Infrastructure**: AWS CloudWatch, Grafana
- **Security**: Security logs, MongoDB Atlas alerts

---

**Status**: Deployment guide complete ✅
