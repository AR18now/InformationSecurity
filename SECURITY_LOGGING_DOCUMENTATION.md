# Security Logging & Auditing - Documentation

## Overview

The system includes comprehensive security logging and auditing capabilities to track all security-related events, detect attacks, and maintain compliance.

---

## Logged Events

### 1. **Authentication Attempts**
- **Category**: `AUTHENTICATION`
- **Levels**: `INFO` (success), `WARN` (failure)
- **Logged When**: User login attempts (successful or failed)
- **Data Logged**:
  - User ID
  - Username
  - Success/failure status
  - IP address
  - Timestamp

**Example Log Entry:**
```json
{
  "timestamp": "2025-01-27T10:30:00.000Z",
  "level": "WARN",
  "category": "AUTHENTICATION",
  "message": "Failed login attempt",
  "userId": "user123",
  "username": "alice",
  "success": false,
  "ipAddress": "192.168.1.100"
}
```

### 2. **Key Exchange Attempts**
- **Category**: `KEY_EXCHANGE`
- **Levels**: `INFO` (success), `WARN` (failure)
- **Logged When**: Key exchange initiation or response
- **Data Logged**:
  - Sender ID
  - Receiver ID
  - Conversation ID
  - Success/failure status
  - Error details (if failed)

**Example Log Entry:**
```json
{
  "timestamp": "2025-01-27T10:35:00.000Z",
  "level": "INFO",
  "category": "KEY_EXCHANGE",
  "message": "Key exchange successful",
  "senderId": "user123",
  "receiverId": "user456",
  "conversationId": "conv-789",
  "success": true
}
```

### 3. **Decryption Failures**
- **Category**: `DECRYPTION`
- **Level**: `ERROR`
- **Logged When**: Client-side decryption fails
- **Data Logged**:
  - Message ID
  - User ID
  - Conversation ID
  - Error details

**Example Log Entry:**
```json
{
  "timestamp": "2025-01-27T10:40:00.000Z",
  "level": "ERROR",
  "category": "DECRYPTION",
  "message": "Failed to decrypt message",
  "messageId": "msg-123",
  "userId": "user123",
  "conversationId": "conv-789",
  "error": "Decryption failed - invalid key"
}
```

### 4. **Replay Attack Detection**
- **Category**: `REPLAY_ATTACK`
- **Level**: `WARN`
- **Logged When**: Replay attack detected (duplicate nonce, timestamp, or sequence number)
- **Data Logged**:
  - Conversation ID
  - Attack type (nonce, timestamp, sequence)
  - Attack details

**Example Log Entry:**
```json
{
  "timestamp": "2025-01-27T10:45:00.000Z",
  "level": "WARN",
  "category": "REPLAY_ATTACK",
  "message": "Replay attack detected",
  "conversationId": "conv-789",
  "attackType": "nonce",
  "nonce": "abc123",
  "reason": "Duplicate nonce detected"
}
```

### 5. **Invalid Signature Detection**
- **Category**: `INVALID_SIGNATURE`
- **Level**: `WARN`
- **Logged When**: Signature verification fails (possible MITM attack)
- **Data Logged**:
  - Conversation ID
  - User ID
  - Attack type
  - Reason

**Example Log Entry:**
```json
{
  "timestamp": "2025-01-27T10:50:00.000Z",
  "level": "WARN",
  "category": "INVALID_SIGNATURE",
  "message": "Invalid signature detected",
  "conversationId": "conv-789",
  "userId": "user123",
  "attackType": "MITM",
  "reason": "Signature verification failed - possible MITM attack"
}
```

### 6. **Metadata Access**
- **Category**: `METADATA_ACCESS`
- **Level**: `INFO`
- **Logged When**: User accesses file metadata
- **Data Logged**:
  - User ID
  - Resource type (file, message, etc.)
  - Resource ID
  - Action (upload, download, view)

**Example Log Entry:**
```json
{
  "timestamp": "2025-01-27T10:55:00.000Z",
  "level": "INFO",
  "category": "METADATA_ACCESS",
  "message": "Metadata access: download",
  "userId": "user123",
  "resourceType": "file",
  "resourceId": "file-456",
  "action": "download"
}
```

---

## API Endpoints

### 1. **Get Security Logs**
```
GET /api/security/logs
```

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 100)
- `category` (optional): Filter by category
- `level` (optional): Filter by level (INFO, WARN, ERROR)
- `userId` (optional): Filter by user ID
- `startDate` (optional): Filter from date (ISO format)
- `endDate` (optional): Filter until date (ISO format)
- `conversationId` (optional): Filter by conversation ID

**Example Request:**
```bash
GET /api/security/logs?limit=50&category=REPLAY_ATTACK&level=WARN
```

**Example Response:**
```json
{
  "success": true,
  "count": 25,
  "logs": [
    {
      "timestamp": "2025-01-27T10:45:00.000Z",
      "level": "WARN",
      "category": "REPLAY_ATTACK",
      "message": "Replay attack detected",
      "conversationId": "conv-789",
      "attackType": "nonce"
    }
  ]
}
```

### 2. **Get Log Statistics**
```
GET /api/security/statistics
```

**Query Parameters:** Same as `/logs` endpoint

**Example Response:**
```json
{
  "success": true,
  "statistics": {
    "total": 1500,
    "byCategory": {
      "AUTHENTICATION": 500,
      "KEY_EXCHANGE": 300,
      "REPLAY_ATTACK": 50,
      "INVALID_SIGNATURE": 25,
      "DECRYPTION": 100,
      "METADATA_ACCESS": 525
    },
    "byLevel": {
      "INFO": 1200,
      "WARN": 250,
      "ERROR": 50
    },
    "byDate": {
      "2025-01-27": 150,
      "2025-01-26": 200
    },
    "recentAttacks": [
      {
        "timestamp": "2025-01-27T10:45:00.000Z",
        "category": "REPLAY_ATTACK",
        "level": "WARN",
        "message": "Replay attack detected"
      }
    ],
    "topUsers": [
      { "userId": "user123", "count": 150 },
      { "userId": "user456", "count": 120 }
    ]
  }
}
```

### 3. **Get Security Dashboard**
```
GET /api/security/dashboard
```

**Example Response:**
```json
{
  "success": true,
  "dashboard": {
    "last24Hours": {
      "total": 150,
      "byCategory": { ... },
      "recentAttacks": [ ... ]
    },
    "allTime": {
      "total": 1500,
      "byCategory": { ... }
    },
    "recentEvents": [
      {
        "timestamp": "2025-01-27T10:55:00.000Z",
        "level": "INFO",
        "category": "METADATA_ACCESS",
        "message": "Metadata access: download"
      }
    ]
  }
}
```

### 4. **Export Logs**
```
GET /api/security/export?format=json&category=REPLAY_ATTACK
```

**Query Parameters:**
- `format` (optional): Export format - `json`, `csv`, or `txt` (default: json)
- Same filters as `/logs` endpoint

**Example Request:**
```bash
GET /api/security/export?format=csv&startDate=2025-01-01&endDate=2025-01-27
```

**Response:** File download (JSON, CSV, or TXT)

### 5. **Clean Old Logs**
```
POST /api/security/clean
```

**Body:**
```json
{
  "daysToKeep": 30
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Cleaned old logs. Deleted 500, kept 1000",
  "result": {
    "deleted": 500,
    "kept": 1000
  }
}
```

---

## Log Retention Policy

### Default Policy
- **Retention Period**: 30 days
- **Automatic Cleanup**: Can be scheduled via cron job
- **Manual Cleanup**: Via API endpoint or script

### Configuration
Set environment variable:
```bash
LOG_RETENTION_DAYS=30
```

### Manual Cleanup
```bash
# Run cleanup script
node backend/scripts/logCleanup.js

# Or via API
POST /api/security/clean
Body: { "daysToKeep": 30 }
```

### Automated Cleanup (Cron Job)
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/project && node backend/scripts/logCleanup.js
```

---

## Log File Location

- **Path**: `backend/logs/security.log`
- **Format**: JSON Lines (one JSON object per line)
- **Encoding**: UTF-8

### View Logs Manually
```bash
# View all logs
cat backend/logs/security.log

# View last 50 lines
tail -n 50 backend/logs/security.log

# Filter by category
grep "REPLAY_ATTACK" backend/logs/security.log

# Real-time monitoring
tail -f backend/logs/security.log | grep "WARN\|ERROR"
```

---

## Security Considerations

### 1. **Log Access Control**
- All log endpoints require authentication (`protectRoute` middleware)
- Only authenticated users can view logs
- Consider adding admin-only restrictions for sensitive operations

### 2. **Log Privacy**
- Logs contain user IDs and IP addresses
- Ensure compliance with privacy regulations (GDPR, etc.)
- Consider anonymization for long-term storage

### 3. **Log Integrity**
- Logs are append-only (no modification)
- Consider adding digital signatures to log files
- Store logs in secure, access-controlled locations

### 4. **Performance**
- Logging is asynchronous where possible
- Large log queries may impact performance
- Use pagination for large result sets

---

## Usage Examples

### Example 1: Get Recent Replay Attacks
```javascript
const response = await fetch('/api/security/logs?category=REPLAY_ATTACK&limit=10');
const data = await response.json();
console.log('Recent replay attacks:', data.logs);
```

### Example 2: Get Statistics for Last Week
```javascript
const lastWeek = new Date();
lastWeek.setDate(lastWeek.getDate() - 7);

const response = await fetch(
  `/api/security/statistics?startDate=${lastWeek.toISOString()}`
);
const data = await response.json();
console.log('Last week statistics:', data.statistics);
```

### Example 3: Export All Warnings as CSV
```javascript
const response = await fetch('/api/security/export?format=csv&level=WARN');
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'security-warnings.csv';
link.click();
```

---

## Testing

### Test Logging Functions
```bash
# Test authentication logging
# - Try logging in with wrong password
# - Check logs for failed attempt

# Test key exchange logging
# - Start a conversation
# - Check logs for key exchange events

# Test replay attack logging
# - Attempt to replay a message
# - Check logs for replay attack detection

# Test invalid signature logging
# - Modify a key exchange message
# - Check logs for invalid signature
```

### Verify Log Endpoints
```bash
# Get logs
curl -X GET http://localhost:3005/api/security/logs \
  -H "Cookie: jwt=YOUR_TOKEN"

# Get statistics
curl -X GET http://localhost:3005/api/security/statistics \
  -H "Cookie: jwt=YOUR_TOKEN"

# Export logs
curl -X GET "http://localhost:3005/api/security/export?format=json" \
  -H "Cookie: jwt=YOUR_TOKEN" \
  -o security-logs.json
```

---

## Monitoring & Alerts

### Recommended Monitoring
1. **High Error Rate**: Alert if ERROR level logs exceed threshold
2. **Replay Attacks**: Alert on any replay attack detection
3. **Invalid Signatures**: Alert on invalid signature detections (possible MITM)
4. **Failed Decryptions**: Monitor decryption failure rate
5. **Failed Authentications**: Alert on multiple failed login attempts

### Example Alert Rules
```javascript
// Check for high error rate
const errors = stats.byLevel.ERROR || 0;
if (errors > 100) {
  alert('High error rate detected!');
}

// Check for recent attacks
if (stats.recentAttacks.length > 10) {
  alert('Multiple security events detected!');
}
```

---

## Summary

✅ **Implemented Features:**
- Comprehensive security event logging
- Log viewing with filtering
- Log statistics and analysis
- Log export (JSON, CSV, TXT)
- Log retention and cleanup
- Security dashboard

✅ **Logged Events:**
- Authentication attempts
- Key exchange attempts
- Decryption failures
- Replay attack detections
- Invalid signature detections
- Metadata access

✅ **API Endpoints:**
- `GET /api/security/logs` - View logs
- `GET /api/security/statistics` - Get statistics
- `GET /api/security/dashboard` - Dashboard data
- `GET /api/security/export` - Export logs
- `POST /api/security/clean` - Clean old logs

---

**Status**: Security Logging & Auditing is fully implemented! ✅
