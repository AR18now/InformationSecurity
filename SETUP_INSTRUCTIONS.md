# Setup Instructions

## Overview

This guide provides step-by-step instructions for setting up and running the **Secure End-to-End Encrypted Messaging & File-Sharing System**.

---

## Prerequisites

### Required Software

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (v4.4 or higher)
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

3. **Git** (optional, for cloning)
   - Download from: https://git-scm.com/

4. **Modern Web Browser**
   - Chrome, Firefox, Edge (latest versions)
   - Must support Web Crypto API

---

## Installation Steps

### Step 1: Clone/Download Project

```bash
# If using Git
git clone <repository-url>
cd IS_Project

# Or extract the project folder
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

**Expected Output:**
```
added 234 packages in 30s
```

**Dependencies Installed:**
- express
- mongoose
- bcryptjs
- jsonwebtoken
- cookie-parser
- dotenv
- cors

### Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**Expected Output:**
```
added 456 packages in 45s
```

**Dependencies Installed:**
- react
- react-dom
- vite
- zustand
- react-hot-toast
- react-icons

### Step 4: Configure Environment Variables

#### Backend Configuration

Create `backend/.env` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/secure_messaging_db

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here_change_this

# Server Port
PORT=3005

# Log Retention (optional, default: 30 days)
LOG_RETENTION_DAYS=30
```

**Generate JWT Secret:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### Frontend Configuration

Create `frontend/.env` file (if needed):

```env
VITE_API_URL=http://localhost:3005
```

---

## Database Setup

### Option 1: Local MongoDB

1. **Start MongoDB Service**

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# or
mongod
```

2. **Verify MongoDB is Running**

```bash
mongosh
# Should connect to MongoDB shell
```

3. **Create Database** (automatic on first connection)

The database will be created automatically when the application first connects.

### Option 2: MongoDB Atlas (Cloud)

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas
   - Sign up for free account

2. **Create Cluster**
   - Click "Create Cluster"
   - Choose free tier (M0)
   - Select region

3. **Create Database User**
   - Go to "Database Access"
   - Add new user
   - Set username and password

4. **Whitelist IP Address**
   - Go to "Network Access"
   - Add IP address (0.0.0.0/0 for development)

5. **Get Connection String**
   - Go to "Clusters" → "Connect"
   - Copy connection string
   - Update `MONGODB_URI` in `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/secure_messaging_db
   ```

---

## Running the Application

### Step 1: Start MongoDB (if using local)

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Step 2: Start Backend Server

```bash
cd backend
npm start
```

**Expected Output:**
```
Server Running on port 3005
MongoDB Connected
```

**If you see errors:**
- Check MongoDB is running
- Verify `MONGODB_URI` in `.env` is correct
- Check port 3005 is not in use

### Step 3: Start Frontend Development Server

Open a new terminal:

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

---

## Initial Setup

### Create First User

1. **Open Application**
   - Navigate to: http://localhost:5173

2. **Sign Up**
   - Click "Sign Up"
   - Enter username, password, full name
   - Click "Sign Up"

3. **Key Generation**
   - RSA-2048 key pair will be generated automatically
   - Private key stored in IndexedDB
   - Public key sent to server

4. **Login**
   - Use your credentials to log in
   - Private key will be retrieved and verified

### Test the System

1. **Create Two Users**
   - Sign up as "alice" and "bob"
   - Log in with both accounts (use different browsers/incognito)

2. **Start a Conversation**
   - Log in as "alice"
   - Select "bob" from conversations
   - Key exchange will happen automatically

3. **Send a Message**
   - Type a message and send
   - Message is encrypted before sending
   - Server stores only ciphertext

4. **Receive Messages**
   - Log in as "bob"
   - View the conversation
   - Messages are decrypted client-side

5. **Upload a File**
   - Click paperclip icon
   - Select a file
   - File is encrypted and uploaded

6. **Download a File**
   - Click download button on file
   - File is decrypted and downloaded

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error

**Error:**
```
MongoServerError: connect ECONNREFUSED
```

**Solution:**
- Verify MongoDB is running: `mongosh`
- Check `MONGODB_URI` in `.env` is correct
- For Atlas: Check IP whitelist and credentials

#### 2. Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3005
```

**Solution:**
```bash
# Find process using port 3005
# Windows
netstat -ano | findstr :3005

# Linux/Mac
lsof -i :3005

# Kill the process or change PORT in .env
```

#### 3. Private Key Not Found

**Error:**
```
Private key not found in IndexedDB
```

**Solution:**
- Clear browser storage and sign up again
- Keys are generated on signup
- If you deleted IndexedDB, you need to regenerate keys

#### 4. Key Exchange Fails

**Error:**
```
Key exchange timeout
```

**Solution:**
- Ensure both users are logged in
- Check browser console for errors
- Verify signatures are being verified correctly
- Check network connectivity

#### 5. Decryption Fails

**Error:**
```
[Decryption failed]
```

**Solution:**
- Verify session key exists for conversation
- Check if key exchange completed successfully
- Ensure you're using the correct session key
- Try re-initiating key exchange

---

## Development Mode

### Backend Development

```bash
cd backend
npm run dev  # If nodemon is installed
# or
npm start
```

### Frontend Development

```bash
cd frontend
npm run dev
```

**Hot Reload**: Changes will automatically reload in browser.

---

## Production Deployment

### Backend Deployment

1. **Build for Production**
```bash
cd backend
npm install --production
```

2. **Set Environment Variables**
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production_secret_key
PORT=3005
NODE_ENV=production
```

3. **Start Server**
```bash
npm start
# or use PM2
pm2 start server.js
```

### Frontend Deployment

1. **Build for Production**
```bash
cd frontend
npm run build
```

2. **Deploy Build Folder**
```bash
# Build output in: frontend/dist/
# Deploy to:
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Any static hosting
```

3. **Update API URL**
```env
# In production, update API URL
VITE_API_URL=https://api.yourdomain.com
```

### HTTPS Setup

**Required for Production:**
- SSL/TLS certificate (Let's Encrypt, Cloudflare, etc.)
- HTTPS for both frontend and backend
- Secure cookies (secure flag)

---

## Security Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to strong random value
- [ ] Use HTTPS for all communication
- [ ] Set secure cookie flags (httpOnly, secure, sameSite)
- [ ] Enable MongoDB authentication
- [ ] Use MongoDB encryption at rest
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable security logging
- [ ] Set up log rotation
- [ ] Regular security updates

---

## Testing

### Manual Testing

1. **Authentication**
   - [ ] Sign up new user
   - [ ] Login with credentials
   - [ ] Logout
   - [ ] Try invalid credentials

2. **Key Exchange**
   - [ ] Start conversation (auto key exchange)
   - [ ] Verify key exchange completes
   - [ ] Check session key is stored

3. **Message Encryption**
   - [ ] Send message
   - [ ] Verify server stores ciphertext only
   - [ ] Verify message decrypts correctly
   - [ ] Check database (should see ciphertext)

4. **File Sharing**
   - [ ] Upload file
   - [ ] Verify file encrypts before upload
   - [ ] Download file
   - [ ] Verify file decrypts correctly

5. **Replay Protection**
   - [ ] Try to replay a message
   - [ ] Verify it's rejected
   - [ ] Check security logs

6. **MITM Protection**
   - [ ] Try to modify key exchange message
   - [ ] Verify signature check fails
   - [ ] Check security logs

### Automated Testing

```bash
# Run replay attack tests
cd backend
npm test -- replayAttack.test.js

# Run other tests (if available)
npm test
```

---

## Maintenance

### Log Cleanup

```bash
# Manual cleanup
cd backend
node scripts/logCleanup.js

# Or via API
POST /api/security/clean
Body: { "daysToKeep": 30 }
```

### Database Backup

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/secure_messaging_db" --out=./backup

# Restore
mongorestore --uri="mongodb://localhost:27017/secure_messaging_db" ./backup/secure_messaging_db
```

### Monitoring

1. **Check Security Logs**
```bash
tail -f backend/logs/security.log
```

2. **Monitor Server Logs**
```bash
# Check for errors
grep ERROR backend/logs/security.log
```

3. **Database Monitoring**
```bash
# Check database size
mongosh
use secure_messaging_db
db.stats()
```

---

## Project Structure

```
IS_Project/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── middleware/
│   ├── scripts/
│   ├── logs/
│   ├── server.js
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── utils/
│   │   ├── context/
│   │   └── zustand/
│   ├── public/
│   └── .env
│
└── Documentation/
    ├── SYSTEM_ARCHITECTURE.md
    ├── PROTOCOL_FLOW_DIAGRAMS.md
    ├── DATABASE_SCHEMA.md
    ├── SETUP_INSTRUCTIONS.md
    └── ...
```

---

## Support

### Getting Help

1. **Check Documentation**
   - Read all `.md` files in project root
   - Check implementation summaries

2. **Check Logs**
   - Backend: `backend/logs/security.log`
   - Browser console: F12 → Console tab

3. **Common Solutions**
   - Clear browser cache and IndexedDB
   - Restart MongoDB
   - Restart backend server
   - Check environment variables

---

## Quick Start Summary

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Configure environment
# Create backend/.env with MONGODB_URI and JWT_SECRET

# 3. Start MongoDB (if local)
# Windows: net start MongoDB
# Linux/Mac: sudo systemctl start mongod

# 4. Start backend
cd backend && npm start

# 5. Start frontend (new terminal)
cd frontend && npm run dev

# 6. Open browser
# http://localhost:5173
```

---

**Status**: Setup instructions complete ✅
