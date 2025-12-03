# Step-by-Step Testing Guide

## 🚀 Complete Testing Instructions

---

## **STEP 1: Setup & Start Services**

### 1.1 Start MongoDB
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# OR
mongod
```

### 1.2 Start Backend Server
```bash
cd backend
npm install  # (if not done already)
npm start
```

**Expected Output:**
```
Server Running on port 3005
MongoDB Connected
```

### 1.3 Start Frontend Server
```bash
cd frontend
npm install  # (if not done already)
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in 500 ms
➜  Local:   http://localhost:5173/
```

### 1.4 Open Browser
- Navigate to: `http://localhost:5173`
- Open **Developer Tools** (F12) → **Console** tab (to see logs)

---

## **STEP 2: Create Test Users**

### 2.1 Create First User (Alice)
1. Click **"Sign Up"**
2. Fill in:
   - Username: `alice`
   - Password: `password123`
   - Full Name: `Alice Smith`
3. Click **"Sign Up"**
4. ✅ **Check Console**: Should see "Key pair generated" or similar
5. ✅ **Check IndexedDB**: 
   - F12 → Application → IndexedDB → `ChatAppKeysDB` → `privateKeys`
   - Should see your username with encrypted key

### 2.2 Create Second User (Bob)
1. **Open Incognito/Private Window** (or different browser)
2. Navigate to: `http://localhost:5173`
3. Click **"Sign Up"**
4. Fill in:
   - Username: `bob`
   - Password: `password123`
   - Full Name: `Bob Johnson`
5. Click **"Sign Up"**
6. ✅ **Verify**: Both users created successfully

---

## **STEP 3: Test Authentication**

### 3.1 Test Login (Alice)
1. In **Browser 1** (Alice's window)
2. Click **"Logout"** (if logged in)
3. Click **"Login"**
4. Enter:
   - Username: `alice`
   - Password: `password123`
5. Click **"Login"**
6. ✅ **Check**: Should see home page with conversations
7. ✅ **Check Console**: Should see "Private key retrieved"

### 3.2 Test Login (Bob)
1. In **Browser 2** (Bob's window)
2. Login with `bob` / `password123`
3. ✅ **Verify**: Both users logged in

---

## **STEP 4: Test Key Exchange**

### 4.1 Start Conversation (Alice → Bob)
1. In **Browser 1** (Alice)
2. Look for **"Bob Johnson"** in conversations list
3. Click on **Bob's conversation**
4. ✅ **Check Console**: Should see:
   - "Initiating automatic key exchange..."
   - "Key exchange initiated: alice_id -> bob_id"
5. ✅ **Check UI**: Should see blue banner "🔐 Establishing secure connection..."

### 4.2 Respond to Key Exchange (Bob)
1. In **Browser 2** (Bob)
2. **Bob should automatically detect** the key exchange
3. ✅ **Check Console**: Should see:
   - "Key exchange completed with: alice_id"
   - "✅ Key exchange completed successfully"
4. ✅ **Check UI**: Should see "Secure connection established!" toast

### 4.3 Verify Key Exchange Complete (Alice)
1. In **Browser 1** (Alice)
2. ✅ **Check Console**: Should see:
   - "✅ Key exchange completed successfully"
3. ✅ **Check UI**: Should see "Secure connection established!" toast
4. ✅ **Check IndexedDB**:
   - F12 → Application → IndexedDB → `ChatAppKeysDB` → `sessionKeys`
   - Should see session key for the conversation

---

## **STEP 5: Test Message Encryption**

### 5.1 Send Encrypted Message (Alice)
1. In **Browser 1** (Alice)
2. Type message: `Hello Bob! This is encrypted.`
3. Click **Send** button
4. ✅ **Check Console**: Should see:
   - "Message encrypted"
   - "POST /api/messages/send/:id"
5. ✅ **Check UI**: Message should appear in chat

### 5.2 Verify Message in Database
1. Open MongoDB Compass or terminal
2. Connect to: `mongodb://localhost:27017`
3. Database: `secure_messaging_db`
4. Collection: `messages`
5. ✅ **Check**: Find the message
6. ✅ **Verify**:
   - `ciphertext` exists (Base64 string)
   - `iv` exists (Base64 string)
   - `authTag` exists (Base64 string)
   - **NO `message` field with plaintext** ✅

### 5.3 Receive & Decrypt Message (Bob)
1. In **Browser 2** (Bob)
2. ✅ **Check UI**: Should see message: `Hello Bob! This is encrypted.`
3. ✅ **Check Console**: Should see "Message decrypted successfully"
4. ✅ **Verify**: Message is readable (not encrypted text)

### 5.4 Send Reply (Bob → Alice)
1. In **Browser 2** (Bob)
2. Type: `Hi Alice! This is also encrypted.`
3. Click **Send**
4. ✅ **Verify**: Message appears for both users

---

## **STEP 6: Test File Sharing**

### 6.1 Upload Encrypted File (Alice)
1. In **Browser 1** (Alice)
2. Click **paperclip icon** (📎) next to message input
3. Select a file (e.g., `test.txt` or `image.jpg`)
4. ✅ **Check Console**: Should see:
   - "File encrypted"
   - "POST /api/files/upload/:id"
5. ✅ **Check UI**: Should see file message in chat
6. ✅ **Check Toast**: "File 'filename' uploaded successfully"

### 6.2 Verify File in Database
1. Open MongoDB
2. Collection: `files`
3. ✅ **Check**: Find the file entry
4. ✅ **Verify**:
   - `ciphertext` exists (encrypted file data)
   - `iv` exists
   - `authTag` exists
   - `originalFileName` = your file name
   - **NO plaintext file data** ✅

### 6.3 Download & Decrypt File (Bob)
1. In **Browser 2** (Bob)
2. ✅ **Check UI**: Should see file message with download button
3. Click **Download** button (⬇️)
4. ✅ **Check Console**: Should see "File decrypted"
5. ✅ **Verify**: File downloads and opens correctly
6. ✅ **Verify**: File content matches original

---

## **STEP 7: Test Replay Attack Protection**

### 7.1 Send Normal Message
1. In **Browser 1** (Alice)
2. Send message: `Test message 1`
3. ✅ **Verify**: Message sends successfully

### 7.2 Attempt Replay Attack
1. Open **Browser DevTools** (F12)
2. Go to **Network** tab
3. Find the POST request to `/api/messages/send/:id`
4. Right-click → **Copy** → **Copy as cURL** (or copy request)
5. **Replay the same request** (using Postman or curl)
6. ✅ **Expected**: Should get error:
   - `400 Bad Request`
   - `"Replay attack detected: Nonce already seen"`
7. ✅ **Check Security Logs**:
   - `backend/logs/security.log`
   - Should see replay attack logged

---

## **STEP 8: Test MITM Protection**

### 8.1 Check Key Exchange Signatures
1. In **Browser DevTools** (F12)
2. Go to **Network** tab
3. Find POST to `/api/keyexchange/initiate`
4. Click on it → **Payload** tab
5. ✅ **Verify**: Request has `signature` field (Base64 string)

### 8.2 Verify Signature Validation
1. Try to modify the key exchange message
2. Change `ecdhPublicKey` value
3. Keep the same `signature`
4. Send modified request
5. ✅ **Expected**: Should get error:
   - `400 Bad Request`
   - `"Invalid signature detected"`
6. ✅ **Check Security Logs**: Should see invalid signature logged

---

## **STEP 9: Test Security Logging**

### 9.1 Check Security Logs
1. Open file: `backend/logs/security.log`
2. ✅ **Verify**: Should see entries like:
   ```json
   {"timestamp":"...","level":"INFO","category":"AUTHENTICATION","message":"Login attempt","userId":"..."}
   {"timestamp":"...","level":"INFO","category":"KEY_EXCHANGE","message":"Key exchange initiated",...}
   ```

### 9.2 Test Log API
1. In browser, go to: `http://localhost:3005/api/security/logs`
2. (Need to be authenticated - use Postman with JWT token)
3. ✅ **Verify**: Returns JSON array of log entries

### 9.3 Check Log Statistics
1. GET `/api/security/statistics`
2. ✅ **Verify**: Returns statistics about logs

---

## **STEP 10: Test Threat Model Documentation**

### 10.1 Review Threat Model
1. Open: `THREAT_MODEL_STRIDE.md`
2. ✅ **Verify**: 29 threats documented
3. ✅ **Verify**: All 6 STRIDE categories covered

### 10.2 Review Defense Matrix
1. Open: `THREAT_DEFENSE_MATRIX.md`
2. ✅ **Verify**: All threats mapped to defenses
3. ✅ **Verify**: Status shown (Implemented/Partial/Missing)

---

## **STEP 11: Test Edge Cases**

### 11.1 Test with Offline User
1. **Close Browser 2** (Bob's window)
2. In **Browser 1** (Alice)
3. Try to send message
4. ✅ **Expected**: 
   - Key exchange times out
   - Yellow banner appears: "Key exchange pending"
   - Retry button available
5. **Reopen Browser 2** (Bob)
6. Click **Retry** button
7. ✅ **Verify**: Key exchange completes

### 11.2 Test Multiple Conversations
1. Create third user: `charlie`
2. Alice → Start conversation with Charlie
3. ✅ **Verify**: Separate session key for each conversation
4. ✅ **Verify**: Messages encrypted with correct key

### 11.3 Test Large Files
1. Upload a file > 1MB
2. ✅ **Verify**: File encrypts and uploads
3. ✅ **Verify**: File downloads and decrypts correctly

---

## **STEP 12: Verify Database Security**

### 12.1 Check Messages Collection
```javascript
// In MongoDB
db.messages.find().pretty()
```
✅ **Verify**:
- All messages have `ciphertext`, `iv`, `authTag`
- **NO `message` field with plaintext** ✅
- All messages encrypted

### 12.2 Check Files Collection
```javascript
db.files.find().pretty()
```
✅ **Verify**:
- All files have `ciphertext`, `iv`, `authTag`
- **NO plaintext file data** ✅
- All files encrypted

### 12.3 Check Users Collection
```javascript
db.users.find().pretty()
```
✅ **Verify**:
- Users have `publicKey` (RSA public key)
- **NO `privateKey` field** ✅
- Passwords are hashed (not plaintext)

---

## **STEP 13: Test Documentation**

### 13.1 Review Architecture Docs
1. Open: `SYSTEM_ARCHITECTURE.md`
2. ✅ **Verify**: Architecture diagrams present
3. ✅ **Verify**: All components documented

### 13.2 Review Protocol Flows
1. Open: `PROTOCOL_FLOW_DIAGRAMS.md`
2. ✅ **Verify**: Key exchange flow documented
3. ✅ **Verify**: Encryption/decryption flows documented

### 13.3 Review Setup Instructions
1. Open: `SETUP_INSTRUCTIONS.md`
2. ✅ **Verify**: Step-by-step instructions clear
3. ✅ **Verify**: Troubleshooting section present

---

## **✅ Final Checklist**

### Core Features
- [ ] User registration works
- [ ] User login works
- [ ] Key generation on signup
- [ ] Key storage in IndexedDB
- [ ] Key exchange completes
- [ ] Messages encrypt before sending
- [ ] Messages decrypt after receiving
- [ ] Files encrypt before upload
- [ ] Files decrypt after download
- [ ] Database stores only ciphertext

### Security Features
- [ ] Replay attacks rejected
- [ ] MITM attacks prevented (signatures)
- [ ] Security logs created
- [ ] No plaintext in database
- [ ] Private keys never sent to server

### Documentation
- [ ] Architecture docs complete
- [ ] Protocol flows documented
- [ ] Setup instructions clear
- [ ] Threat model complete

---

## **🐛 Troubleshooting**

### Issue: "Session key not available"
**Solution**: 
- Ensure both users are online
- Check browser console for errors
- Try retry button
- Check IndexedDB for session keys

### Issue: Key exchange timeout
**Solution**:
- Both users must be online simultaneously
- Check backend logs for errors
- Verify MongoDB is running
- Check network connectivity

### Issue: Messages not decrypting
**Solution**:
- Verify key exchange completed
- Check session key exists in IndexedDB
- Check browser console for decryption errors
- Verify same conversation ID used

### Issue: Files not uploading
**Solution**:
- Check file size (may be too large)
- Check browser console for errors
- Verify session key exists
- Check backend logs

---

## **📊 Quick Test Summary**

**Minimum Test (5 minutes):**
1. Create 2 users
2. Login both
3. Start conversation → Key exchange
4. Send message → Verify encrypted in DB
5. Receive message → Verify decrypted

**Full Test (30 minutes):**
- Complete all steps above
- Test all features
- Verify security
- Check documentation

---

**Status**: Complete testing guide ready! ✅


