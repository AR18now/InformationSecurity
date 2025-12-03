# MITM (Man-in-the-Middle) Attack Demonstration

## Overview

This document demonstrates Man-in-the-Middle (MITM) attacks on the key exchange protocol and shows how digital signatures prevent these attacks.

---

## What is a MITM Attack?

A Man-in-the-Middle attack occurs when an attacker intercepts and potentially modifies communication between two parties without their knowledge. In key exchange protocols:

1. **Attacker intercepts** key exchange messages
2. **Attacker replaces** public keys with their own
3. **Attacker can decrypt** all messages between the two parties
4. **Victims think** they're communicating securely with each other

---

## Attack Scenario: Key Exchange Without Signatures

### Step-by-Step Attack Flow

```
Alice                    Attacker (Mallory)              Bob
  |                           |                            |
  |-- Key Exchange Init ----->|                            |
  |   (ECDH public key)        |                            |
  |                           |-- Modified Init ---------->|
  |                           |   (Attacker's ECDH key)   |
  |                           |                            |-- Accepts (no signature check)
  |                           |<-- Response ----------------|
  |                           |   (Bob's ECDH key)         |
  |<-- Modified Response -----|                            |
  |   (Attacker's ECDH key)   |                            |
  |                           |                            |
  |-- Encrypted Message ----->|                            |
  |                           |-- Decrypt & Read --------->|
  |                           |   (Has both session keys)  |
  |                           |<-- Modified Message -------|
  |<-- Encrypted Message -----|                            |
```

### What Happens:

1. **Alice** sends her ECDH public key to Bob
2. **Attacker (Mallory)** intercepts the message
3. **Attacker** replaces Alice's ECDH public key with their own
4. **Bob** receives attacker's key (thinks it's from Alice)
5. **Bob** sends his ECDH public key to Alice
6. **Attacker** intercepts and replaces with their own key
7. **Alice** receives attacker's key (thinks it's from Bob)
8. **Result**: Attacker can derive session keys with both Alice and Bob
9. **Attacker** can decrypt, read, and modify all messages

### Why It Works Without Signatures:

- No way to verify message authenticity
- No way to detect if message was modified
- Both parties accept attacker's keys as legitimate

---

## Protection: Digital Signatures

### How Signatures Prevent MITM Attacks

Digital signatures use RSA public-key cryptography to:
1. **Sign** messages with sender's private key
2. **Verify** signatures with sender's public key
3. **Detect** any modifications to the message

### Protected Key Exchange Flow

```
Alice                    Attacker (Mallory)              Bob
  |                           |                            |
  |-- Key Exchange Init ----->|                            |
  |   (ECDH key + Signature)  |                            |
  |                           |-- Modified Init ---------->|
  |                           |   (Attacker's key)         |
  |                           |   (Original signature)     |
  |                           |                            |-- Verify Signature
  |                           |                            |   ❌ FAILS (doesn't match)
  |                           |                            |-- REJECT Message
  |                           |                            |-- Log Attack Attempt
```

### What Happens:

1. **Alice** sends ECDH public key + RSA signature
2. **Attacker** intercepts and modifies (replaces ECDH key)
3. **Bob** receives modified message
4. **Bob** verifies signature using Alice's public key
5. **Signature verification FAILS** (signature was for original message, not modified one)
6. **Bob** rejects the message
7. **Attack is logged** for security auditing
8. **Result**: Attack fails, communication remains secure

---

## Demonstration Scripts

### 1. Run MITM Attack Demonstration

```bash
cd backend
node scripts/mitmAttacker.js
```

**Output:**
- Shows attack scenario without signatures (attack succeeds)
- Shows attack scenario with signatures (attack fails)
- Compares both scenarios

### 2. Run MITM Tests

```bash
cd backend
node scripts/mitmTest.js
```

**Output:**
- Tests signature verification
- Tests attack detection
- Tests security logging

---

## Manual Testing

### Test 1: Attempt MITM Attack

1. **Start the server:**
   ```bash
   cd backend
   npm start
   ```

2. **Open browser DevTools (F12)**

3. **Intercept a key exchange:**
   - Go to Network tab
   - Start a conversation (triggers key exchange)
   - Find the key exchange request

4. **Modify the message:**
   - Copy the request payload
   - Modify the `ecdhPublicKey` field
   - Try to resend the modified message

5. **Expected Result:**
   - Request rejected (400 Bad Request)
   - Error: "Invalid signature" or "Signature verification failed"
   - Attack logged in `backend/logs/security.log`

### Test 2: Verify Signature Verification

1. **Check key exchange implementation:**
   - Open `frontend/src/utils/keyExchange.js`
   - Find `validateKeyExchangeInit` function
   - Verify it checks signatures

2. **Check backend validation:**
   - Open `backend/controllers/keyExchange.controller.js`
   - Verify signature verification is performed

3. **Expected Behavior:**
   - All key exchange messages must have valid signatures
   - Modified messages are rejected
   - Invalid signatures are logged

---

## Code Examples

### Example 1: Vulnerable Key Exchange (No Signatures)

```javascript
// ❌ VULNERABLE: No signature verification
export async function vulnerableKeyExchange(message) {
    // Accept ECDH key without verification
    const ecdhKey = message.ecdhPublicKey;
    
    // Attacker can replace this key!
    // No way to detect modification
    
    return { success: true, key: ecdhKey };
}
```

**Problem:** Attacker can replace the ECDH key, and there's no way to detect it.

### Example 2: Protected Key Exchange (With Signatures)

```javascript
// ✅ PROTECTED: Signature verification
export async function protectedKeyExchange(message, senderPublicKey) {
    // Verify signature first
    const isValid = await verifySignature(
        senderPublicKey,
        message.signature,
        message // Original message content
    );
    
    if (!isValid) {
        // Reject if signature is invalid
        logInvalidSignature(message.conversationId);
        throw new Error("Invalid signature - possible MITM attack");
    }
    
    // Only proceed if signature is valid
    const ecdhKey = message.ecdhPublicKey;
    return { success: true, key: ecdhKey };
}
```

**Protection:** Signature verification ensures message authenticity and integrity.

---

## Security Logs

### Log Entry for MITM Attack Attempt

When a MITM attack is detected, the following is logged to `backend/logs/security.log`:

```json
{
  "timestamp": "2025-01-27T15:30:00.000Z",
  "level": "WARN",
  "category": "INVALID_SIGNATURE",
  "message": "Invalid signature detected in key exchange",
  "conversationId": "conv-123",
  "details": {
    "reason": "Signature verification failed",
    "attackType": "MITM",
    "senderId": "alice_id",
    "receiverId": "bob_id"
  }
}
```

### View Logs

```bash
# View all security logs
cat backend/logs/security.log

# Filter for MITM attacks
grep "INVALID_SIGNATURE" backend/logs/security.log

# Real-time monitoring
tail -f backend/logs/security.log | grep "MITM\|INVALID_SIGNATURE"
```

---

## BurpSuite Integration (Optional)

### Setup BurpSuite for MITM Testing

1. **Install BurpSuite Community Edition**

2. **Configure Proxy:**
   - BurpSuite → Proxy → Options
   - Set proxy listener (e.g., 127.0.0.1:8080)

3. **Configure Browser:**
   - Set HTTP proxy to BurpSuite's listener
   - Install BurpSuite CA certificate

4. **Intercept Key Exchange:**
   - Enable Proxy interception
   - Start a conversation
   - Intercept the key exchange request
   - Modify the `ecdhPublicKey` field
   - Forward the modified request

5. **Expected Result:**
   - Request rejected by server
   - Error in response: "Invalid signature"
   - Attack logged

### BurpSuite Screenshots

**Note:** Take screenshots showing:
- Intercepted key exchange request
- Modified ECDH public key
- Server rejection response
- Security log entry

---

## Comparison Table

| Aspect | Without Signatures | With Signatures |
|--------|-------------------|-----------------|
| **Attack Success** | ✅ Succeeds | ❌ Fails |
| **Message Authenticity** | ❌ Not verified | ✅ Verified |
| **Message Integrity** | ❌ Not protected | ✅ Protected |
| **Attack Detection** | ❌ Not detected | ✅ Detected & logged |
| **Session Key Security** | ❌ Compromised | ✅ Secure |

---

## Key Takeaways

### ✅ Why Signatures Are Essential:

1. **Authenticity**: Verify message came from claimed sender
2. **Integrity**: Detect if message was modified
3. **Non-repudiation**: Sender cannot deny sending message
4. **Attack Detection**: Identify and log MITM attempts

### ❌ Without Signatures:

1. **No authenticity verification** - Anyone can claim to be anyone
2. **No integrity protection** - Messages can be modified undetected
3. **MITM attacks succeed** - Attacker can intercept and decrypt all communication
4. **No attack detection** - Attacks go unnoticed

---

## Implementation Details

### Our Implementation:

1. **RSA Signatures**: RSASSA-PKCS1-v1_5 algorithm
2. **Signature on Key Exchange**: All key exchange messages are signed
3. **Verification on Receipt**: All received messages are verified
4. **Rejection on Failure**: Invalid signatures cause message rejection
5. **Security Logging**: All invalid signatures are logged

### Files Involved:

- `frontend/src/utils/keyExchange.js` - Signature creation and verification
- `backend/controllers/keyExchange.controller.js` - Backend validation
- `backend/utils/securityLogger.js` - Attack logging
- `backend/scripts/mitmAttacker.js` - Demonstration script

---

## Testing Checklist

- [ ] Run MITM attack demonstration script
- [ ] Verify attack fails with signatures
- [ ] Verify attack succeeds without signatures (vulnerable scenario)
- [ ] Check security logs for attack attempts
- [ ] Test manual MITM attack via browser DevTools
- [ ] Test with BurpSuite (optional)
- [ ] Document findings with screenshots

---

## Conclusion

**Digital signatures are essential for preventing MITM attacks in key exchange protocols.**

✅ **With signatures**: MITM attacks are detected and prevented  
❌ **Without signatures**: MITM attacks succeed, compromising all communication

Our implementation includes:
- ✅ RSA signature creation on all key exchange messages
- ✅ Signature verification on all received messages
- ✅ Rejection of messages with invalid signatures
- ✅ Security logging of all attack attempts

---

**Status**: MITM attack demonstration complete ✅

**Next Steps**: 
1. Run the demonstration scripts
2. Test manually with browser DevTools
3. Document findings with screenshots
4. Include in project report
