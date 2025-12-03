# Secure Key Exchange Protocol - Design Guide

## 📚 Understanding the Requirements

Your assignment requires:
1. **Diffie-Hellman (DH) OR Elliptic Curve Diffie-Hellman (ECDH)** - For key agreement
2. **Digital Signatures** - To prevent MITM attacks
3. **Session Key Derivation** - Using HKDF or SHA-256
4. **Key Confirmation** - Final message to confirm both parties have the same key
5. **Your Own Variant** - Must be unique, not copied from textbooks

---

## 🎓 Core Concepts Explained

### 1. **ECDH (Elliptic Curve Diffie-Hellman)**

**What it does:**
- Two parties (Alice and Bob) can agree on a shared secret without transmitting it
- Each party generates a private/public key pair
- They exchange public keys
- Each computes the same shared secret using their private key + other's public key

**Why ECDH over RSA?**
- More efficient (smaller keys for same security)
- Perfect for session key generation
- Web Crypto API supports it natively

**How it works:**
```
Alice:                    Bob:
1. Generate key pair     1. Generate key pair
   (privateA, publicA)      (privateB, publicB)
2. Send publicA ────────> 2. Receive publicA
3. Receive publicB <─────── 3. Send publicB
4. Compute:               4. Compute:
   shared = ECDH(          shared = ECDH(
     privateA,               privateB,
     publicB                 publicA
   )                       )
   Both get the SAME shared secret!
```

### 2. **Digital Signatures**

**What they do:**
- Prove that a message came from a specific person
- Prevent tampering (if message changes, signature becomes invalid)
- Prevent MITM attacks (attacker can't forge signatures without private key)

**How they work:**
```
Sender:
1. Create message
2. Sign message with private key → signature
3. Send (message + signature)

Receiver:
1. Receive (message + signature)
2. Verify signature using sender's public key
3. If valid → message is authentic
4. If invalid → reject (possible attack)
```

**For Key Exchange:**
- Sign the ECDH public key with RSA private key
- Receiver verifies signature with sender's RSA public key
- This proves the ECDH key came from the real sender

### 3. **Session Key Derivation (HKDF or SHA-256)**

**What it does:**
- Takes the shared secret from ECDH
- Derives a proper encryption key for AES-256-GCM
- Adds additional data (like user IDs) for uniqueness

**HKDF Structure:**
```
Input: sharedSecret (from ECDH)
Step 1: Extract (add salt/randomness)
Step 2: Expand (derive final key with info)
Output: sessionKey (for AES encryption)
```

**SHA-256 Alternative:**
```
sessionKey = SHA-256(sharedSecret + senderID + receiverID + timestamp)
```

### 4. **Key Confirmation**

**What it does:**
- Final step to prove both parties computed the same session key
- Prevents certain attacks where keys might differ

**How it works:**
```
Alice:                    Bob:
1. Compute sessionKey     1. Compute sessionKey
2. Encrypt test message   2. Receive encrypted test
   with sessionKey       3. Decrypt with sessionKey
3. Send to Bob ────────> 4. If decryption works:
4. Receive confirmation     Send confirmation
   <───────────────────── 5. If confirmation matches:
                             Key exchange successful!
```

---

## 🎨 Designing YOUR Protocol

### Step 1: Choose Your Components

**Option A: ECDH + RSA Signatures (Recommended)**
- Use ECDH for key agreement (fast, efficient)
- Use existing RSA keys for signatures (you already have them)
- Derive session key with HKDF or SHA-256

**Option B: Pure ECDH with ECDSA**
- Use ECDH for key agreement
- Generate separate ECDSA keys for signatures
- More complex but more efficient

**Recommendation: Option A** (uses your existing RSA keys)

---

### Step 2: Design Message Flow

Here's a suggested flow (YOU should modify this to make it unique):

```
Phase 1: Initiation
-----------
Alice wants to chat with Bob
1. Alice requests Bob's public key from server
2. Server returns Bob's RSA public key

Phase 2: Key Exchange
-----------
3. Alice generates ECDH key pair (ephemeral)
4. Alice signs her ECDH public key with her RSA private key
5. Alice sends to Bob:
   {
     ecdhPublicKey: "...",
     signature: "...",
     timestamp: 1234567890,
     nonce: "random123"
   }

6. Bob receives message
7. Bob verifies signature using Alice's RSA public key
8. If valid:
   - Bob generates his own ECDH key pair
   - Bob computes shared secret
   - Bob signs his ECDH public key
   - Bob sends back to Alice:
     {
       ecdhPublicKey: "...",
       signature: "...",
       timestamp: 1234567891,
       nonce: "random456"
     }

Phase 3: Session Key Derivation
-----------
9. Alice receives Bob's message
10. Alice verifies Bob's signature
11. Alice computes shared secret
12. Both compute session key:
    sessionKey = HKDF(sharedSecret, senderID + receiverID + timestamp)

Phase 4: Key Confirmation
-----------
13. Alice encrypts confirmation message with sessionKey:
    confirmation = AES-GCM-encrypt("KEY_CONFIRMED", sessionKey)
14. Alice sends to Bob
15. Bob decrypts and verifies
16. Bob sends confirmation back
17. If both confirmations match → Key exchange complete!
```

---

### Step 3: Make It Unique

**Ways to make your protocol unique:**

1. **Custom Message Structure**
   - Add your own fields (e.g., sessionID, version number)
   - Use different field names
   - Add metadata specific to your app

2. **Custom Key Derivation**
   - Add unique salt generation method
   - Include conversation ID in derivation
   - Add multiple rounds of hashing

3. **Custom Confirmation Method**
   - Use a specific confirmation message format
   - Add timestamp validation
   - Include sequence numbers

4. **Additional Security Features**
   - Add replay protection (nonces, timestamps)
   - Add key expiration
   - Add mutual authentication steps

---

## 📋 Implementation Checklist

### Frontend Components Needed:

1. **ECDH Key Generation**
   - Generate ephemeral ECDH key pairs
   - Export/import ECDH public keys

2. **Digital Signatures**
   - Sign messages with RSA private key
   - Verify signatures with RSA public key

3. **Session Key Derivation**
   - Implement HKDF or SHA-256 derivation
   - Store session keys securely

4. **Key Exchange Flow**
   - Initiate key exchange
   - Handle incoming key exchange messages
   - Complete key confirmation

5. **Session Key Storage**
   - Store session keys per conversation
   - Manage key lifecycle

### Backend Components Needed:

1. **Key Exchange Endpoint**
   - Receive key exchange messages
   - Forward to recipient
   - Store key exchange state (optional)

2. **Public Key Retrieval**
   - Endpoint to get user's public key
   - Return RSA public key for signature verification

---

## 🔧 Web Crypto API Functions You'll Need

### ECDH Key Generation:
```javascript
// Generate ECDH key pair
const keyPair = await window.crypto.subtle.generateKey(
  {
    name: "ECDH",
    namedCurve: "P-256"  // or "P-384"
  },
  true,  // extractable
  ["deriveKey", "deriveBits"]
);
```

### ECDH Key Derivation:
```javascript
// Derive shared secret
const sharedSecret = await window.crypto.subtle.deriveBits(
  {
    name: "ECDH",
    public: otherPartyPublicKey
  },
  myPrivateKey,
  256  // 256 bits = 32 bytes
);
```

### Digital Signatures:
```javascript
// Sign data
const signature = await window.crypto.subtle.sign(
  {
    name: "RSA-PSS",  // or "RSASSA-PKCS1-v1_5"
    saltLength: 32
  },
  privateKey,
  dataToSign
);

// Verify signature
const isValid = await window.crypto.subtle.verify(
  {
    name: "RSA-PSS",
    saltLength: 32
  },
  publicKey,
  signature,
  dataToVerify
);
```

### HKDF (Key Derivation):
```javascript
// Derive session key using HKDF
const sessionKey = await window.crypto.subtle.deriveKey(
  {
    name: "HKDF",
    hash: "SHA-256",
    salt: saltArray,
    info: additionalData
  },
  baseKey,  // from ECDH
  {
    name: "AES-GCM",
    length: 256
  },
  true,
  ["encrypt", "decrypt"]
);
```

---

## 📝 Pseudocode for Your Implementation

### Step 1: Initiate Key Exchange
```
FUNCTION initiateKeyExchange(receiverId):
  1. Get receiver's public key from server
  2. Generate ephemeral ECDH key pair
  3. Export ECDH public key
  4. Create message:
     - ecdhPublicKey
     - timestamp
     - nonce
  5. Sign message with my RSA private key
  6. Send to receiver via server
  7. Store my ECDH private key temporarily
END FUNCTION
```

### Step 2: Handle Incoming Key Exchange
```
FUNCTION handleKeyExchangeMessage(message, senderId):
  1. Get sender's RSA public key from server
  2. Verify signature on message
  3. IF signature invalid:
       REJECT and log error
  4. Generate my ECDH key pair
  5. Compute shared secret using:
     - My ECDH private key
     - Sender's ECDH public key
  6. Sign my ECDH public key
  7. Send response to sender
  8. Derive session key from shared secret
  9. Store session key for this conversation
END FUNCTION
```

### Step 3: Derive Session Key
```
FUNCTION deriveSessionKey(sharedSecret, senderId, receiverId, timestamp):
  1. Create additional data string:
     additionalData = senderId + receiverId + timestamp
  2. Convert to ArrayBuffer
  3. Use HKDF or SHA-256:
     IF using HKDF:
       sessionKey = HKDF(sharedSecret, salt, additionalData)
     ELSE:
       sessionKey = SHA-256(sharedSecret + additionalData)
  4. Return session key
END FUNCTION
```

### Step 4: Key Confirmation
```
FUNCTION confirmKeyExchange(sessionKey, otherPartyId):
  1. Create confirmation message:
     confirmation = "KEY_CONFIRMED_" + timestamp + nonce
  2. Encrypt with sessionKey using AES-GCM
  3. Send encrypted confirmation
  4. Wait for response
  5. Decrypt response
  6. IF decryption successful:
       Key exchange complete!
   ELSE:
       Key exchange failed
END FUNCTION
```

---

## 🎯 Next Steps for You

1. **Read this guide carefully** - Understand each concept
2. **Design your unique protocol** - Modify the flow above
3. **Draw your message flow diagram** - Visualize the protocol
4. **Start implementing step by step** - One function at a time
5. **Test each component** - Verify it works before moving on
6. **Ask me questions** - If you get stuck, I'll help debug

---

## 📚 Resources to Study

1. **Web Crypto API Documentation:**
   - https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
   - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto

2. **ECDH Explanation:**
   - Search: "Elliptic Curve Diffie-Hellman explained"
   - Focus on how shared secrets are computed

3. **Digital Signatures:**
   - Search: "RSA digital signatures Web Crypto API"
   - Understand sign/verify operations

4. **HKDF:**
   - Search: "HKDF key derivation function"
   - Understand extract-then-expand

---

## ⚠️ Important Notes

1. **Make it YOURS** - Modify the protocol to be unique
2. **Test thoroughly** - Key exchange is critical
3. **Handle errors** - What if signature verification fails?
4. **Store keys securely** - Session keys in IndexedDB
5. **Document everything** - You need to explain it in your report

---

**Ready to start?** Let me know when you've:
1. Read and understood the concepts
2. Designed your protocol flow
3. Started implementing

I'll help you debug and improve your code as you write it!

