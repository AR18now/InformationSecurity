# Database Schema Documentation

## Overview

This document provides a complete description of the MongoDB database schema for the E2EE messaging system.

---

## Database: `secure_messaging_db`

### Collections

1. **users** - User accounts and public keys
2. **messages** - Encrypted messages
3. **files** - Encrypted files
4. **conversations** - Conversation metadata

---

## 1. Users Collection

### Schema

```javascript
{
  _id: ObjectId,                    // MongoDB auto-generated ID
  username: String,                 // Unique username
  password: String,                 // Hashed password (bcryptjs)
  fullName: String,                 // User's full name
  profilePic: String,                // Profile picture URL
  publicKey: String,                 // RSA public key (Base64)
  createdAt: Date,                  // Account creation date
  updatedAt: Date                   // Last update date
}
```

### Indexes

```javascript
{
  username: 1  // Unique index
}
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "alice",
  "password": "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  "fullName": "Alice Smith",
  "profilePic": "https://avatar.iran.liara.run/public",
  "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T10:00:00.000Z"
}
```

### Security Notes

- **Password**: Never stored in plaintext, always hashed with bcryptjs
- **Public Key**: Stored in Base64 format, used for signature verification
- **Private Key**: NEVER stored in database, only in client IndexedDB

---

## 2. Messages Collection

### Schema

```javascript
{
  _id: ObjectId,                    // Message ID
  senderId: ObjectId,               // Reference to User (sender)
  receiverId: ObjectId,              // Reference to User (receiver)
  
  // Encrypted message data (NO PLAINTEXT)
  ciphertext: String,                // Base64 encoded encrypted message
  iv: String,                        // Base64 encoded initialization vector (12 bytes)
  authTag: String,                   // Base64 encoded authentication tag (16 bytes)
  
  // Message metadata
  messageType: String,               // 'text' or 'file'
  fileId: ObjectId,                  // Reference to File (if messageType is 'file')
  fileName: String,                  // Original file name (if file message)
  fileType: String,                  // MIME type (if file message)
  fileSize: Number,                  // File size in bytes (if file message)
  
  // Replay protection
  sequenceNumber: Number,            // Monotonically increasing sequence number
  messageTimestamp: Number,          // Unix timestamp in milliseconds
  
  // MongoDB timestamps
  createdAt: Date,                   // Message creation date
  updatedAt: Date                    // Last update date
}
```

### Indexes

```javascript
{
  senderId: 1,
  receiverId: 1,
  createdAt: -1  // For efficient message retrieval
}
```

### Example Document (Text Message)

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439013",
  "ciphertext": "aGVsbG8gd29ybGQ=",
  "iv": "YWJjZGVmZ2hpams=",
  "authTag": "MTIzNDU2Nzg5MGFiY2RlZg==",
  "messageType": "text",
  "fileId": null,
  "fileName": null,
  "fileType": null,
  "fileSize": null,
  "sequenceNumber": 1,
  "messageTimestamp": 1706352000000,
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T10:00:00.000Z"
}
```

### Example Document (File Message)

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439013",
  "ciphertext": "[FILE]",
  "iv": "file",
  "authTag": "file",
  "messageType": "file",
  "fileId": "507f1f77bcf86cd799439015",
  "fileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 2097152,
  "sequenceNumber": 2,
  "messageTimestamp": 1706352001000,
  "createdAt": "2025-01-27T10:00:01.000Z",
  "updatedAt": "2025-01-27T10:00:01.000Z"
}
```

### Security Notes

- **NO PLAINTEXT**: Server never stores plaintext messages
- **Encryption**: All messages encrypted with AES-256-GCM
- **Integrity**: Authentication tag ensures message integrity
- **Replay Protection**: Sequence numbers and timestamps prevent replay attacks

---

## 3. Files Collection

### Schema

```javascript
{
  _id: ObjectId,                    // File ID
  senderId: ObjectId,               // Reference to User (sender)
  receiverId: ObjectId,              // Reference to User (receiver)
  conversationId: ObjectId,          // Reference to Conversation
  
  // Encrypted file data (NO PLAINTEXT)
  ciphertext: String,                // Base64 encoded encrypted file
  iv: String,                        // Base64 encoded initialization vector
  authTag: String,                   // Base64 encoded authentication tag
  
  // File metadata
  originalFileName: String,          // Original file name
  fileType: String,                  // MIME type
  fileSize: Number,                   // Original file size in bytes
  encryptedSize: Number,             // Encrypted file size in bytes
  
  // Replay protection
  sequenceNumber: Number,            // Sequence number
  fileTimestamp: Number,             // Unix timestamp in milliseconds
  
  // Chunking support (for future)
  isChunked: Boolean,                // Whether file is chunked
  totalChunks: Number,                // Total number of chunks
  chunkIndex: Number,                 // Current chunk index
  
  // MongoDB timestamps
  createdAt: Date,                   // File upload date
  updatedAt: Date                    // Last update date
}
```

### Indexes

```javascript
{
  senderId: 1,
  receiverId: 1,
  conversationId: 1,
  createdAt: -1
}
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439015",
  "senderId": "507f1f77bcf86cd799439011",
  "receiverId": "507f1f77bcf86cd799439013",
  "conversationId": "507f1f77bcf86cd799439016",
  "ciphertext": "aGVsbG8gd29ybGQgdGhpcyBpcyBhIGZpbGU=",
  "iv": "YWJjZGVmZ2hpams=",
  "authTag": "MTIzNDU2Nzg5MGFiY2RlZg==",
  "originalFileName": "document.pdf",
  "fileType": "application/pdf",
  "fileSize": 2097152,
  "encryptedSize": 2097184,
  "sequenceNumber": 1,
  "fileTimestamp": 1706352000000,
  "isChunked": false,
  "totalChunks": 1,
  "chunkIndex": 0,
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T10:00:00.000Z"
}
```

### Security Notes

- **NO PLAINTEXT**: Server never stores plaintext files
- **Encryption**: All files encrypted with AES-256-GCM
- **Integrity**: Authentication tag ensures file integrity
- **Access Control**: Only sender and receiver can access files

---

## 4. Conversations Collection

### Schema

```javascript
{
  _id: ObjectId,                    // Conversation ID
  participants: [ObjectId],          // Array of User IDs (min: 2)
  messages: [ObjectId],              // Array of Message IDs
  
  // MongoDB timestamps
  createdAt: Date,                   // Conversation creation date
  updatedAt: Date                    // Last update date
}
```

### Indexes

```javascript
{
  participants: 1  // For efficient conversation lookup
}
```

### Example Document

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "participants": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439013"
  ],
  "messages": [
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439014"
  ],
  "createdAt": "2025-01-27T10:00:00.000Z",
  "updatedAt": "2025-01-27T10:00:05.000Z"
}
```

### Security Notes

- **Participants**: Only participants can access conversation messages
- **Access Control**: Verified on every message/file access

---

## Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
│  ─────────  │
│ _id (PK)    │
│ username    │
│ password    │
│ publicKey   │
└──────┬──────┘
       │
       │ 1
       │
       │ *
┌──────┴──────────────────────────────────────┐
│            Messages                          │
│  ─────────────────────────────               │
│ _id (PK)                                     │
│ senderId (FK → Users)                        │
│ receiverId (FK → Users)                     │
│ ciphertext                                   │
│ iv                                           │
│ authTag                                      │
│ fileId (FK → Files, optional)               │
└──────┬──────────────────────────────────────┘
       │
       │ *
       │
       │ 1
┌──────┴──────┐
│Conversations│
│  ─────────  │
│ _id (PK)    │
│ participants│
│ messages[]   │
└─────────────┘

┌─────────────┐
│    Files    │
│  ─────────  │
│ _id (PK)    │
│ senderId    │
│ receiverId  │
│ conversationId│
│ ciphertext  │
│ iv          │
│ authTag     │
└─────────────┘
```

---

## Data Relationships

### One-to-Many Relationships

1. **User → Messages**
   - One user can send many messages
   - One user can receive many messages
   - Relationship: `senderId` and `receiverId` in Messages

2. **User → Files**
   - One user can upload many files
   - One user can receive many files
   - Relationship: `senderId` and `receiverId` in Files

3. **Conversation → Messages**
   - One conversation contains many messages
   - Relationship: `messages[]` array in Conversation

4. **Conversation → Files**
   - One conversation can contain many files
   - Relationship: `conversationId` in Files

### Many-to-Many Relationships

1. **User ↔ User (Conversations)**
   - Two users can have one conversation
   - Relationship: `participants[]` array in Conversation

---

## Data Storage Details

### Encryption Storage Format

**Messages and Files:**
- **ciphertext**: Base64 encoded encrypted data
- **iv**: Base64 encoded 12-byte initialization vector
- **authTag**: Base64 encoded 16-byte authentication tag

**Example Size Calculation:**
- Plaintext: 100 bytes
- Encrypted (AES-256-GCM): ~100 bytes + 16 bytes (auth tag) = 116 bytes
- Base64 encoded: ~155 bytes
- Total storage: ~155 bytes (ciphertext) + ~16 bytes (iv) + ~22 bytes (authTag) = ~193 bytes

### IndexedDB Storage (Client-Side)

**Private Keys:**
```javascript
{
  username: "alice",
  privateKey: "base64_encoded_rsa_private_key",
  createdAt: timestamp
}
```

**Session Keys:**
```javascript
{
  conversationId: "conv_123",
  sessionKey: CryptoKey object,
  expiresAt: timestamp (7 days from creation)
}
```

---

## Query Patterns

### Common Queries

1. **Get User by Username**
```javascript
User.findOne({ username: "alice" })
```

2. **Get Messages for Conversation**
```javascript
Conversation.findOne({
  participants: { $all: [userId1, userId2] }
}).populate("messages")
```

3. **Get Files for Conversation**
```javascript
File.find({ conversationId: conversationId })
```

4. **Get User's Public Key**
```javascript
User.findById(userId).select("publicKey")
```

5. **Get Recent Messages**
```javascript
Message.find({
  $or: [
    { senderId: userId },
    { receiverId: userId }
  ]
}).sort({ createdAt: -1 }).limit(50)
```

---

## Data Integrity Constraints

### Required Fields

**Users:**
- `username` (unique, required)
- `password` (required)
- `publicKey` (required)

**Messages:**
- `senderId` (required)
- `receiverId` (required)
- `ciphertext` (required)
- `iv` (required)
- `authTag` (required)
- `messageTimestamp` (required)

**Files:**
- `senderId` (required)
- `receiverId` (required)
- `conversationId` (required)
- `ciphertext` (required)
- `iv` (required)
- `authTag` (required)
- `originalFileName` (required)
- `fileType` (required)
- `fileSize` (required)

### Validation Rules

1. **Username**: Must be unique, alphanumeric, 3-20 characters
2. **Password**: Must be hashed (never plaintext)
3. **Public Key**: Must be valid Base64, RSA-2048 format
4. **Ciphertext**: Must be Base64 encoded
5. **IV**: Must be 12 bytes (Base64 encoded)
6. **Auth Tag**: Must be 16 bytes (Base64 encoded)
7. **Sequence Number**: Must be positive integer
8. **Timestamp**: Must be valid Unix timestamp

---

## Backup and Recovery

### Backup Strategy

1. **Regular Backups**: Daily MongoDB backups
2. **Log Retention**: 30 days (configurable)
3. **Key Backup**: Users should export private keys (not automated)

### Recovery Procedures

1. **Database Recovery**: Restore from MongoDB backup
2. **Key Recovery**: Users must re-import private keys
3. **Log Recovery**: Logs are append-only, can be restored from backup

---

## Performance Considerations

### Indexing Strategy

- **Users**: Indexed on `username` (unique)
- **Messages**: Indexed on `senderId`, `receiverId`, `createdAt`
- **Files**: Indexed on `conversationId`, `createdAt`
- **Conversations**: Indexed on `participants`

### Query Optimization

- Use `.select()` to limit fields returned
- Use `.populate()` efficiently (limit depth)
- Use pagination for large result sets
- Use `.lean()` for read-only queries

---

## Security Considerations

### Data at Rest

- ⚠️ **Current**: MongoDB not encrypted at rest
- ✅ **Recommendation**: Enable MongoDB encryption at rest
- ✅ **Current**: All sensitive data encrypted (messages, files)

### Data in Transit

- ✅ **Current**: HTTPS/TLS for all communication
- ✅ **Current**: Encrypted payloads (AES-256-GCM)

### Access Control

- ✅ **Current**: Authentication required for all endpoints
- ✅ **Current**: Access control on messages/files (sender/receiver only)
- ⚠️ **Recommendation**: Add role-based access control (RBAC)

---

## Schema Evolution

### Future Enhancements

1. **Message Reactions**
   - Add `reactions[]` field to Messages

2. **Message Status**
   - Add `status` field (sent, delivered, read)

3. **Group Conversations**
   - Extend Conversations to support multiple participants

4. **File Chunking**
   - Implement file chunking for large files
   - Use existing `isChunked`, `totalChunks`, `chunkIndex` fields

5. **Message Threading**
   - Add `parentMessageId` for message replies

---

**Status**: Database schema documentation complete ✅
