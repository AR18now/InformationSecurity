# Quick Testing Guide

## Setup (One Time)
```bash
# Backend
cd backend
npm install
# Create .env with MONGODB_URI and JWT_SECRET
npm start

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Test All Features

### 1. Authentication ✅
- Sign up: Create user "alice"
- Login: Use credentials
- ✅ Keys auto-generated and stored

### 2. Key Exchange ✅
- Login as "alice" and "bob" (different browsers)
- Select conversation → Key exchange auto-starts
- ✅ Check browser console for "Key exchange complete"

### 3. Message Encryption ✅
- Send message as "alice"
- ✅ Check MongoDB: Should see ciphertext (not plaintext)
- Login as "bob" → ✅ Message decrypts automatically

### 4. File Sharing ✅
- Click paperclip icon → Upload file
- ✅ File encrypts before upload
- Click download → ✅ File decrypts automatically

### 5. Replay Protection ✅
- Send message
- Copy request from DevTools → Replay it
- ✅ Should reject with "Replay attack detected"

### 6. MITM Protection ✅
- Check key exchange in DevTools
- ✅ Messages are signed
- Try modifying signature → ✅ Should fail

### 7. Security Logging ✅
- Check: `backend/logs/security.log`
- ✅ All events logged (login, key exchange, attacks)

### 8. Threat Model ✅
- Read: `THREAT_MODEL_STRIDE.md`
- ✅ 29 threats documented

## Quick Verification
- ✅ Messages in DB = ciphertext only
- ✅ Files in DB = ciphertext only
- ✅ Private keys = IndexedDB only (not server)
- ✅ Security logs = All events recorded

**Done!** 🎉
