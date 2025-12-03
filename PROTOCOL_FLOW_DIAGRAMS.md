# Protocol Flow Diagrams

## Overview

This document provides detailed flow diagrams for key protocols in the E2EE messaging system.

---

## 1. Key Exchange Protocol Flow

### Complete Key Exchange Sequence

```
┌─────────────┐                                    ┌─────────────┐
│   Alice     │                                    │    Bob      │
│  (User A)   │                                    │  (User B)   │
└──────┬──────┘                                    └──────┬──────┘
       │                                                    │
       │ 1. Generate ECDH Key Pair (P-256)                │
       │    { ecdhPublicKey_A, ecdhPrivateKey_A }         │
       │                                                    │
       │ 2. Create Key Exchange Init Message               │
       │    {                                               │
       │      type: "KEY_EXCHANGE_INIT",                   │
       │      senderId: "alice_id",                        │
       │      receiverId: "bob_id",                        │
       │      ecdhPublicKey: ecdhPublicKey_A (Base64),    │
       │      timestamp: 1234567890,                       │
       │      nonce: "random_nonce_123"                    │
       │    }                                               │
       │                                                    │
       │ 3. Sign Message with RSA Private Key              │
       │    signature = RSA_Sign(message, alice_private)   │
       │                                                    │
       │ 4. POST /api/keyexchange/initiate                │
       │──────────────────────────────────────────────────▶│
       │    { message + signature }                       │
       │                                                    │
       │                                                    │ 5. Poll /api/keyexchange/pending
       │                                                    │───────────────────────────────────▶
       │                                                    │    Server returns init message
       │                                                    │◀───────────────────────────────────
       │                                                    │
       │                                                    │ 6. Verify Signature
       │                                                    │    RSA_Verify(signature, alice_public)
       │                                                    │    ✅ Valid → Continue
       │                                                    │    ❌ Invalid → Reject + Log
       │                                                    │
       │                                                    │ 7. Generate ECDH Key Pair
       │                                                    │    { ecdhPublicKey_B, ecdhPrivateKey_B }
       │                                                    │
       │                                                    │ 8. Derive Shared Secret
       │                                                    │    sharedSecret = ECDH_Derive(
       │                                                    │      ecdhPrivateKey_B,
       │                                                    │      ecdhPublicKey_A
       │                                                    │    )
       │                                                    │
       │                                                    │ 9. Derive Session Key
       │                                                    │    sessionKey = SHA256(
       │                                                    │      sharedSecret +
       │                                                    │      alice_id +
       │                                                    │      bob_id +
       │                                                    │      timestamp
       │                                                    │    )
       │                                                    │
       │                                                    │ 10. Create Response Message
       │                                                    │     {                                               │
       │                                                    │       type: "KEY_EXCHANGE_RESPONSE",
       │                                                    │       senderId: "bob_id",
       │                                                    │       receiverId: "alice_id",
       │                                                    │       ecdhPublicKey: ecdhPublicKey_B,
       │                                                    │       timestamp: 1234567891,
       │                                                    │       nonce: "random_nonce_456"
       │                                                    │     }
       │                                                    │
       │                                                    │ 11. Sign Response
       │                                                    │     signature = RSA_Sign(response, bob_private)
       │                                                    │
       │                                                    │ 12. POST /api/keyexchange/respond
       │                                                    │───────────────────────────────────────────────────▶
       │                                                    │     { response + signature }
       │                                                    │
       │ 13. Poll /api/keyexchange/response/:id            │
       │──────────────────────────────────────────────────▶│
       │                                                    │
       │ 14. Server returns response                       │
       │◀──────────────────────────────────────────────────│
       │                                                    │
       │ 15. Verify Signature                              │
       │     RSA_Verify(signature, bob_public)             │
       │     ✅ Valid → Continue                           │
       │                                                    │
       │ 16. Derive Shared Secret                          │
       │     sharedSecret = ECDH_Derive(                   │
       │       ecdhPrivateKey_A,                           │
       │       ecdhPublicKey_B                             │
       │     )                                             │
       │                                                    │
       │ 17. Derive Session Key                            │
       │     sessionKey = SHA256(                          │
       │       sharedSecret +                              │
       │       alice_id +                                  │
       │       bob_id +                                    │
       │       timestamp                                   │
       │     )                                             │
       │                                                    │
       │ 18. Store Session Key (Memory, 7-day expiry)     │
       │                                                    │ 18. Store Session Key (Memory, 7-day expiry)
       │                                                    │
       │ ✅ Key Exchange Complete                          │ ✅ Key Exchange Complete
       │    Both have same session key                     │    Both have same session key
```

### Key Exchange Message Structure

```
Key Exchange Init Message:
{
  type: "KEY_EXCHANGE_INIT",
  senderId: "user_id",
  receiverId: "user_id",
  conversationId: "conv_id",
  ecdhPublicKey: "base64_encoded_key",
  timestamp: 1234567890,
  nonce: "random_nonce",
  deviceInfo: "user_agent",
  appVersion: "1.0.0",
  signature: "base64_encoded_signature"
}

Key Exchange Response Message:
{
  type: "KEY_EXCHANGE_RESPONSE",
  senderId: "user_id",
  receiverId: "user_id",
  conversationId: "conv_id",
  ecdhPublicKey: "base64_encoded_key",
  timestamp: 1234567891,
  nonce: "random_nonce",
  keyConfirmation: "hash_of_session_key",
  signature: "base64_encoded_signature"
}
```

---

## 2. Message Encryption/Decryption Flow

### Message Sending (Encryption)

```
User Input: "Hello Bob!"
  ↓
┌─────────────────────────────────────────┐
│         CLIENT-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Get Session Key                 │ │
│  │    sessionKey = getSessionKey(conv)│ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Generate Random IV (12 bytes) │ │
│  │    iv = crypto.getRandomValues() │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Encrypt with AES-256-GCM      │ │
│  │    {                              │ │
│  │      ciphertext,                 │ │
│  │      authTag                     │ │
│  │    } = AES_GCM_Encrypt(          │ │
│  │      "Hello Bob!",               │ │
│  │      sessionKey,                 │ │
│  │      iv                          │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. Generate Nonce                │ │
│  │    nonce = generateNonce()       │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 5. Get Sequence Number           │ │
│  │    seqNum = lastSeqNum + 1       │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
         POST /api/messages/send/:id
         {
           ciphertext: "base64...",
           iv: "base64...",
           authTag: "base64...",
           nonce: "hex...",
           timestamp: 1234567890,
           sequenceNumber: 5
         }
                  ↓
┌─────────────────────────────────────────┐
│         SERVER-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Validate Replay Protection    │ │
│  │    - Check nonce (not seen)     │ │
│  │    - Check timestamp (valid)    │ │
│  │    - Check sequence (valid)    │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Store Encrypted Message       │ │
│  │    MongoDB: {                    │ │
│  │      ciphertext,                 │ │
│  │      iv,                         │ │
│  │      authTag                     │ │
│  │    }                             │ │
│  │    NO PLAINTEXT STORED           │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Message Receiving (Decryption)

```
┌─────────────────────────────────────────┐
│         SERVER-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Get Encrypted Messages        │ │
│  │    MongoDB → Messages Collection │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
         GET /api/messages/:id
                  ↓
┌─────────────────────────────────────────┐
│         CLIENT-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Get Session Key               │ │
│  │    sessionKey = getSessionKey()  │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. For Each Message:             │ │
│  │    decryptMessage(               │ │
│  │      ciphertext,                 │ │
│  │      iv,                         │ │
│  │      authTag,                    │ │
│  │      sessionKey                  │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Verify Authentication Tag     │ │
│  │    AES_GCM_Decrypt automatically │ │
│  │    verifies authTag              │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. If Valid:                     │ │
│  │    Display: "Hello Bob!"         │ │
│  │  If Invalid:                     │ │
│  │    Display: "[Decryption failed]"│ │
│  │    Log to /api/security/         │ │
│  │      decryption-failure          │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 3. File Encryption/Decryption Flow

### File Upload Flow

```
User selects file: "document.pdf" (2MB)
  ↓
┌─────────────────────────────────────────┐
│         CLIENT-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Read File as ArrayBuffer      │ │
│  │    fileData = await file.arrayBuffer()│
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Get Session Key               │ │
│  │    sessionKey = getSessionKey()  │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Generate Random IV (12 bytes) │ │
│  │    iv = crypto.getRandomValues() │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. Encrypt File                  │ │
│  │    {                              │ │
│  │      ciphertext,                 │ │
│  │      authTag                     │ │
│  │    } = AES_GCM_Encrypt(          │ │
│  │      fileData,                   │ │
│  │      sessionKey,                 │ │
│  │      iv                          │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 5. Generate Nonce                │ │
│  │    nonce = generateNonce()       │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
         POST /api/files/upload/:id
         {
           ciphertext: "base64...",
           iv: "base64...",
           authTag: "base64...",
           originalFileName: "document.pdf",
           fileType: "application/pdf",
           fileSize: 2097152,
           nonce: "hex...",
           timestamp: 1234567890
         }
                  ↓
┌─────────────────────────────────────────┐
│         SERVER-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Validate Replay Protection   │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Store Encrypted File          │ │
│  │    MongoDB: {                    │ │
│  │      ciphertext,                 │ │
│  │      iv,                         │ │
│  │      authTag,                    │ │
│  │      originalFileName,           │ │
│  │      fileType,                   │ │
│  │      fileSize                    │ │
│  │    }                             │ │
│  │    NO PLAINTEXT FILE STORED      │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### File Download Flow

```
User clicks download
  ↓
┌─────────────────────────────────────────┐
│         CLIENT-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. GET /api/files/download/:id   │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         SERVER-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Verify Access                 │ │
│  │    Check: sender OR receiver     │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Get Encrypted File            │ │
│  │    MongoDB → Files Collection    │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
         Response: {
           ciphertext: "base64...",
           iv: "base64...",
           authTag: "base64...",
           originalFileName: "document.pdf",
           fileType: "application/pdf"
         }
                  ↓
┌─────────────────────────────────────────┐
│         CLIENT-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Get Session Key               │ │
│  │    sessionKey = getSessionKey()  │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Decrypt File                  │ │
│  │    fileData = AES_GCM_Decrypt(   │ │
│  │      ciphertext,                 │ │
│  │      iv,                         │ │
│  │      authTag,                    │ │
│  │      sessionKey                  │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Verify Authentication Tag     │ │
│  │    (Automatic in AES-GCM)        │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. Create Blob                   │ │
│  │    blob = new Blob([fileData],   │ │
│  │      { type: fileType })         │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 5. Trigger Download              │ │
│  │    Create <a> tag with blob URL  │ │
│  │    Click to download             │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 4. Replay Attack Protection Flow

### Replay Protection Validation

```
Message/File/Key Exchange Request
  ↓
┌─────────────────────────────────────────┐
│    Replay Protection Validation         │
│  ┌──────────────────────────────────┐ │
│  │ 1. Nonce Validation              │ │
│  │    if (seenNonces.has(nonce))    │ │
│  │      → REJECT (replay attack)    │ │
│  │    else                           │ │
│  │      → seenNonces.add(nonce)     │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Timestamp Validation          │ │
│  │    now = Date.now()              │ │
│  │    if (timestamp > now + 5min)   │ │
│  │      → REJECT (future timestamp) │ │
│  │    if (timestamp < now - 5min)   │ │
│  │      → REJECT (too old)          │ │
│  │    else                           │ │
│  │      → ACCEPT                    │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Sequence Number Validation    │ │
│  │    if (history.has(seqNum))      │ │
│  │      → REJECT (duplicate)        │ │
│  │    if (seqNum < lastSeq - 100)   │ │
│  │      → REJECT (too old)          │ │
│  │    else                           │ │
│  │      → history.set(seqNum)       │ │
│  │      → ACCEPT                    │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. All Valid?                    │ │
│  │    ✅ YES → Process Request      │ │
│  │    ❌ NO → Reject + Log Attack   │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 5. Authentication Flow

### Login Flow

```
User enters credentials
  ↓
┌─────────────────────────────────────────┐
│         CLIENT-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ POST /api/auth/login             │ │
│  │ { username, password }           │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         SERVER-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Find User in MongoDB          │ │
│  │    user = User.findOne({username})│
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Verify Password               │ │
│  │    bcrypt.compare(password,      │ │
│  │      user.password)              │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Generate JWT Token            │ │
│  │    token = jwt.sign({            │ │
│  │      userId: user._id            │ │
│  │    }, SECRET)                    │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. Log Authentication             │ │
│  │    logAuthenticationAttempt(     │ │
│  │      userId, username,            │ │
│  │      true, ipAddress              │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
         Response: {
           _id, username, fullName,
           profilePic, publicKey
         }
         + Set-Cookie: jwt=token
                  ↓
┌─────────────────────────────────────────┐
│         CLIENT-SIDE                     │
│  ┌──────────────────────────────────┐ │
│  │ 1. Store User Data               │ │
│  │    setAuthUser(userData)         │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Retrieve Private Key          │ │
│  │    privateKey = retrievePrivateKey│ │
│  │      (username)                  │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Verify Key Pair               │ │
│  │    verifyKeyPair(                │ │
│  │      privateKey,                │ │
│  │      publicKey                   │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. If Valid: Login Success       │ │
│  │    If Invalid: Error            │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 6. MITM Attack Prevention Flow

### MITM Attack Attempt

```
Attacker (Mallory) intercepts key exchange
  ↓
┌─────────────────────────────────────────┐
│         ATTACKER                         │
│  ┌──────────────────────────────────┐ │
│  │ 1. Intercept Init Message        │ │
│  │    Original: ecdhPublicKey_A     │ │
│  │                                  │ │
│  │ 2. Replace with Attacker's Key   │ │
│  │    Modified: ecdhPublicKey_M     │ │
│  │    (Signature unchanged)         │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
└─────────────────────────────────────────┘
                  ↓
         Forward to Bob
                  ↓
┌─────────────────────────────────────────┐
│         BOB (Victim)                    │
│  ┌──────────────────────────────────┐ │
│  │ 1. Receive Modified Message     │ │
│  │    {                              │ │
│  │      ecdhPublicKey: ecdhPublicKey_M,│
│  │      signature: original_signature  │
│  │    }                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Verify Signature              │ │
│  │    RSA_Verify(                    │ │
│  │      signature,                  │ │
│  │      alice_publicKey,            │ │
│  │      modified_message            │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Signature Verification        │ │
│  │    ❌ FAILS                      │ │
│  │    (Signature was for original   │ │
│  │     message, not modified one)   │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 4. Reject Message                │ │
│  │    Return: 400 Bad Request       │ │
│  │    Error: "Invalid signature"    │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 5. Log Attack                     │ │
│  │    logInvalidSignature(           │ │
│  │      conversationId,              │ │
│  │      userId,                      │ │
│  │      { attackType: "MITM" }       │ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ✅ Attack Prevented                    │
│     Key exchange aborted                │
└─────────────────────────────────────────┘
```

---

## 7. Complete Message Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    MESSAGE LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. USER INPUT
   "Hello Bob!"
   ↓
2. CLIENT-SIDE ENCRYPTION
   Session Key + AES-256-GCM
   → Ciphertext + IV + Auth Tag
   ↓
3. REPLAY PROTECTION
   Add: Nonce + Timestamp + Sequence Number
   ↓
4. TRANSMISSION
   HTTPS POST /api/messages/send/:id
   ↓
5. SERVER VALIDATION
   - Replay protection check
   - Access control
   ↓
6. STORAGE
   MongoDB (ciphertext only)
   ↓
7. RETRIEVAL
   GET /api/messages/:id
   ↓
8. CLIENT-SIDE DECRYPTION
   Session Key + AES-256-GCM
   → Plaintext "Hello Bob!"
   ↓
9. DISPLAY
   Show decrypted message in UI
```

---

## 8. Security Event Logging Flow

```
Security Event Occurs
  ↓
┌─────────────────────────────────────────┐
│    securityLogger.js                    │
│  ┌──────────────────────────────────┐ │
│  │ 1. Format Log Entry              │ │
│  │    {                              │ │
│  │      timestamp: ISO string,      │ │
│  │      level: INFO/WARN/ERROR,     │ │
│  │      category: EVENT_TYPE,       │ │
│  │      message: description,       │ │
│  │      ...metadata                 │ │
│  │    }                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 2. Write to Log File             │ │
│  │    fs.appendFileSync(            │ │
│  │      'backend/logs/security.log', │ │
│  │      JSON.stringify(entry) + '\n'│ │
│  │    )                             │ │
│  └──────────────────────────────────┘ │
│                  ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ 3. Console Log (Optional)       │ │
│  │    console.log('[EVENT]', ...)   │ │
│  └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
                  ↓
         Log File: backend/logs/security.log
         Format: JSON Lines (one JSON per line)
```

---

## Summary

All protocol flows documented:
- ✅ Key Exchange Protocol (complete sequence)
- ✅ Message Encryption/Decryption
- ✅ File Encryption/Decryption
- ✅ Replay Attack Protection
- ✅ Authentication Flow
- ✅ MITM Attack Prevention
- ✅ Message Lifecycle
- ✅ Security Event Logging

**Status**: Protocol flow diagrams complete ✅
