# System Architecture Documentation

## Overview

This document provides a comprehensive overview of the **Secure End-to-End Encrypted Messaging & File-Sharing System** architecture, including component diagrams, data flows, and system design.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Frontend Application                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │   Auth UI    │  │  Messages UI │  │   Files UI   │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │         Web Crypto API (Browser)                 │   │  │
│  │  │  • RSA Key Generation                            │   │  │
│  │  │  • ECDH Key Exchange                              │   │  │
│  │  │  • AES-256-GCM Encryption/Decryption             │   │  │
│  │  │  • Digital Signatures (RSASSA-PKCS1-v1_5)        │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │         Client-Side Storage                      │   │  │
│  │  │  • IndexedDB: Private RSA Keys                   │   │  │
│  │  │  • Memory: Session Keys (temporary)               │   │  │
│  │  │  • Cookies: JWT Tokens                           │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/TLS
                              │ (Encrypted Communication)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Node.js + Express)                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Endpoints                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │   /api/auth  │  │ /api/messages│  │  /api/files  │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │/api/keyexch. │  │/api/security │  │  /api/mitm   │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │         Controllers & Business Logic             │   │  │
│  │  │  • Authentication Controller                     │   │  │
│  │  │  • Message Controller                            │   │  │
│  │  │  • Key Exchange Controller                       │   │  │
│  │  │  • File Controller                               │   │  │
│  │  │  • Security Controller                           │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │         Security Utilities                        │   │  │
│  │  │  • Replay Protection                              │   │  │
│  │  │  • Security Logging                               │   │  │
│  │  │  • Signature Verification                         │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              │                                  │
┌──────────────────────────────┴──────────────────────────────────┐
│                    DATABASE (MongoDB)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Collections                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│  │  │    Users     │  │   Messages   │  │    Files     │   │  │
│  │  │  • username  │  │  • ciphertext│  │  • ciphertext│   │  │
│  │  │  • password  │  │  • iv        │  │  • iv        │   │  │
│  │  │  • publicKey  │  │  • authTag   │  │  • authTag   │   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│  │  ┌──────────────┐                                       │  │
│  │  │ Conversations│                                       │  │
│  │  │  • participants                                      │  │
│  │  │  • messages[]                                        │  │
│  │  └──────────────┘                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌──────────────────────────────┴──────────────────────────────────┐
│              SECURITY LOGGING SYSTEM                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              backend/logs/security.log                     │  │
│  │  • Authentication attempts                                │  │
│  │  • Key exchange events                                    │  │
│  │  • Replay attack detections                               │  │
│  │  • Invalid signature detections                           │  │
│  │  • Decryption failures                                    │  │
│  │  • Metadata access                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

```
React Application
│
├── Pages
│   ├── Login.jsx
│   ├── SignUp.jsx
│   └── Home.jsx
│
├── Components
│   ├── Messages/
│   │   ├── MessageContainer.jsx
│   │   ├── Messages.jsx
│   │   ├── Message.jsx
│   │   └── MessageInput.jsx
│   └── Sidebar/
│       └── Conversations.jsx
│
├── Hooks
│   ├── useSignup.js (key generation)
│   ├── useLogin.js (key retrieval)
│   ├── useSendMessage.js (encryption)
│   ├── useGetMessages.js (decryption)
│   ├── useKeyExchange.js (key exchange)
│   ├── useUploadFile.js (file encryption)
│   ├── useDownloadFile.js (file decryption)
│   └── usePrivateKey.js (key access)
│
├── Utils
│   ├── keyStorage.js (RSA key management)
│   ├── keyExchange.js (ECDH + signatures)
│   └── messageEncryption.js (AES-256-GCM)
│
└── Context
    └── AuthContext.js (authentication state)
```

### Backend Components

```
Express Server
│
├── Routes
│   ├── auth.routes.js
│   ├── message.routes.js
│   ├── keyExchange.routes.js
│   ├── file.routes.js
│   ├── security.routes.js
│   └── mitm.routes.js
│
├── Controllers
│   ├── auth.controller.js
│   ├── message.controller.js
│   ├── keyExchange.controller.js
│   ├── file.controller.js
│   ├── security.controller.js
│   └── mitm.controller.js
│
├── Models
│   ├── user.model.js
│   ├── message.model.js
│   ├── file.model.js
│   └── conversation.model.js
│
├── Utils
│   ├── securityLogger.js
│   └── replayProtection.js
│
└── Middleware
    └── protectRoute.js (JWT authentication)
```

---

## Data Flow Architecture

### User Registration Flow

```
User → SignUp.jsx
  ↓
useSignup.js
  ↓
generateKeyPair() → RSA-2048 Key Pair
  ↓
Private Key → IndexedDB (local storage)
  ↓
Public Key → POST /api/auth/signup
  ↓
Backend → Hash Password (bcryptjs)
  ↓
MongoDB → Store User + Public Key
  ↓
Response → JWT Token
  ↓
Client → Store JWT in Cookie
```

### User Login Flow

```
User → Login.jsx
  ↓
POST /api/auth/login (username + password)
  ↓
Backend → Verify Password
  ↓
MongoDB → Get User + Public Key
  ↓
Response → JWT Token + Public Key
  ↓
Client → Retrieve Private Key from IndexedDB
  ↓
Client → Verify Key Pair (encryption test)
  ↓
Client → Store User Data + JWT
```

### Key Exchange Flow

```
User A selects User B
  ↓
MessageContainer.jsx → Check for session key
  ↓
No session key → Initiate Key Exchange
  ↓
useKeyExchange.js → generateECDHKeyPair()
  ↓
Create Key Exchange Init Message
  ↓
Sign with RSA Private Key
  ↓
POST /api/keyexchange/initiate
  ↓
Backend → Store message, log event
  ↓
User B polls → GET /api/keyexchange/pending
  ↓
User B receives init message
  ↓
User B verifies signature (User A's public key)
  ↓
User B generates ECDH key pair
  ↓
User B creates response, signs it
  ↓
POST /api/keyexchange/respond
  ↓
User A polls → GET /api/keyexchange/response/:id
  ↓
User A receives response
  ↓
User A verifies signature (User B's public key)
  ↓
Both users derive shared secret (ECDH)
  ↓
Both users derive session key (SHA-256)
  ↓
Session key stored in memory (7-day expiration)
```

### Message Sending Flow

```
User types message → MessageInput.jsx
  ↓
useSendMessage.js
  ↓
Get session key (from key exchange)
  ↓
encryptMessage() → AES-256-GCM
  ↓
Generate nonce, timestamp, sequence number
  ↓
POST /api/messages/send/:id
  Body: { ciphertext, iv, authTag, nonce, timestamp, sequenceNumber }
  ↓
Backend → Validate replay protection
  ↓
Backend → Store encrypted message (NO PLAINTEXT)
  ↓
MongoDB → Save to Messages collection
  ↓
Response → Return message metadata
  ↓
Client → Decrypt for local display
  ↓
Client → Update UI with decrypted message
```

### Message Receiving Flow

```
User opens conversation
  ↓
useGetMessages.js
  ↓
GET /api/messages/:id
  ↓
Backend → Get encrypted messages from MongoDB
  ↓
Response → Return encrypted messages
  ↓
Client → Get session key
  ↓
For each message:
  ↓
  decryptMessage() → AES-256-GCM
  ↓
  Verify authentication tag
  ↓
  Display decrypted message
```

### File Upload Flow

```
User selects file → MessageInput.jsx
  ↓
useUploadFile.js
  ↓
Get session key
  ↓
encryptFile() → AES-256-GCM
  ↓
Generate nonce, timestamp, sequence number
  ↓
POST /api/files/upload/:id
  Body: { ciphertext, iv, authTag, fileName, fileType, fileSize, nonce }
  ↓
Backend → Validate replay protection
  ↓
Backend → Store encrypted file (NO PLAINTEXT)
  ↓
MongoDB → Save to Files collection
  ↓
Backend → Create message entry for file
  ↓
Response → Return file metadata
  ↓
Client → Display file in chat
```

### File Download Flow

```
User clicks download → Message.jsx
  ↓
useDownloadFile.js
  ↓
GET /api/files/download/:fileId
  ↓
Backend → Verify access (sender/receiver only)
  ↓
Backend → Get encrypted file from MongoDB
  ↓
Response → Return encrypted file data
  ↓
Client → Get session key
  ↓
decryptFile() → AES-256-GCM
  ↓
Verify authentication tag
  ↓
Create Blob from decrypted data
  ↓
Trigger browser download
```

---

## Security Architecture

### Encryption Layers

```
Layer 1: Transport Security
  └── HTTPS/TLS (server-client communication)

Layer 2: End-to-End Encryption
  └── AES-256-GCM (message/file encryption)
  └── Session keys (derived from key exchange)

Layer 3: Key Exchange Security
  └── ECDH (P-256 curve)
  └── Digital Signatures (RSASSA-PKCS1-v1_5)
  └── Replay Protection (nonces, timestamps, sequence numbers)

Layer 4: Authentication
  └── JWT tokens
  └── Password hashing (bcryptjs)
  └── Secure cookies
```

### Key Management Architecture

```
User Registration
  ↓
RSA-2048 Key Pair Generated (Web Crypto API)
  ↓
Private Key → IndexedDB (client-side only)
Public Key → MongoDB (server-side)
  ↓
Key Exchange
  ↓
ECDH Key Pair Generated (ephemeral)
  ↓
ECDH Public Key → Signed with RSA Private Key
  ↓
Session Key Derived (SHA-256)
  ↓
Session Key → Memory (7-day expiration)
  ↓
Used for AES-256-GCM encryption
```

---

## Network Architecture

### API Endpoint Structure

```
/api
│
├── /auth
│   ├── POST /signup
│   └── POST /login
│
├── /messages
│   ├── POST /send/:id
│   └── GET /:id
│
├── /keyexchange
│   ├── GET /users/:id/publickey
│   ├── POST /initiate
│   ├── POST /respond
│   ├── GET /response/:conversationId
│   └── GET /pending
│
├── /files
│   ├── POST /upload/:id
│   ├── GET /download/:fileId
│   └── GET /conversation/:id
│
├── /security
│   ├── POST /decryption-failure
│   ├── GET /logs
│   ├── GET /statistics
│   ├── GET /dashboard
│   ├── GET /export
│   └── POST /clean
│
└── /mitm
    ├── POST /test-detection
    └── GET /stats
```

---

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  password: String (hashed with bcryptjs),
  fullName: String,
  profilePic: String,
  publicKey: String (Base64, required), // RSA public key
  createdAt: Date,
  updatedAt: Date
}
```

### Message Collection

```javascript
{
  _id: ObjectId,
  senderId: ObjectId (ref: User),
  receiverId: ObjectId (ref: User),
  ciphertext: String (Base64, required), // Encrypted message
  iv: String (Base64, required), // Initialization vector
  authTag: String (Base64, required), // Authentication tag
  messageType: String (enum: ['text', 'file']),
  fileId: ObjectId (ref: File, optional),
  fileName: String (optional),
  fileType: String (optional),
  fileSize: Number (optional),
  sequenceNumber: Number,
  messageTimestamp: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### File Collection

```javascript
{
  _id: ObjectId,
  senderId: ObjectId (ref: User),
  receiverId: ObjectId (ref: User),
  conversationId: ObjectId (ref: Conversation),
  ciphertext: String (Base64, required), // Encrypted file
  iv: String (Base64, required),
  authTag: String (Base64, required),
  originalFileName: String (required),
  fileType: String (required),
  fileSize: Number (required),
  encryptedSize: Number,
  sequenceNumber: Number,
  fileTimestamp: Number,
  isChunked: Boolean,
  totalChunks: Number,
  chunkIndex: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Conversation Collection

```javascript
{
  _id: ObjectId,
  participants: [ObjectId] (ref: User, min: 2),
  messages: [ObjectId] (ref: Message),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Security Architecture Details

### Replay Protection Architecture

```
Message/File/Key Exchange
  ↓
Replay Protection Validation
  ├── Nonce Validation (Number Used Once)
  ├── Timestamp Validation (5-minute window)
  └── Sequence Number Validation (monotonically increasing)
  ↓
If Valid → Process
If Invalid → Reject + Log Attack
```

### Security Logging Architecture

```
Security Event Occurs
  ↓
securityLogger.js
  ├── Format log entry (JSON)
  ├── Add timestamp, level, category
  └── Write to backend/logs/security.log
  ↓
Log File (JSON Lines format)
  ├── Authentication attempts
  ├── Key exchange events
  ├── Replay attacks
  ├── Invalid signatures
  ├── Decryption failures
  └── Metadata access
```

---

## Technology Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Zustand
- **HTTP Client**: Fetch API
- **Cryptography**: Web Crypto API
- **Storage**: IndexedDB, Cookies, Memory

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT, bcryptjs
- **Logging**: File system (JSON Lines)

### Security
- **Transport**: HTTPS/TLS
- **Encryption**: AES-256-GCM
- **Key Exchange**: ECDH (P-256)
- **Signatures**: RSASSA-PKCS1-v1_5
- **Key Derivation**: SHA-256

---

## Deployment Architecture

### Development Environment

```
┌─────────────┐
│   Client    │ → http://localhost:5173 (Vite Dev Server)
└─────────────┘
      │
      │ HTTP
      │
┌─────────────┐
│   Server    │ → http://localhost:3005 (Express)
└─────────────┘
      │
      │ MongoDB Connection
      │
┌─────────────┐
│  MongoDB    │ → mongodb://localhost:27017
└─────────────┘
```

### Production Environment

```
┌─────────────┐
│   Client    │ → https://yourdomain.com (Static hosting)
└─────────────┘
      │
      │ HTTPS/TLS
      │
┌─────────────┐
│   Server    │ → https://api.yourdomain.com (Express + HTTPS)
└─────────────┘
      │
      │ MongoDB Connection (TLS)
      │
┌─────────────┐
│  MongoDB    │ → mongodb+srv://... (MongoDB Atlas)
└─────────────┘
```

---

## Data Security Flow

### End-to-End Encryption Guarantee

```
Plaintext Message/File
  ↓
[CLIENT-SIDE ONLY]
  ↓
AES-256-GCM Encryption
  ↓
Ciphertext + IV + Auth Tag
  ↓
[TRANSMISSION]
  ↓
HTTPS/TLS (additional encryption)
  ↓
[SERVER-SIDE]
  ↓
MongoDB Storage (ciphertext only)
  ↓
[NO PLAINTEXT ON SERVER]
  ↓
[TRANSMISSION BACK]
  ↓
[CLIENT-SIDE ONLY]
  ↓
AES-256-GCM Decryption
  ↓
Plaintext Message/File
```

**Key Point**: Plaintext **NEVER** exists outside the client device.

---

## Component Interactions

### Authentication Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │────────▶│  Server  │────────▶│ MongoDB  │
└──────────┘         └──────────┘         └──────────┘
     │                     │                     │
     │ 1. POST /signup    │                     │
     │    (username,      │                     │
     │     password,      │                     │
     │     publicKey)     │                     │
     │───────────────────▶│                     │
     │                     │ 2. Hash password    │
     │                     │    Store user      │
     │                     │────────────────────▶│
     │                     │                     │
     │ 3. Response (JWT)   │                     │
     │◀───────────────────│                     │
     │                     │                     │
     │ 4. Store JWT        │                     │
     │    Store private    │                     │
     │    key in IndexedDB │                     │
```

### Key Exchange Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│ User A   │         │  Server  │         │ User B   │
└──────────┘         └──────────┘         └──────────┘
     │                     │                     │
     │ 1. Generate ECDH    │                     │
     │    Sign with RSA    │                     │
     │───────────────────▶│                     │
     │    POST /initiate   │                     │
     │                     │ 2. Store message   │
     │                     │────────────────────▶│
     │                     │    Poll /pending  │
     │                     │◀───────────────────│
     │                     │                     │
     │                     │ 3. Return message  │
     │                     │───────────────────▶│
     │                     │                     │ 4. Verify signature
     │                     │                     │    Generate ECDH
     │                     │                     │    Sign response
     │                     │◀────────────────────│
     │                     │    POST /respond    │
     │                     │                     │
     │ 5. Poll /response   │                     │
     │───────────────────▶│                     │
     │                     │ 6. Return response │
     │◀───────────────────│                     │
     │                     │                     │
     │ 7. Verify signature │                     │
     │    Derive session   │                     │
     │    key              │                     │
```

---

## System Requirements

### Client Requirements
- Modern browser with Web Crypto API support
- JavaScript enabled
- IndexedDB support
- HTTPS connection (for production)

### Server Requirements
- Node.js 16+ 
- MongoDB 4.4+
- Express.js 4.x
- 2GB+ RAM (recommended)
- SSL/TLS certificate (for production)

---

## Scalability Considerations

### Current Architecture (Single Server)
- Suitable for small to medium deployments
- All components on single server
- MongoDB on same or separate server

### Future Scalability Options
- **Horizontal Scaling**: Multiple server instances
- **Load Balancer**: Distribute requests
- **Redis**: Session key storage (distributed)
- **CDN**: Static asset delivery
- **Database Sharding**: For large user bases

---

**Status**: System Architecture documentation complete ✅
