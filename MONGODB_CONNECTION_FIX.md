# MongoDB Connection Error - Fix Guide

## ❌ What the Errors Mean

```
Error connecting to MongoDB: queryTxt ETIMEOUT cluster0.dfgdjte.mongodb.net
Operation `users.findOne()` buffering timed out after 10000ms
```

**Translation**: 
- Your backend **cannot connect** to MongoDB Atlas (cloud database)
- All database operations are **timing out** (failing after 10 seconds)
- The server is running, but **can't access the database**

---

## 🔧 Solution 1: Use Local MongoDB (EASIEST - Recommended for Testing)

### Step 1: Install Local MongoDB
```bash
# Download from: https://www.mongodb.com/try/download/community
# Or use Chocolatey (Windows):
choco install mongodb
```

### Step 2: Start Local MongoDB
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

### Step 3: Update .env File
Edit `backend/.env`:
```env
# Change from:
MONGO_DB_URI=mongodb+srv://manalshahid18:manal098@cluster0.dfgdjte.mongodb.net/IS?appName=Cluster0

# To (Local MongoDB):
MONGO_DB_URI=mongodb://localhost:27017/secure_messaging_db
```

### Step 4: Restart Backend
```bash
# Stop current server (Ctrl+C)
# Then restart:
cd backend
npm start
```

✅ **Expected**: Should see "Connected to MongoDB" (no errors)

---

## 🔧 Solution 2: Fix MongoDB Atlas Connection

### Step 1: Check MongoDB Atlas Cluster Status
1. Go to: https://cloud.mongodb.com
2. Login with your account
3. Check if cluster is **paused** (free tier pauses after inactivity)
4. If paused: Click **"Resume"** and wait 1-2 minutes

### Step 2: Whitelist Your IP Address
1. In MongoDB Atlas dashboard
2. Go to **"Network Access"** (left sidebar)
3. Click **"Add IP Address"**
4. Click **"Add Current IP Address"** (or add `0.0.0.0/0` for all IPs - less secure)
5. Click **"Confirm"**

### Step 3: Verify Database User
1. Go to **"Database Access"** (left sidebar)
2. Check if user `manalshahid18` exists
3. Verify password is correct
4. Ensure user has **"Read and write"** permissions

### Step 4: Check Connection String
1. Go to **"Clusters"** → Click **"Connect"**
2. Choose **"Connect your application"**
3. Copy the connection string
4. Update `backend/.env`:
```env
MONGO_DB_URI=mongodb+srv://manalshahid18:manal098@cluster0.dfgdjte.mongodb.net/secure_messaging_db?retryWrites=true&w=majority
```

**Note**: Make sure database name is `secure_messaging_db` (not `IS`)

### Step 5: Test Connection
```bash
# Restart backend
cd backend
npm start
```

✅ **Expected**: Should see "Connected to MongoDB"

---

## 🔧 Solution 3: Check Network/Firewall

### Windows Firewall
1. Open **Windows Defender Firewall**
2. Check if MongoDB/Node.js is blocked
3. Allow through firewall if needed

### Antivirus/Network
- Some antivirus software blocks MongoDB connections
- Try temporarily disabling to test
- Check if you're on a restricted network (school/work)

---

## 🚀 Quick Fix (Recommended for Testing)

**Use Local MongoDB** - It's faster and easier:

1. **Install MongoDB locally** (if not installed)
2. **Start MongoDB service**
3. **Update `.env`**:
   ```env
   MONGO_DB_URI=mongodb://localhost:27017/secure_messaging_db
   ```
4. **Restart backend**

This avoids all network/Atlas issues!

---

## ✅ Verify Connection Works

After fixing, you should see:
```
Server Running on port 3005
Connected to MongoDB
```

**NOT**:
```
Error connecting to MongoDB: queryTxt ETIMEOUT...
```

---

## 🐛 Still Not Working?

1. **Check MongoDB is running**:
   ```bash
   # Windows
   net start MongoDB
   
   # Test connection
   mongosh
   ```

2. **Check .env file**:
   - Make sure `MONGO_DB_URI` is correct
   - No extra spaces or quotes
   - File is named exactly `.env` (not `.env.txt`)

3. **Check backend logs**:
   - Look for specific error messages
   - Check if it's a network issue or authentication issue

4. **Try connection string format**:
   ```env
   # Local
   MONGO_DB_URI=mongodb://localhost:27017/secure_messaging_db
   
   # Atlas (with proper format)
   MONGO_DB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
   ```

---

**Status**: Connection fix guide ready! ✅

