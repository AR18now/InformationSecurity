# Replay Attack Demonstration

## Overview

This document demonstrates replay attacks and how the system protects against them using:
- **Nonces** (Number Used Once)
- **Timestamps** (with tolerance window)
- **Sequence Numbers** (monotonically increasing)

---

## What is a Replay Attack?

A replay attack occurs when an attacker intercepts a valid message and retransmits it later to achieve unauthorized access or actions. For example:
- An attacker captures an encrypted message
- They retransmit the same message later
- The system accepts it as a new, valid message

---

## Protection Mechanisms

### 1. **Nonces (Number Used Once)**
- Each message includes a unique random nonce
- Server tracks all seen nonces per conversation
- If a nonce is seen twice, it's rejected as a replay

### 2. **Timestamps**
- Each message includes a timestamp
- Server validates timestamp is within tolerance window (5 minutes)
- Messages with timestamps too old or in the future are rejected

### 3. **Sequence Numbers**
- Messages have monotonically increasing sequence numbers
- Server tracks the last sequence number per conversation
- Duplicate or out-of-order sequence numbers are rejected

---

## Demonstration Script

### Setup

1. **Start the server:**
   ```bash
   cd backend
   npm start
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Create two test users:**
   - User A: `alice` / `password123`
   - User B: `bob` / `password123`

### Test 1: Normal Message Flow (Protected)

1. Login as Alice
2. Start a conversation with Bob
3. Send a message: "Hello Bob!"
4. **Result**: Message is accepted ✅

### Test 2: Replay Attack - Duplicate Nonce

**Attack Scenario**: Attacker intercepts a message and tries to replay it with the same nonce.

**Steps:**
1. Send a message from Alice to Bob
2. Capture the message data (nonce, timestamp, sequence number)
3. Try to send the exact same message again
4. **Result**: Rejected with error "Replay attack detected: Invalid or duplicate nonce" ❌

**Code Example:**
```javascript
// First message (accepted)
const message1 = {
    ciphertext: "...",
    iv: "...",
    authTag: "...",
    nonce: "abc123",
    timestamp: 1234567890,
    sequenceNumber: 1
};

// Replay attempt (rejected)
const message2 = {
    ...message1  // Same nonce!
};
// Server detects duplicate nonce and rejects
```

### Test 3: Replay Attack - Old Timestamp

**Attack Scenario**: Attacker tries to replay an old message.

**Steps:**
1. Send a message with current timestamp
2. Wait 10 minutes
3. Try to replay the same message with the old timestamp
4. **Result**: Rejected with error "Replay attack detected: Invalid timestamp (outside tolerance window or future timestamp)" ❌

**Code Example:**
```javascript
// Original message
const message1 = {
    timestamp: Date.now(), // Current time
    // ... other fields
};

// Replay attempt 10 minutes later
const message2 = {
    ...message1,
    timestamp: message1.timestamp // Old timestamp (10 minutes ago)
};
// Server detects timestamp is too old (outside 5-minute window)
```

### Test 4: Replay Attack - Duplicate Sequence Number

**Attack Scenario**: Attacker tries to replay a message with a sequence number that was already used.

**Steps:**
1. Send message with sequenceNumber: 5
2. Send another message with sequenceNumber: 6
3. Try to replay the message with sequenceNumber: 5
4. **Result**: Rejected with error "Replay attack detected: Invalid sequence number (duplicate or outside window)" ❌

**Code Example:**
```javascript
// First message
const message1 = {
    sequenceNumber: 5,
    // ... other fields
};

// Second message
const message2 = {
    sequenceNumber: 6,
    // ... other fields
};

// Replay attempt
const message3 = {
    ...message1, // Same sequenceNumber: 5
};
// Server detects duplicate sequence number
```

### Test 5: Replay Attack - Out-of-Order Sequence

**Attack Scenario**: Attacker tries to replay a very old message.

**Steps:**
1. Send messages with sequenceNumbers: 1, 2, 3, ..., 100
2. Try to replay message with sequenceNumber: 1 (very old)
3. **Result**: Rejected (sequence number is outside the window) ❌

---

## Manual Testing with Browser DevTools

### Step 1: Intercept a Message

1. Open browser DevTools (F12)
2. Go to Network tab
3. Send a message in the chat
4. Find the POST request to `/api/messages/send/:id`
5. Copy the request payload

### Step 2: Attempt Replay

1. In DevTools Console, run:
```javascript
// Get the intercepted message data
const interceptedMessage = {
    ciphertext: "...", // From Network tab
    iv: "...",
    authTag: "...",
    nonce: "...", // Same nonce
    messageTimestamp: 1234567890, // Same timestamp
    sequenceNumber: 1 // Same sequence number
};

// Try to replay
fetch('/api/messages/send/CONVERSATION_ID', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        // Include auth cookie
    },
    body: JSON.stringify(interceptedMessage)
})
.then(res => res.json())
.then(data => console.log('Result:', data));
```

**Expected Result**: Error message indicating replay attack detected.

---

## Automated Test Script

Create a test file: `backend/tests/replayAttack.test.js`

```javascript
import { validateReplayProtection, generateNonce, resetReplayProtection } from '../utils/replayProtection.js';

describe('Replay Attack Protection', () => {
    const conversationId = 'test-conversation-123';

    beforeEach(() => {
        resetReplayProtection(conversationId);
    });

    test('Should accept valid message', () => {
        const nonce = generateNonce();
        const timestamp = Date.now();
        const sequenceNumber = 1;

        const result = validateReplayProtection(
            conversationId,
            nonce,
            timestamp,
            sequenceNumber,
            'msg-1'
        );

        expect(result.valid).toBe(true);
    });

    test('Should reject duplicate nonce', () => {
        const nonce = generateNonce();
        const timestamp = Date.now();
        const sequenceNumber = 1;

        // First message - should pass
        const result1 = validateReplayProtection(
            conversationId,
            nonce,
            timestamp,
            sequenceNumber,
            'msg-1'
        );
        expect(result1.valid).toBe(true);

        // Replay with same nonce - should fail
        const result2 = validateReplayProtection(
            conversationId,
            nonce, // Same nonce!
            timestamp + 1000,
            sequenceNumber + 1,
            'msg-2'
        );
        expect(result2.valid).toBe(false);
        expect(result2.reason).toContain('nonce');
    });

    test('Should reject old timestamp', () => {
        const nonce = generateNonce();
        const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
        const sequenceNumber = 1;

        const result = validateReplayProtection(
            conversationId,
            nonce,
            oldTimestamp,
            sequenceNumber,
            'msg-1'
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('timestamp');
    });

    test('Should reject duplicate sequence number', () => {
        const nonce1 = generateNonce();
        const nonce2 = generateNonce();
        const timestamp = Date.now();
        const sequenceNumber = 1;

        // First message
        const result1 = validateReplayProtection(
            conversationId,
            nonce1,
            timestamp,
            sequenceNumber,
            'msg-1'
        );
        expect(result1.valid).toBe(true);

        // Replay with same sequence number
        const result2 = validateReplayProtection(
            conversationId,
            nonce2,
            timestamp + 1000,
            sequenceNumber, // Same sequence number!
            'msg-2'
        );
        expect(result2.valid).toBe(false);
        expect(result2.reason).toContain('sequence');
    });
});
```

Run tests:
```bash
npm test
```

---

## Logging

All replay attack attempts are logged to `backend/logs/security.log`:

```json
{
  "timestamp": "2025-01-27T10:30:00.000Z",
  "level": "WARN",
  "category": "REPLAY_ATTACK",
  "message": "Replay attack detected",
  "conversationId": "conv-123",
  "attackType": "nonce",
  "details": {
    "nonce": "abc123",
    "reason": "Duplicate nonce detected"
  }
}
```

View logs:
```bash
tail -f backend/logs/security.log | grep REPLAY_ATTACK
```

---

## Summary

✅ **Protection Mechanisms:**
- Nonces prevent duplicate message replay
- Timestamps prevent old message replay
- Sequence numbers prevent out-of-order replay

✅ **Attack Scenarios Tested:**
- Duplicate nonce → Rejected
- Old timestamp → Rejected
- Duplicate sequence number → Rejected
- Out-of-order sequence → Rejected

✅ **Logging:**
- All replay attempts are logged
- Security logs available for auditing

---

## Next Steps

1. **Test the protection mechanisms** using the scenarios above
2. **Review security logs** to see replay attempts
3. **Document any issues** found during testing
4. **Consider additional protections** if needed (e.g., rate limiting)

---

**Status**: Replay attack protection is fully implemented and ready for testing! ✅
