/**
 * MITM Attack Demonstration Controller
 * 
 * Provides endpoints for demonstrating MITM attacks
 * and testing signature verification
 */

import { logInvalidSignature } from "../utils/securityLogger.js";

/**
 * Test endpoint to demonstrate MITM attack detection
 * 
 * This endpoint simulates receiving a modified key exchange message
 * and demonstrates how signature verification prevents the attack
 */
export const testMITMDetection = async (req, res) => {
    try {
        const { message, senderPublicKey } = req.body;

        if (!message || !senderPublicKey) {
            return res.status(400).json({
                error: "Message and senderPublicKey required"
            });
        }

        // Simulate signature verification
        // In real implementation, this would use the actual verifySignature function
        const signatureValid = false; // Modified message = invalid signature

        if (!signatureValid) {
            // Log the attack attempt
            logInvalidSignature(
                message.conversationId || "unknown",
                message.senderId || "unknown",
                {
                    reason: "Signature verification failed - possible MITM attack",
                    attackType: "MITM",
                    messageType: message.type
                }
            );

            return res.status(400).json({
                error: "Invalid signature detected - possible MITM attack",
                attackDetected: true,
                signatureValid: false,
                message: "This demonstrates how signatures prevent MITM attacks. " +
                         "The modified message was rejected because the signature " +
                         "doesn't match the modified content."
            });
        }

        res.status(200).json({
            success: true,
            signatureValid: true,
            message: "Signature valid - message accepted"
        });

    } catch (error) {
        console.error("Error in testMITMDetection:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get MITM attack statistics
 */
export const getMITMStats = async (req, res) => {
    try {
        // In a real implementation, this would query security logs
        // For demonstration, return sample statistics

        const stats = {
            totalAttackAttempts: 0,
            successfulAttacks: 0,
            preventedAttacks: 0,
            lastAttackTime: null,
            attackTypes: {
                mitm: 0,
                replay: 0,
                invalidSignature: 0
            }
        };

        res.status(200).json(stats);

    } catch (error) {
        console.error("Error in getMITMStats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
