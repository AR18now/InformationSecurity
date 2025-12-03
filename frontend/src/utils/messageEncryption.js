/**
 * Message Encryption/Decryption Utilities
 * 
 * Implements AES-256-GCM encryption for end-to-end encrypted messaging
 * 
 * Features:
 * - AES-256-GCM encryption
 * - Random IV per message
 * - Authentication tag for integrity
 * - Client-side only encryption/decryption
 */

/**
 * Encrypt a message using AES-256-GCM
 * 
 * @param {string} plaintext - Message to encrypt
 * @param {CryptoKey} sessionKey - Session key from key exchange
 * @returns {Promise<{ciphertext: string, iv: string, authTag: string}>}
 * 
 * Returns Base64 encoded ciphertext, IV, and auth tag
 */
export async function encryptMessage(plaintext, sessionKey) {
    try {
        if (!plaintext || !sessionKey) {
            throw new Error("Plaintext and session key are required");
        }

        // Convert plaintext to ArrayBuffer
        const plaintextBuffer = new TextEncoder().encode(plaintext);

        // Generate random IV (12 bytes for GCM)
        const iv = new Uint8Array(12);
        window.crypto.getRandomValues(iv);

        // Encrypt using AES-GCM
        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128 // 128-bit authentication tag
            },
            sessionKey,
            plaintextBuffer
        );

        // Extract ciphertext and auth tag
        // In AES-GCM, the auth tag is appended to the ciphertext
        const ciphertextArray = new Uint8Array(ciphertext);
        const tagLength = 16; // 128 bits = 16 bytes
        const actualCiphertext = ciphertextArray.slice(0, ciphertextArray.length - tagLength);
        const authTag = ciphertextArray.slice(ciphertextArray.length - tagLength);

        // Convert to Base64 for storage/transmission
        const ciphertextBase64 = btoa(String.fromCharCode(...actualCiphertext));
        const ivBase64 = btoa(String.fromCharCode(...iv));
        const authTagBase64 = btoa(String.fromCharCode(...authTag));

        return {
            ciphertext: ciphertextBase64,
            iv: ivBase64,
            authTag: authTagBase64
        };
    } catch (error) {
        console.error("Error encrypting message:", error);
        throw new Error("Failed to encrypt message: " + error.message);
    }
}

/**
 * Decrypt a message using AES-256-GCM
 * 
 * @param {string} ciphertextBase64 - Encrypted message (Base64)
 * @param {string} ivBase64 - Initialization vector (Base64)
 * @param {string} authTagBase64 - Authentication tag (Base64)
 * @param {CryptoKey} sessionKey - Session key from key exchange
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decryptMessage(ciphertextBase64, ivBase64, authTagBase64, sessionKey) {
    try {
        if (!ciphertextBase64 || !ivBase64 || !authTagBase64 || !sessionKey) {
            throw new Error("Ciphertext, IV, auth tag, and session key are required");
        }

        // Convert from Base64 to ArrayBuffer
        const ciphertextArray = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const authTag = Uint8Array.from(atob(authTagBase64), c => c.charCodeAt(0));

        // Combine ciphertext and auth tag (AES-GCM expects them together)
        const combinedLength = ciphertextArray.length + authTag.length;
        const combinedCiphertext = new Uint8Array(combinedLength);
        combinedCiphertext.set(ciphertextArray, 0);
        combinedCiphertext.set(authTag, ciphertextArray.length);

        // Decrypt using AES-GCM
        const plaintextBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128
            },
            sessionKey,
            combinedCiphertext
        );

        // Convert to string
        const plaintext = new TextDecoder().decode(plaintextBuffer);

        return plaintext;
    } catch (error) {
        console.error("Error decrypting message:", error);
        
        // Check if it's an authentication failure
        if (error.name === "OperationError" || error.message.includes("decrypt")) {
            throw new Error("Decryption failed: Message may be corrupted or key is invalid");
        }
        
        throw new Error("Failed to decrypt message: " + error.message);
    }
}

/**
 * Encrypt a file using AES-256-GCM
 * 
 * @param {File|Blob} file - File to encrypt
 * @param {CryptoKey} sessionKey - Session key from key exchange
 * @returns {Promise<{ciphertext: string, iv: string, authTag: string, fileName: string, fileType: string, fileSize: number}>}
 */
export async function encryptFile(file, sessionKey) {
    try {
        if (!file || !sessionKey) {
            throw new Error("File and session key are required");
        }

        // Read file as ArrayBuffer
        const fileBuffer = await file.arrayBuffer();

        // Generate random IV
        const iv = new Uint8Array(12);
        window.crypto.getRandomValues(iv);

        // Encrypt file
        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128
            },
            sessionKey,
            fileBuffer
        );

        // Extract ciphertext and auth tag
        const ciphertextArray = new Uint8Array(ciphertext);
        const tagLength = 16;
        const actualCiphertext = ciphertextArray.slice(0, ciphertextArray.length - tagLength);
        const authTag = ciphertextArray.slice(ciphertextArray.length - tagLength);

        // Convert to Base64 (handle large files by converting Uint8Array to binary string in chunks)
        const chunkSize = 8192; // Process 8KB chunks
        let binaryString = '';
        for (let i = 0; i < actualCiphertext.length; i += chunkSize) {
            const chunk = actualCiphertext.slice(i, i + chunkSize);
            binaryString += String.fromCharCode.apply(null, Array.from(chunk));
        }
        const ciphertextBase64 = btoa(binaryString);
        const ivBase64 = btoa(String.fromCharCode(...iv));
        const authTagBase64 = btoa(String.fromCharCode(...authTag));

        return {
            ciphertext: ciphertextBase64,
            iv: ivBase64,
            authTag: authTagBase64,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
        };
    } catch (error) {
        console.error("Error encrypting file:", error);
        throw new Error("Failed to encrypt file: " + error.message);
    }
}

/**
 * Decrypt a file using AES-256-GCM
 * 
 * @param {string} ciphertextBase64 - Encrypted file data (Base64)
 * @param {string} ivBase64 - Initialization vector (Base64)
 * @param {string} authTagBase64 - Authentication tag (Base64)
 * @param {string} fileName - Original file name
 * @param {string} fileType - Original file MIME type
 * @param {CryptoKey} sessionKey - Session key from key exchange
 * @returns {Promise<Blob>} Decrypted file as Blob
 */
export async function decryptFile(ciphertextBase64, ivBase64, authTagBase64, fileName, fileType, sessionKey) {
    try {
        if (!ciphertextBase64 || !ivBase64 || !authTagBase64 || !sessionKey) {
            throw new Error("All parameters are required for file decryption");
        }

        // Convert from Base64
        const ciphertextArray = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const authTag = Uint8Array.from(atob(authTagBase64), c => c.charCodeAt(0));

        // Combine ciphertext and auth tag
        const combinedLength = ciphertextArray.length + authTag.length;
        const combinedCiphertext = new Uint8Array(combinedLength);
        combinedCiphertext.set(ciphertextArray, 0);
        combinedCiphertext.set(authTag, ciphertextArray.length);

        // Decrypt
        const fileBuffer = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
                tagLength: 128
            },
            sessionKey,
            combinedCiphertext
        );

        // Create Blob from decrypted data
        const blob = new Blob([fileBuffer], { type: fileType });

        return blob;
    } catch (error) {
        console.error("Error decrypting file:", error);
        if (error.name === "OperationError" || error.message.includes("decrypt")) {
            throw new Error("File decryption failed: File may be corrupted or key is invalid");
        }
        throw new Error("Failed to decrypt file: " + error.message);
    }
}

/**
 * Verify message integrity using auth tag
 * (This is done automatically during decryption, but can be used for validation)
 * 
 * @param {string} ciphertextBase64 - Encrypted message
 * @param {string} ivBase64 - IV
 * @param {string} authTagBase64 - Auth tag
 * @param {CryptoKey} sessionKey - Session key
 * @returns {Promise<boolean>} True if message is valid
 */
export async function verifyMessageIntegrity(ciphertextBase64, ivBase64, authTagBase64, sessionKey) {
    try {
        // Attempt decryption - if it succeeds, integrity is verified
        await decryptMessage(ciphertextBase64, ivBase64, authTagBase64, sessionKey);
        return true;
    } catch (error) {
        return false;
    }
}
