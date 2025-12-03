/**
 * MITM (Man-in-the-Middle) Attack Demonstration Script
 * 
 * This script demonstrates:
 * 1. How an attacker can intercept and modify key exchange messages
 * 2. How MITM attacks work without signature verification
 * 3. How digital signatures prevent MITM attacks
 * 
 * WARNING: This is for educational/demonstration purposes only!
 */

import crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * MITM Attacker Class
 * 
 * Simulates an attacker who intercepts key exchange messages
 */
class MITMAttacker {
    constructor() {
        this.interceptedMessages = [];
        this.attackerECDHKeyPair = null;
        this.attackerRSAKeyPair = null;
    }

    /**
     * Generate attacker's ECDH key pair (to replace intercepted keys)
     */
    async generateAttackerECDHKeyPair() {
        // In a real attack, the attacker would generate their own ECDH key pair
        // to replace the legitimate keys in the key exchange
        console.log("[MITM] Generating attacker's ECDH key pair...");
        
        // Note: In Node.js, we'd use crypto.createECDH
        // For demonstration, we'll simulate this
        this.attackerECDHKeyPair = {
            publicKey: "attacker_ecdh_public_key",
            privateKey: "attacker_ecdh_private_key"
        };
        
        return this.attackerECDHKeyPair;
    }

    /**
     * Generate attacker's RSA key pair (to forge signatures)
     */
    async generateAttackerRSAKeyPair() {
        console.log("[MITM] Generating attacker's RSA key pair...");
        
        return new Promise((resolve, reject) => {
            crypto.generateKeyPair(
                'rsa',
                {
                    modulusLength: 2048,
                    publicKeyEncoding: { type: 'spki', format: 'pem' },
                    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
                },
                (err, publicKey, privateKey) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.attackerRSAKeyPair = { publicKey, privateKey };
                        resolve(this.attackerRSAKeyPair);
                    }
                }
            );
        });
    }

    /**
     * Intercept and modify key exchange initiation message
     * 
     * Attack scenario: Attacker replaces Alice's ECDH public key with their own
     */
    interceptKeyExchangeInit(originalMessage) {
        console.log("\n[MITM ATTACK] Intercepting key exchange initiation...");
        console.log("[MITM] Original message from Alice:", {
            senderId: originalMessage.senderId,
            receiverId: originalMessage.receiverId,
            ecdhPublicKey: originalMessage.ecdhPublicKey?.substring(0, 50) + "...",
            hasSignature: !!originalMessage.signature
        });

        // Store original message
        this.interceptedMessages.push({
            type: 'init',
            original: originalMessage,
            timestamp: Date.now()
        });

        // Create modified message (replace ECDH public key with attacker's)
        const modifiedMessage = {
            ...originalMessage,
            ecdhPublicKey: this.attackerECDHKeyPair?.publicKey || "attacker_key",
            // If signatures are NOT verified, this attack succeeds
            // If signatures ARE verified, the signature won't match and attack fails
        };

        console.log("[MITM] Modified message (ECDH key replaced):", {
            senderId: modifiedMessage.senderId,
            receiverId: modifiedMessage.receiverId,
            ecdhPublicKey: modifiedMessage.ecdhPublicKey?.substring(0, 50) + "...",
            hasSignature: !!modifiedMessage.signature,
            signatureValid: false // Signature won't match modified content
        });

        return modifiedMessage;
    }

    /**
     * Intercept and modify key exchange response message
     */
    interceptKeyExchangeResponse(originalMessage) {
        console.log("\n[MITM ATTACK] Intercepting key exchange response...");
        console.log("[MITM] Original message from Bob:", {
            senderId: originalMessage.senderId,
            receiverId: originalMessage.receiverId,
            ecdhPublicKey: originalMessage.ecdhPublicKey?.substring(0, 50) + "...",
            hasSignature: !!originalMessage.signature
        });

        // Store original message
        this.interceptedMessages.push({
            type: 'response',
            original: originalMessage,
            timestamp: Date.now()
        });

        // Create modified message
        const modifiedMessage = {
            ...originalMessage,
            ecdhPublicKey: this.attackerECDHKeyPair?.publicKey || "attacker_key",
        };

        console.log("[MITM] Modified message (ECDH key replaced):", {
            senderId: modifiedMessage.senderId,
            receiverId: modifiedMessage.receiverId,
            ecdhPublicKey: modifiedMessage.ecdhPublicKey?.substring(0, 50) + "...",
            hasSignature: !!modifiedMessage.signature,
            signatureValid: false
        });

        return modifiedMessage;
    }

    /**
     * Demonstrate MITM attack WITHOUT signature verification
     * 
     * Scenario: System doesn't verify signatures
     * Result: Attack succeeds - attacker can derive session keys
     */
    async demonstrateMITMWithoutSignatures() {
        console.log("\n" + "=".repeat(80));
        console.log("MITM ATTACK DEMONSTRATION: WITHOUT SIGNATURE VERIFICATION");
        console.log("=".repeat(80));

        // Step 1: Attacker generates their own keys
        await this.generateAttackerECDHKeyPair();
        await this.generateAttackerRSAKeyPair();

        // Step 2: Simulate Alice's key exchange initiation
        const aliceInit = {
            type: "KEY_EXCHANGE_INIT",
            senderId: "alice_id",
            receiverId: "bob_id",
            ecdhPublicKey: "alice_ecdh_public_key",
            timestamp: Date.now(),
            nonce: "alice_nonce",
            signature: "alice_signature"
        };

        // Step 3: Attacker intercepts and modifies
        const modifiedInit = this.interceptKeyExchangeInit(aliceInit);

        // Step 4: Bob receives modified message (thinks it's from Alice)
        console.log("\n[VULNERABILITY] Bob receives modified message:");
        console.log("  - Bob thinks ECDH key is from Alice");
        console.log("  - Bob doesn't verify signature (vulnerability)");
        console.log("  - Bob proceeds with key exchange using attacker's key");

        // Step 5: Attacker can now derive session key
        console.log("\n[ATTACK SUCCESS] Attacker can now:");
        console.log("  1. Derive shared secret with Bob (using attacker's private key)");
        console.log("  2. Derive shared secret with Alice (using attacker's private key)");
        console.log("  3. Decrypt all messages between Alice and Bob");
        console.log("  4. Modify messages without detection");

        return {
            attackSuccessful: true,
            reason: "No signature verification - attacker's modified message accepted",
            interceptedMessages: this.interceptedMessages
        };
    }

    /**
     * Demonstrate MITM attack WITH signature verification
     * 
     * Scenario: System verifies signatures
     * Result: Attack fails - signature doesn't match modified content
     */
    async demonstrateMITMWithSignatures() {
        console.log("\n" + "=".repeat(80));
        console.log("MITM ATTACK PREVENTION: WITH SIGNATURE VERIFICATION");
        console.log("=".repeat(80));

        // Step 1: Attacker generates their own keys
        await this.generateAttackerECDHKeyPair();
        await this.generateAttackerRSAKeyPair();

        // Step 2: Simulate Alice's key exchange initiation
        const aliceInit = {
            type: "KEY_EXCHANGE_INIT",
            senderId: "alice_id",
            receiverId: "bob_id",
            ecdhPublicKey: "alice_ecdh_public_key",
            timestamp: Date.now(),
            nonce: "alice_nonce",
            signature: "alice_signature_of_original_message"
        };

        // Step 3: Attacker intercepts and modifies
        const modifiedInit = this.interceptKeyExchangeInit(aliceInit);

        // Step 4: Bob receives modified message and verifies signature
        console.log("\n[PROTECTION] Bob receives modified message:");
        console.log("  - Bob extracts signature from message");
        console.log("  - Bob gets Alice's public key from server");
        console.log("  - Bob verifies signature against modified message content");

        // Step 5: Signature verification fails
        const signatureValid = false; // Signature doesn't match modified content
        console.log("\n[SIGNATURE VERIFICATION]");
        console.log(`  Signature valid: ${signatureValid}`);
        console.log("  Reason: Signature was created for original message, not modified one");

        if (!signatureValid) {
            console.log("\n[ATTACK PREVENTED] Attack fails:");
            console.log("  1. Signature verification fails");
            console.log("  2. Modified message is rejected");
            console.log("  3. Key exchange is aborted");
            console.log("  4. Attacker cannot derive session keys");
            console.log("  5. Attack logged for security auditing");
        }

        return {
            attackSuccessful: false,
            reason: "Signature verification failed - modified message rejected",
            signatureValid: false,
            interceptedMessages: this.interceptedMessages
        };
    }

    /**
     * Demonstrate the difference between vulnerable and protected systems
     */
    async demonstrateComparison() {
        console.log("\n" + "=".repeat(80));
        console.log("COMPARISON: WITH vs WITHOUT SIGNATURE VERIFICATION");
        console.log("=".repeat(80));

        console.log("\n[SCENARIO 1: WITHOUT SIGNATURES]");
        const result1 = await this.demonstrateMITMWithoutSignatures();

        console.log("\n[SCENARIO 2: WITH SIGNATURES]");
        const result2 = await this.demonstrateMITMWithSignatures();

        console.log("\n" + "=".repeat(80));
        console.log("SUMMARY");
        console.log("=".repeat(80));
        console.log("\nWithout Signature Verification:");
        console.log(`  Attack Successful: ${result1.attackSuccessful}`);
        console.log(`  Reason: ${result1.reason}`);
        console.log("\nWith Signature Verification:");
        console.log(`  Attack Successful: ${result2.attackSuccessful}`);
        console.log(`  Reason: ${result2.reason}`);
        console.log("\nConclusion:");
        console.log("  Digital signatures are essential for preventing MITM attacks");
        console.log("  in key exchange protocols. Without signatures, attackers can");
        console.log("  intercept and modify key exchange messages undetected.");

        return {
            withoutSignatures: result1,
            withSignatures: result2
        };
    }
}

/**
 * Run MITM attack demonstration
 */
async function runMITMDemonstration() {
    const attacker = new MITMAttacker();
    
    console.log("\n" + "=".repeat(80));
    console.log("MITM ATTACK DEMONSTRATION");
    console.log("=".repeat(80));
    console.log("\nThis script demonstrates Man-in-the-Middle attacks on key exchange.");
    console.log("It shows how signatures prevent MITM attacks.\n");

    try {
        const results = await attacker.demonstrateComparison();
        
        console.log("\n" + "=".repeat(80));
        console.log("DEMONSTRATION COMPLETE");
        console.log("=".repeat(80));
        
        return results;
    } catch (error) {
        console.error("Error in MITM demonstration:", error);
        throw error;
    }
}

// Export for use in other scripts
export { MITMAttacker, runMITMDemonstration };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMITMDemonstration()
        .then(() => {
            console.log("\nDemonstration completed successfully.");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Demonstration failed:", error);
            process.exit(1);
        });
}
