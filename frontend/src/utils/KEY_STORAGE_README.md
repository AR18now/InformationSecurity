# Key Storage Implementation Documentation

## Overview

This module implements secure client-side key storage for RSA-2048 key pairs using the Web Crypto API and IndexedDB. Private keys are **never** sent to the server and remain encrypted in the browser's IndexedDB.

## Architecture

### Key Storage Flow

```
User Registration:
1. Generate RSA-2048 key pair (Web Crypto API)
2. Export public key (Base64) → Send to server
3. Export private key (Base64) → Store in IndexedDB (client-side only)

User Login:
1. Authenticate with server
2. Retrieve private key from IndexedDB
3. Verify key pair matches server's public key
4. Key ready for encryption/decryption operations
```

## API Reference

### Core Functions

#### `generateKeyPair()`
Generates a new RSA-2048 key pair using Web Crypto API.

**Returns:**
```javascript
{
  publicKeyBase64: string,   // Base64 encoded SPKI format
  privateKeyBase64: string   // Base64 encoded PKCS8 format
}
```

**Example:**
```javascript
const { publicKeyBase64, privateKeyBase64 } = await generateKeyPair();
```

---

#### `storePrivateKey(privateKeyBase64, username)`
Stores a private key in IndexedDB associated with a username.

**Parameters:**
- `privateKeyBase64` (string): Base64 encoded private key
- `username` (string): Username to associate with the key

**Returns:** `Promise<boolean>`

**Example:**
```javascript
await storePrivateKey(privateKeyBase64, "john_doe");
```

---

#### `retrievePrivateKey(username)`
Retrieves a private key from IndexedDB for a given username.

**Parameters:**
- `username` (string): Username to retrieve key for

**Returns:** `Promise<string|null>` - Base64 encoded private key or null if not found

**Example:**
```javascript
const privateKey = await retrievePrivateKey("john_doe");
if (privateKey) {
  // Key found
}
```

---

#### `importPrivateKey(privateKeyBase64)`
Converts a Base64 private key to a CryptoKey object for use with Web Crypto API.

**Parameters:**
- `privateKeyBase64` (string): Base64 encoded private key

**Returns:** `Promise<CryptoKey>` - Imported CryptoKey object

**Example:**
```javascript
const cryptoKey = await importPrivateKey(privateKeyBase64);
// Use cryptoKey with window.crypto.subtle.decrypt()
```

---

#### `importPublicKey(publicKeyBase64)`
Converts a Base64 public key to a CryptoKey object for use with Web Crypto API.

**Parameters:**
- `publicKeyBase64` (string): Base64 encoded public key

**Returns:** `Promise<CryptoKey>` - Imported CryptoKey object

**Example:**
```javascript
const cryptoKey = await importPublicKey(publicKeyBase64);
// Use cryptoKey with window.crypto.subtle.encrypt()
```

---

#### `verifyKeyPair(privateKeyBase64, publicKeyBase64)`
Verifies that a private and public key form a valid key pair by testing encryption/decryption.

**Parameters:**
- `privateKeyBase64` (string): Base64 encoded private key
- `publicKeyBase64` (string): Base64 encoded public key

**Returns:** `Promise<boolean>` - True if keys are valid and match

**Example:**
```javascript
const isValid = await verifyKeyPair(privateKeyBase64, publicKeyBase64);
if (isValid) {
  console.log("Key pair is valid");
}
```

---

#### `keyExists(username)`
Checks if a private key exists for a given username.

**Parameters:**
- `username` (string): Username to check

**Returns:** `Promise<boolean>`

**Example:**
```javascript
const exists = await keyExists("john_doe");
```

---

#### `deletePrivateKey(username)`
Deletes a private key from IndexedDB.

**Parameters:**
- `username` (string): Username associated with the key

**Returns:** `Promise<boolean>`

**Example:**
```javascript
await deletePrivateKey("john_doe");
```

---

#### `regenerateKeyPair(username)`
Generates a new key pair and replaces the existing one for a user (key rotation).

**Parameters:**
- `username` (string): Username to regenerate key for

**Returns:** `Promise<{publicKeyBase64: string, privateKeyBase64: string}>`

**Example:**
```javascript
const { publicKeyBase64, privateKeyBase64 } = await regenerateKeyPair("john_doe");
// Note: You'll need to update the public key on the server
```

---

#### `getAllStoredKeys()`
Gets all usernames that have stored keys (for debugging/admin purposes).

**Returns:** `Promise<string[]>` - Array of usernames

**Example:**
```javascript
const usernames = await getAllStoredKeys();
console.log("Users with stored keys:", usernames);
```

---

## Usage Examples

### Complete Registration Flow

```javascript
import { generateKeyPair, storePrivateKey, verifyKeyPair } from '../utils/keyStorage';

async function handleSignup(username, password) {
  // Generate key pair
  const { publicKeyBase64, privateKeyBase64 } = await generateKeyPair();
  
  // Verify keys are valid
  const isValid = await verifyKeyPair(privateKeyBase64, publicKeyBase64);
  if (!isValid) {
    throw new Error("Key pair validation failed");
  }
  
  // Store private key locally
  await storePrivateKey(privateKeyBase64, username);
  
  // Send public key to server
  await fetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password,
      publicKey: publicKeyBase64
    })
  });
}
```

### Complete Login Flow

```javascript
import { retrievePrivateKey, keyExists, verifyKeyPair } from '../utils/keyStorage';

async function handleLogin(username, password) {
  // Authenticate with server
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  const userData = await response.json();
  
  // Check if key exists
  if (!await keyExists(username)) {
    throw new Error("Private key not found");
  }
  
  // Retrieve private key
  const privateKeyBase64 = await retrievePrivateKey(username);
  
  // Verify key pair if public key available
  if (userData.publicKey) {
    const isValid = await verifyKeyPair(privateKeyBase64, userData.publicKey);
    if (!isValid) {
      throw new Error("Key pair verification failed");
    }
  }
  
  // Login successful, key is ready for use
}
```

### Using the usePrivateKey Hook

```javascript
import usePrivateKey from '../hooks/usePrivateKey';

function MyComponent() {
  const { privateKeyCryptoKey, isLoading, error } = usePrivateKey();
  
  if (isLoading) return <div>Loading key...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!privateKeyCryptoKey) return <div>No key available</div>;
  
  // Use privateKeyCryptoKey for decryption operations
  // ...
}
```

## Security Considerations

### ✅ Implemented Security Features

1. **Client-Side Only Storage**: Private keys never leave the client device
2. **IndexedDB Storage**: More secure than localStorage for sensitive data
3. **Key Verification**: Keys are verified before use
4. **Base64 Encoding**: Keys are stored in a standard format
5. **Web Crypto API**: Uses browser's native cryptographic functions

### ⚠️ Security Notes

1. **No Additional Encryption Layer**: Keys are stored in IndexedDB but not encrypted with a password. This is acceptable for this implementation as IndexedDB is sandboxed per origin.

2. **Key Recovery**: If IndexedDB is cleared, keys cannot be recovered. Consider implementing a key backup mechanism (encrypted with user's password) for production.

3. **Key Rotation**: The `regenerateKeyPair()` function allows key rotation, but you must update the public key on the server.

4. **Browser Compatibility**: Web Crypto API and IndexedDB are supported in all modern browsers. Ensure your target browsers support these APIs.

## Database Schema

### IndexedDB Structure

```
Database: ChatAppKeysDB
Version: 1
Object Store: keys

Key Format: "privateKey-{username}"
Value: Uint8Array (binary representation of private key)
```

## Error Handling

All functions throw errors that should be caught:

```javascript
try {
  const key = await retrievePrivateKey(username);
} catch (error) {
  console.error("Failed to retrieve key:", error.message);
  // Handle error appropriately
}
```

## Testing

To test key storage functionality:

```javascript
// Test key generation
const { publicKeyBase64, privateKeyBase64 } = await generateKeyPair();
console.log("Keys generated:", { publicKeyBase64, privateKeyBase64 });

// Test storage
await storePrivateKey(privateKeyBase64, "test_user");
console.log("Key stored");

// Test retrieval
const retrieved = await retrievePrivateKey("test_user");
console.log("Key retrieved:", retrieved === privateKeyBase64); // Should be true

// Test verification
const isValid = await verifyKeyPair(privateKeyBase64, publicKeyBase64);
console.log("Key pair valid:", isValid); // Should be true
```

## Future Enhancements

1. **Password-Protected Key Storage**: Encrypt keys with user's password before storing
2. **Key Backup**: Allow users to export encrypted key backups
3. **Multi-Device Support**: Sync keys across devices (requires secure key exchange)
4. **Key Expiration**: Implement key rotation policies
5. **Key Recovery**: Implement secure key recovery mechanism

---

**Last Updated**: 2025-01-27
**Version**: 1.0.0
