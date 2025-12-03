/**
 * Key Exchange Protocol Implementation
 * 
 * Design: Option 2 (Simplified)
 * - SHA-256 key derivation
 * - RSASSA-PKCS1-v1_5 signatures
 * - P-256 ECDH curve
 * - Hash-based confirmation
 * - Timestamp replay protection
 * - Custom fields: conversationId, deviceInfo, appVersion
 */

import { importPublicKey, importPrivateKey } from './keyStorage';

// Constants
const ECDH_CURVE = "P-256";
const SIGNATURE_ALGORITHM = "RSASSA-PKCS1-v1_5";
const TIMESTAMP_TOLERANCE = 5 * 60 * 1000; // 5 minutes
const SESSION_KEY_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Track seen nonces to prevent replay attacks
const seenNonces = new Set();
const MAX_NONCE_AGE = 10 * 60 * 1000; // 10 minutes

// Clean up old nonces periodically
setInterval(() => {
    const now = Date.now();
    // Note: In production, you'd want to store nonces with timestamps
    // For simplicity, we'll just clear periodically
    if (seenNonces.size > 1000) {
        seenNonces.clear();
    }
}, 60 * 1000);

/**
 * Generate an ephemeral ECDH key pair for key exchange
 * 
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 * 
 * HINT: Use window.crypto.subtle.generateKey with:
 * - name: "ECDH"
 * - namedCurve: "P-256" or "P-384"
 * - extractable: true
 * - usages: ["deriveKey", "deriveBits"]
 */
export async function generateECDHKeyPair() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: ECDH_CURVE
            },
            true, // extractable
            ["deriveKey", "deriveBits"]
        );

        return {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey
        };
    } catch (error) {
        console.error("Error generating ECDH key pair:", error);
        throw new Error("Failed to generate ECDH key pair: " + error.message);
    }
}

/**
 * Export ECDH public key to Base64 format
 * 
 * @param {CryptoKey} publicKey - ECDH public key
 * @returns {Promise<string>} Base64 encoded public key
 * 
 * HINT: Use window.crypto.subtle.exportKey with format "spki"
 */
export async function exportECDHPublicKey(publicKey) {
    try {
        const exported = await window.crypto.subtle.exportKey("spki", publicKey);
        const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
        return base64;
    } catch (error) {
        console.error("Error exporting ECDH public key:", error);
        throw new Error("Failed to export ECDH public key: " + error.message);
    }
}

/**
 * Import ECDH public key from Base64 format
 * 
 * @param {string} publicKeyBase64 - Base64 encoded public key
 * @returns {Promise<CryptoKey>} Imported ECDH public key
 * 
 * HINT: Use window.crypto.subtle.importKey with format "spki"
 */
export async function importECDHPublicKey(publicKeyBase64) {
    try {
        const binaryString = atob(publicKeyBase64);
        const keyBuffer = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

        const publicKey = await window.crypto.subtle.importKey(
            "spki",
            keyBuffer,
            {
                name: "ECDH",
                namedCurve: ECDH_CURVE
            },
            true, // extractable
            []
        );

        return publicKey;
    } catch (error) {
        console.error("Error importing ECDH public key:", error);
        throw new Error("Failed to import ECDH public key: " + error.message);
    }
}

/**
 * Derive shared secret using ECDH
 * 
 * @param {CryptoKey} myPrivateKey - Your ECDH private key
 * @param {CryptoKey} theirPublicKey - Other party's ECDH public key
 * @returns {Promise<ArrayBuffer>} Shared secret (256 bits)
 * 
 * HINT: Use window.crypto.subtle.deriveBits with:
 * - name: "ECDH"
 * - public: theirPublicKey
 * - length: 256 (for 256 bits)
 */
export async function deriveSharedSecret(myPrivateKey, theirPublicKey) {
    try {
        const sharedSecret = await window.crypto.subtle.deriveBits(
            {
                name: "ECDH",
                public: theirPublicKey
            },
            myPrivateKey,
            256 // 256 bits = 32 bytes
        );

        return sharedSecret;
    } catch (error) {
        console.error("Error deriving shared secret:", error);
        throw new Error("Failed to derive shared secret: " + error.message);
    }
}

/**
 * Sign data using RSA private key
 * 
 * @param {string} privateKeyBase64 - Your RSA private key in Base64
 * @param {ArrayBuffer|string} data - Data to sign
 * @returns {Promise<ArrayBuffer>} Signature
 * 
 * HINT: 
 * 1. Import private key using importPrivateKey()
 * 2. Convert data to ArrayBuffer if it's a string
 * 3. Use window.crypto.subtle.sign with:
 *    - name: "RSA-PSS" or "RSASSA-PKCS1-v1_5"
 *    - saltLength: 32 (for RSA-PSS)
 */
export async function signData(privateKeyBase64, data) {
    try {
        const privateKey = await importPrivateKey(privateKeyBase64);

        // Convert data to ArrayBuffer if it's a string
        let dataBuffer;
        if (typeof data === 'string') {
            dataBuffer = new TextEncoder().encode(data);
        } else {
            dataBuffer = data;
        }

        const signature = await window.crypto.subtle.sign(
            {
                name: SIGNATURE_ALGORITHM
            },
            privateKey,
            dataBuffer
        );

        return signature;
    } catch (error) {
        console.error("Error signing data:", error);
        throw new Error("Failed to sign data: " + error.message);
    }
}

/**
 * Verify digital signature using RSA public key
 * 
 * @param {string} publicKeyBase64 - Sender's RSA public key in Base64
 * @param {ArrayBuffer} signature - Signature to verify
 * @param {ArrayBuffer|string} data - Original data
 * @returns {Promise<boolean>} True if signature is valid
 * 
 * HINT:
 * 1. Import public key using importPublicKey()
 * 2. Convert data to ArrayBuffer if it's a string
 * 3. Use window.crypto.subtle.verify with same algorithm as sign
 */
export async function verifySignature(publicKeyBase64, signature, data) {
    try {
        const publicKey = await importPublicKey(publicKeyBase64);

        // Convert data to ArrayBuffer if it's a string
        let dataBuffer;
        if (typeof data === 'string') {
            dataBuffer = new TextEncoder().encode(data);
        } else {
            dataBuffer = data;
        }

        const isValid = await window.crypto.subtle.verify(
            {
                name: SIGNATURE_ALGORITHM
            },
            publicKey,
            signature,
            dataBuffer
        );

        return isValid;
    } catch (error) {
        console.error("Error verifying signature:", error);
        return false;
    }
}

/**
 * Derive session key from shared secret using HKDF
 * 
 * @param {ArrayBuffer} sharedSecret - Shared secret from ECDH
 * @param {string} senderId - Sender's user ID
 * @param {string} receiverId - Receiver's user ID
 * @param {number} timestamp - Timestamp of key exchange
 * @returns {Promise<CryptoKey>} Session key for AES-GCM
 * 
 * HINT:
 * 1. Create additional data: senderId + receiverId + timestamp
 * 2. Generate random salt (16 bytes)
 * 3. Use window.crypto.subtle.deriveKey with:
 *    - name: "HKDF"
 *    - hash: "SHA-256"
 *    - salt: random salt
 *    - info: additional data as ArrayBuffer
 *    - derivedKeyType: { name: "AES-GCM", length: 256 }
 */
// HKDF implementation (not used in Option 2, but kept for reference)
export async function deriveSessionKeyHKDF(sharedSecret, senderId, receiverId, timestamp) {
    // This function is not used in Option 2 (Simplified)
    // We use SHA-256 instead
    // Keeping it for potential future use
    throw new Error("HKDF not used in simplified design. Use deriveSessionKeySHA256 instead.");
}

/**
 * Derive session key from shared secret using SHA-256 (alternative to HKDF)
 * 
 * @param {ArrayBuffer} sharedSecret - Shared secret from ECDH
 * @param {string} senderId - Sender's user ID
 * @param {string} receiverId - Receiver's user ID
 * @param {number} timestamp - Timestamp of key exchange
 * @returns {Promise<CryptoKey>} Session key for AES-GCM
 * 
 * HINT:
 * 1. Create combined data: sharedSecret + senderId + receiverId + timestamp
 * 2. Hash with SHA-256: window.crypto.subtle.digest("SHA-256", combinedData)
 * 3. Import the hash as an AES key using window.crypto.subtle.importKey
 */
export async function deriveSessionKeySHA256(sharedSecret, senderId, receiverId, timestamp) {
    try {
        // Create combined data: sharedSecret + senderId + receiverId + timestamp
        const sharedSecretArray = new Uint8Array(sharedSecret);
        const senderIdBytes = new TextEncoder().encode(senderId);
        const receiverIdBytes = new TextEncoder().encode(receiverId);
        const timestampBytes = new TextEncoder().encode(timestamp.toString());

        // Combine all data
        const combinedLength = sharedSecretArray.length + senderIdBytes.length + receiverIdBytes.length + timestampBytes.length;
        const combined = new Uint8Array(combinedLength);
        let offset = 0;

        combined.set(sharedSecretArray, offset);
        offset += sharedSecretArray.length;
        combined.set(senderIdBytes, offset);
        offset += senderIdBytes.length;
        combined.set(receiverIdBytes, offset);
        offset += receiverIdBytes.length;
        combined.set(timestampBytes, offset);

        // Hash with SHA-256
        const hash = await window.crypto.subtle.digest("SHA-256", combined);

        // Import the hash as an AES-GCM key
        const sessionKey = await window.crypto.subtle.importKey(
            "raw",
            hash,
            {
                name: "AES-GCM",
                length: 256
            },
            true, // extractable
            ["encrypt", "decrypt"]
        );

        return sessionKey;
    } catch (error) {
        console.error("Error deriving session key:", error);
        throw new Error("Failed to derive session key: " + error.message);
    }
}

/**
 * Create key exchange initiation message
 * 
 * @param {CryptoKey} ecdhPublicKey - Your ECDH public key
 * @param {string} receiverId - Receiver's user ID
 * @param {string} myPrivateKeyBase64 - Your RSA private key
 * @returns {Promise<Object>} Key exchange message
 * 
 * YOUR PROTOCOL DESIGN:
 * - What fields should this message contain?
 * - How should you structure it?
 * - What should be signed?
 * 
 * SUGGESTED STRUCTURE:
 * {
 *   type: "KEY_EXCHANGE_INIT",
 *   senderId: "...",
 *   receiverId: "...",
 *   ecdhPublicKey: "...", // Base64
 *   timestamp: 1234567890,
 *   nonce: "...", // Random nonce
 *   signature: "..." // Signature of the above fields
 * }
 */
export async function createKeyExchangeInit(ecdhPublicKey, receiverId, myPrivateKeyBase64, senderId, conversationId) {
    try {
        // Export ECDH public key
        const ecdhPublicKeyBase64 = await exportECDHPublicKey(ecdhPublicKey);

        // Generate nonce and timestamp
        const nonce = await generateNonce();
        const timestamp = Date.now();

        // Get device info and app version (custom fields)
        const deviceInfo = navigator.userAgent || "Unknown";
        const appVersion = "1.0.0"; // You can make this dynamic

        // Create message object (without signature)
        const messageData = {
            type: "KEY_EXCHANGE_INIT",
            senderId: senderId,
            receiverId: receiverId,
            conversationId: conversationId,
            ecdhPublicKey: ecdhPublicKeyBase64,
            timestamp: timestamp,
            nonce: nonce,
            deviceInfo: deviceInfo,
            appVersion: appVersion
        };

        // Convert message to string for signing (excluding signature field)
        const messageString = JSON.stringify(messageData);

        // Sign the message
        const signature = await signData(myPrivateKeyBase64, messageString);
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

        // Add signature to message
        messageData.signature = signatureBase64;

        return messageData;
    } catch (error) {
        console.error("Error creating key exchange init:", error);
        throw new Error("Failed to create key exchange initiation: " + error.message);
    }
}

/**
 * Handle incoming key exchange initiation
 * 
 * @param {Object} message - Key exchange message from sender
 * @param {string} senderPublicKeyBase64 - Sender's RSA public key
 * @returns {Promise<{valid: boolean, ecdhPublicKey?: CryptoKey, error?: string}>}
 * 
 * YOUR TASK:
 * 1. Verify the signature
 * 2. Check timestamp (prevent replay attacks)
 * 3. Check nonce (prevent replay attacks)
 * 4. Import the ECDH public key
 * 5. Return validation result
 */
export async function validateKeyExchangeInit(message, senderPublicKeyBase64) {
    try {
        // Extract signature
        const signatureBase64 = message.signature;
        if (!signatureBase64) {
            return { valid: false, error: "Missing signature" };
        }

        // Create message copy without signature for verification
        const messageCopy = { ...message };
        delete messageCopy.signature;
        const messageString = JSON.stringify(messageCopy);

        // Convert signature from Base64
        const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));

        // Verify signature
        const isValid = await verifySignature(senderPublicKeyBase64, signature, messageString);
        if (!isValid) {
            return { valid: false, error: "Invalid signature" };
        }

        // Check timestamp (prevent replay attacks)
        const now = Date.now();
        const messageTime = message.timestamp;
        const timeDiff = Math.abs(now - messageTime);
        if (timeDiff > TIMESTAMP_TOLERANCE) {
            return { valid: false, error: "Message timestamp out of tolerance" };
        }

        // Check nonce (prevent replay attacks)
        const nonce = message.nonce;
        if (seenNonces.has(nonce)) {
            return { valid: false, error: "Nonce already seen (replay attack)" };
        }
        seenNonces.add(nonce);

        // Import ECDH public key
        const ecdhPublicKey = await importECDHPublicKey(message.ecdhPublicKey);

        return {
            valid: true,
            ecdhPublicKey: ecdhPublicKey,
            senderId: message.senderId,
            conversationId: message.conversationId,
            timestamp: message.timestamp
        };
    } catch (error) {
        console.error("Error validating key exchange init:", error);
        return { valid: false, error: "Validation error: " + error.message };
    }
}

/**
 * Create key exchange response message
 * 
 * @param {CryptoKey} myECDHPublicKey - Your ECDH public key
 * @param {CryptoKey} theirECDHPublicKey - Their ECDH public key
 * @param {CryptoKey} myECDHPrivateKey - Your ECDH private key
 * @param {string} senderId - Original sender's ID
 * @param {string} myPrivateKeyBase64 - Your RSA private key
 * @returns {Promise<Object>} Response message with session key info
 * 
 * YOUR TASK:
 * 1. Derive shared secret
 * 2. Derive session key
 * 3. Create response message
 * 4. Sign the message
 */
export async function createKeyExchangeResponse(
    myECDHPublicKey,
    theirECDHPublicKey,
    myECDHPrivateKey,
    senderId,
    myPrivateKeyBase64,
    receiverId,
    conversationId
) {
    try {
        // Derive shared secret
        const sharedSecret = await deriveSharedSecret(myECDHPrivateKey, theirECDHPublicKey);

        // Get timestamp from original message (we'll need to pass it)
        const timestamp = Date.now();

        // Derive session key (use consistent order: smaller ID first)
        const ids = [senderId, receiverId].sort();
        const sessionKey = await deriveSessionKeySHA256(sharedSecret, ids[0], ids[1], timestamp);

        // Export ECDH public key
        const myECDHPublicKeyBase64 = await exportECDHPublicKey(myECDHPublicKey);

        // Generate nonce
        const nonce = await generateNonce();

        // Get device info
        const deviceInfo = navigator.userAgent || "Unknown";
        const appVersion = "1.0.0";

        // Create hash-based confirmation.
        // Must match verify order in completeKeyExchange (theirId first, myId second)
        const confirmationData = `KEY_CONFIRMED_${receiverId}_${senderId}_${timestamp}`;
        const confirmationHash = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(confirmationData));
        const confirmationHashBase64 = btoa(String.fromCharCode(...new Uint8Array(confirmationHash)));

        // Create response message
        const responseData = {
            type: "KEY_EXCHANGE_RESPONSE",
            senderId: receiverId, // This is the responder
            receiverId: senderId, // Original initiator
            conversationId: conversationId,
            ecdhPublicKey: myECDHPublicKeyBase64,
            timestamp: timestamp,
            nonce: nonce,
            confirmationHash: confirmationHashBase64,
            deviceInfo: deviceInfo,
            appVersion: appVersion
        };

        // Sign the message
        const messageString = JSON.stringify(responseData);
        const signature = await signData(myPrivateKeyBase64, messageString);
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

        responseData.signature = signatureBase64;

        // Store session key before returning
        const convId = conversationId || `${senderId}_${receiverId}`;
        await storeSessionKey(convId, sessionKey, timestamp);

        // Return response and session key
        return {
            response: responseData,
            sessionKey: sessionKey,
            timestamp: timestamp
        };
    } catch (error) {
        console.error("Error creating key exchange response:", error);
        throw new Error("Failed to create key exchange response: " + error.message);
    }
}

/**
 * Complete key exchange and get session key
 * 
 * @param {Object} responseMessage - Response from other party
 * @param {CryptoKey} myECDHPrivateKey - Your ECDH private key
 * @param {CryptoKey} theirECDHPublicKey - Their ECDH public key
 * @param {string} theirPublicKeyBase64 - Their RSA public key
 * @param {string} myId - Your user ID
 * @param {string} theirId - Their user ID
 * @returns {Promise<CryptoKey>} Session key for encryption
 * 
 * YOUR TASK:
 * 1. Verify response signature
 * 2. Derive shared secret
 * 3. Derive session key
 * 4. Store session key (you'll need to implement storage)
 * 5. Return session key
 */
export async function completeKeyExchange(
    responseMessage,
    myECDHPrivateKey,
    theirPublicKeyBase64,
    myId,
    theirId,
    conversationId
) {
    try {
        // Verify signature
        const signatureBase64 = responseMessage.signature;
        if (!signatureBase64) {
            throw new Error("Missing signature in response");
        }

        const messageCopy = { ...responseMessage };
        delete messageCopy.signature;
        const messageString = JSON.stringify(messageCopy);

        const signature = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
        const isValid = await verifySignature(theirPublicKeyBase64, signature, messageString);
        if (!isValid) {
            throw new Error("Invalid signature in response");
        }

        // Check timestamp
        const now = Date.now();
        const messageTime = responseMessage.timestamp;
        const timeDiff = Math.abs(now - messageTime);
        if (timeDiff > TIMESTAMP_TOLERANCE) {
            throw new Error("Response timestamp out of tolerance");
        }

        // Check nonce
        const nonce = responseMessage.nonce;
        if (seenNonces.has(nonce)) {
            throw new Error("Nonce already seen (replay attack)");
        }
        seenNonces.add(nonce);

        // Import their ECDH public key from response
        const theirECDHPublicKey = await importECDHPublicKey(responseMessage.ecdhPublicKey);

        // Derive shared secret
        const sharedSecret = await deriveSharedSecret(myECDHPrivateKey, theirECDHPublicKey);

        // Derive session key (must use same timestamp as response, and same ID order)
        const timestamp = responseMessage.timestamp;
        // Use consistent order: smaller ID first (same as in createKeyExchangeResponse)
        const ids = [theirId, myId].sort();
        const sessionKey = await deriveSessionKeySHA256(sharedSecret, ids[0], ids[1], timestamp);

        // Verify confirmation hash
        const confirmationData = `KEY_CONFIRMED_${theirId}_${myId}_${timestamp}`;
        const expectedHash = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(confirmationData));
        const expectedHashBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedHash)));

        if (responseMessage.confirmationHash !== expectedHashBase64) {
            throw new Error("Confirmation hash mismatch");
        }

        // Store session key
        await storeSessionKey(conversationId, sessionKey, timestamp);

        return sessionKey;
    } catch (error) {
        console.error("Error completing key exchange:", error);
        throw new Error("Failed to complete key exchange: " + error.message);
    }
}

/**
 * Store session key for a conversation
 * 
 * @param {string} conversationId - Conversation/chat ID
 * @param {CryptoKey} sessionKey - Session key to store
 * @returns {Promise<boolean>} Success status
 * 
 * HINT: Store in IndexedDB similar to how you store private keys
 */
export async function storeSessionKey(conversationId, sessionKey, timestamp) {
    try {
        const dbName = "ChatAppKeysDB";
        const storeName = "sessionKeys";
        const version = 2; // must be >= DB_VERSION in keyStorage.js

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, version);

            request.onupgradeneeded = ({ target }) => {
                const db = target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };

            request.onerror = ({ target }) => reject(target.error);

            request.onsuccess = ({ target }) => {
                const db = target.result;

                // Safety: if store is still missing for some reason, create it via versionchange
                if (!db.objectStoreNames.contains(storeName)) {
                    console.warn("sessionKeys store missing; reopening DB with higher version to create it");
                    db.close();
                    const upgradeRequest = indexedDB.open(dbName, version + 1);
                    upgradeRequest.onupgradeneeded = ({ target: upgradeTarget }) => {
                        const upgradeDb = upgradeTarget.result;
                        if (!upgradeDb.objectStoreNames.contains(storeName)) {
                            upgradeDb.createObjectStore(storeName);
                        }
                    };
                    upgradeRequest.onsuccess = ({ target: upgradeTarget }) => {
                        const upgradeDb = upgradeTarget.result;
                        // Retry storing with new DB
                        window.crypto.subtle.exportKey("raw", sessionKey)
                            .then(exported => {
                                const keyData = {
                                    key: exported,
                                    timestamp: timestamp || Date.now(),
                                    expiresAt: (timestamp || Date.now()) + SESSION_KEY_EXPIRY
                                };
                                const transaction = upgradeDb.transaction(storeName, "readwrite");
                                const store = transaction.objectStore(storeName);
                                const putRequest = store.put(keyData, `sessionKey-${conversationId}`);
                                putRequest.onsuccess = () => {
                                    console.log(`Session key stored for conversation (upgrade path): ${conversationId}`);
                                    resolve(true);
                                };
                                putRequest.onerror = () => reject(putRequest.error);
                                transaction.onerror = () => reject(transaction.error);
                            })
                            .catch(reject);
                    };
                    upgradeRequest.onerror = ({ target: upgradeTarget }) => reject(upgradeTarget.error);
                    return;
                }

                // Export session key
                window.crypto.subtle.exportKey("raw", sessionKey)
                    .then(exported => {
                        // Store with expiration timestamp
                        const keyData = {
                            key: exported,
                            timestamp: timestamp || Date.now(),
                            expiresAt: (timestamp || Date.now()) + SESSION_KEY_EXPIRY
                        };

                        const transaction = db.transaction(storeName, "readwrite");
                        const store = transaction.objectStore(storeName);
                        const putRequest = store.put(keyData, `sessionKey-${conversationId}`);

                        putRequest.onsuccess = () => {
                            console.log(`Session key stored for conversation: ${conversationId}`);
                            resolve(true);
                        };

                        putRequest.onerror = () => reject(putRequest.error);
                        transaction.onerror = () => reject(transaction.error);
                    })
                    .catch(reject);
            };
        });
    } catch (error) {
        console.error("Error storing session key:", error);
        throw new Error("Failed to store session key: " + error.message);
    }
}

/**
 * Retrieve session key for a conversation
 * 
 * @param {string} conversationId - Conversation/chat ID
 * @returns {Promise<CryptoKey|null>} Session key or null if not found
 */
export async function retrieveSessionKey(conversationId) {
    try {
        const dbName = "ChatAppKeysDB";
        const storeName = "sessionKeys";

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 2);

            request.onerror = ({ target }) => reject(target.error);

            request.onsuccess = ({ target }) => {
                const db = target.result;

                if (!db.objectStoreNames.contains(storeName)) {
                    resolve(null);
                    return;
                }

                const transaction = db.transaction(storeName, "readonly");
                const store = transaction.objectStore(storeName);
                const getRequest = store.get(`sessionKey-${conversationId}`);

                getRequest.onsuccess = async () => {
                    const result = getRequest.result;
                    if (!result) {
                        resolve(null);
                        return;
                    }

                    // Check if key has expired
                    const now = Date.now();
                    if (result.expiresAt && now > result.expiresAt) {
                        // Key expired, delete it
                        const deleteTransaction = db.transaction(storeName, "readwrite");
                        deleteTransaction.objectStore(storeName).delete(`sessionKey-${conversationId}`);
                        resolve(null);
                        return;
                    }

                    // Import the key
                    try {
                        const sessionKey = await window.crypto.subtle.importKey(
                            "raw",
                            result.key,
                            {
                                name: "AES-GCM",
                                length: 256
                            },
                            true,
                            ["encrypt", "decrypt"]
                        );

                        resolve(sessionKey);
                    } catch (error) {
                        console.error("Error importing session key:", error);
                        resolve(null);
                    }
                };

                getRequest.onerror = () => reject(getRequest.error);
            };
        });
    } catch (error) {
        console.error("Error retrieving session key:", error);
        return null;
    }
}

/**
 * Generate a random nonce for replay protection
 * 
 * @param {number} length - Length in bytes (default: 16)
 * @returns {Promise<string>} Base64 encoded nonce
 */
export async function generateNonce(length = 16) {
    try {
        const randomBytes = new Uint8Array(length);
        window.crypto.getRandomValues(randomBytes);
        const base64 = btoa(String.fromCharCode(...randomBytes));
        return base64;
    } catch (error) {
        console.error("Error generating nonce:", error);
        throw new Error("Failed to generate nonce: " + error.message);
    }
}

