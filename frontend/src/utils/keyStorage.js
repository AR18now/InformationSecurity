/**
 * Key Storage Utility Module
 * 
 * This module provides secure key management functions for:
 * - Storing private keys in IndexedDB
 * - Retrieving private keys from IndexedDB
 * - Importing/exporting keys in various formats
 * - Key verification and validation
 * - Key regeneration
 * 
 * All private keys are stored client-side only and never sent to the server.
 */

const DB_NAME = "ChatAppKeysDB";
// Bump version to ensure new object stores (like "sessionKeys") are created
const DB_VERSION = 2;
const STORE_NAME = "keys";

/**
 * Initialize IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = ({ target }) => {
            const db = target.result;
            // Ensure main key store exists
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            // Also ensure session key store exists (for E2EE session keys)
            if (!db.objectStoreNames.contains("sessionKeys")) {
                db.createObjectStore("sessionKeys");
            }
        };

        request.onerror = ({ target }) => reject(target.error);
        request.onsuccess = ({ target }) => resolve(target.result);
    });
}

/**
 * Generate RSA-2048 key pair for **signing** using Web Crypto API
 * 
 * We use RSASSA-PKCS1-v1_5 so the same key material works with our
 * key exchange signatures (sign/verify). All payload encryption is
 * done with AES-GCM using the derived session keys.
 * 
 * @returns {Promise<{publicKeyBase64: string, privateKeyBase64: string}>}
 */
export async function generateKeyPair() {
    try {
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true, // extractable
            ["sign", "verify"]
        );

        // Export public key in SPKI format (Base64)
        const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

        // Export private key in PKCS8 format (Base64)
        const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
        const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

        return { publicKeyBase64, privateKeyBase64 };
    } catch (error) {
        console.error("Error generating key pair:", error);
        throw new Error("Failed to generate key pair: " + error.message);
    }
}

/**
 * Store private key in IndexedDB
 * @param {string} privateKeyBase64 - Private key in Base64 format
 * @param {string} username - Username to associate with the key
 * @returns {Promise<boolean>} Success status
 */
export async function storePrivateKey(privateKeyBase64, username) {
    try {
        if (!privateKeyBase64 || !username) {
            throw new Error("Private key and username are required");
        }

        const db = await initDB();

        // Convert Base64 to Uint8Array for storage
        const binaryString = atob(privateKeyBase64);
        const keyBuffer = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const key = `privateKey-${username}`;

            const request = store.put(keyBuffer, key);

            request.onsuccess = () => {
                console.log(`Private key stored successfully for user: ${username}`);
                resolve(true);
            };

            request.onerror = () => {
                console.error("Error storing private key:", request.error);
                reject(new Error("Failed to store private key: " + request.error));
            };

            transaction.onerror = () => {
                console.error("Transaction error:", transaction.error);
                reject(new Error("Transaction failed: " + transaction.error));
            };
        });
    } catch (error) {
        console.error("Error in storePrivateKey:", error);
        throw error;
    }
}

/**
 * Retrieve private key from IndexedDB
 * @param {string} username - Username associated with the key
 * @returns {Promise<string|null>} Private key in Base64 format or null if not found
 */
export async function retrievePrivateKey(username) {
    try {
        if (!username) {
            throw new Error("Username is required");
        }

        const db = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const key = `privateKey-${username}`;

            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result;
                if (!result) {
                    console.warn(`No private key found for user: ${username}`);
                    resolve(null);
                    return;
                }

                // Convert Uint8Array back to Base64
                const base64String = btoa(String.fromCharCode(...new Uint8Array(result)));
                console.log(`Private key retrieved successfully for user: ${username}`);
                resolve(base64String);
            };

            request.onerror = () => {
                console.error("Error retrieving private key:", request.error);
                reject(new Error("Failed to retrieve private key: " + request.error));
            };
        });
    } catch (error) {
        console.error("Error in retrievePrivateKey:", error);
        throw error;
    }
}

/**
 * Import private key from Base64 to CryptoKey object
 * @param {string} privateKeyBase64 - Private key in Base64 format
 * @returns {Promise<CryptoKey>} Imported CryptoKey object
 */
export async function importPrivateKey(privateKeyBase64) {
    try {
        if (!privateKeyBase64) {
            throw new Error("Private key is required");
        }

        // Convert Base64 to ArrayBuffer
        const binaryString = atob(privateKeyBase64);
        const keyBuffer = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

        // Import the key for RSASSA-PKCS1-v1_5 signatures
        const privateKey = await window.crypto.subtle.importKey(
            "pkcs8",
            keyBuffer,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            },
            true, // extractable
            ["sign"]
        );

        return privateKey;
    } catch (error) {
        console.error("Error importing private key:", error);
        throw new Error("Failed to import private key: " + error.message);
    }
}

/**
 * Import public key from Base64 to CryptoKey object
 * @param {string} publicKeyBase64 - Public key in Base64 format
 * @returns {Promise<CryptoKey>} Imported CryptoKey object
 */
export async function importPublicKey(publicKeyBase64) {
    try {
        if (!publicKeyBase64) {
            throw new Error("Public key is required");
        }

        // Convert Base64 to ArrayBuffer
        const binaryString = atob(publicKeyBase64);
        const keyBuffer = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

        // Import the key for RSASSA-PKCS1-v1_5 verification
        const publicKey = await window.crypto.subtle.importKey(
            "spki",
            keyBuffer,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            },
            true, // extractable
            ["verify"]
        );

        return publicKey;
    } catch (error) {
        console.error("Error importing public key:", error);
        throw new Error("Failed to import public key: " + error.message);
    }
}

/**
 * Verify that a key pair is valid by testing encryption/decryption
 * @param {string} privateKeyBase64 - Private key in Base64 format
 * @param {string} publicKeyBase64 - Public key in Base64 format
 * @returns {Promise<boolean>} True if keys are valid and match
 */
export async function verifyKeyPair(privateKeyBase64, publicKeyBase64) {
    try {
        if (!privateKeyBase64 || !publicKeyBase64) {
            return false;
        }

        // Import both keys (RSASSA-PKCS1-v1_5)
        const privateKey = await importPrivateKey(privateKeyBase64);
        const publicKey = await importPublicKey(publicKeyBase64);

        // Test sign/verify with a random message
        const testMessage = new TextEncoder().encode("Key verification test");

        const signature = await window.crypto.subtle.sign(
            {
                name: "RSASSA-PKCS1-v1_5"
            },
            privateKey,
            testMessage
        );

        const isValid = await window.crypto.subtle.verify(
            {
                name: "RSASSA-PKCS1-v1_5"
            },
            publicKey,
            signature,
            testMessage
        );

        return isValid;
    } catch (error) {
        console.error("Error verifying key pair:", error);
        return false;
    }
}

/**
 * Check if a private key exists for a user
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if key exists
 */
export async function keyExists(username) {
    try {
        const key = await retrievePrivateKey(username);
        return key !== null;
    } catch (error) {
        console.error("Error checking key existence:", error);
        return false;
    }
}

/**
 * Delete private key from IndexedDB
 * @param {string} username - Username associated with the key
 * @returns {Promise<boolean>} Success status
 */
export async function deletePrivateKey(username) {
    try {
        if (!username) {
            throw new Error("Username is required");
        }

        const db = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const key = `privateKey-${username}`;

            const request = store.delete(key);

            request.onsuccess = () => {
                console.log(`Private key deleted successfully for user: ${username}`);
                resolve(true);
            };

            request.onerror = () => {
                console.error("Error deleting private key:", request.error);
                reject(new Error("Failed to delete private key: " + request.error));
            };
        });
    } catch (error) {
        console.error("Error in deletePrivateKey:", error);
        throw error;
    }
}

/**
 * Regenerate and replace private key for a user
 * This is useful for key rotation
 * @param {string} username - Username to regenerate key for
 * @returns {Promise<{publicKeyBase64: string, privateKeyBase64: string}>} New key pair
 */
export async function regenerateKeyPair(username) {
    try {
        // Generate new key pair
        const { publicKeyBase64, privateKeyBase64 } = await generateKeyPair();

        // Delete old key if exists
        if (await keyExists(username)) {
            await deletePrivateKey(username);
        }

        // Store new private key
        await storePrivateKey(privateKeyBase64, username);

        return { publicKeyBase64, privateKeyBase64 };
    } catch (error) {
        console.error("Error regenerating key pair:", error);
        throw new Error("Failed to regenerate key pair: " + error.message);
    }
}

/**
 * Get all stored key usernames (for debugging/admin purposes)
 * @returns {Promise<string[]>} Array of usernames with stored keys
 */
export async function getAllStoredKeys() {
    try {
        const db = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAllKeys();

            request.onsuccess = () => {
                const keys = request.result;
                // Extract usernames from keys (format: "privateKey-username")
                const usernames = keys
                    .map(key => {
                        if (typeof key === 'string' && key.startsWith('privateKey-')) {
                            return key.replace('privateKey-', '');
                        }
                        return null;
                    })
                    .filter(username => username !== null);
                resolve(usernames);
            };

            request.onerror = () => {
                console.error("Error getting all keys:", request.error);
                reject(new Error("Failed to get all keys: " + request.error));
            };
        });
    } catch (error) {
        console.error("Error in getAllStoredKeys:", error);
        throw error;
    }
}
