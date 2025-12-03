import User from "../models/user.model.js";
import { logKeyExchangeAttempt, logInvalidSignature, logReplayAttack } from "../utils/securityLogger.js";
import { validateReplayProtection } from "../utils/replayProtection.js";

// Temporary storage for key exchange messages (in production, use Redis or database)
const keyExchangeStore = new Map(); // conversationId -> { init: {...}, response: {...} }

/**
 * Get user's public key
 */
export const getUserPublicKey = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        if (!user.publicKey) {
            return res.status(404).json({ error: "Public key not found for user" });
        }

        res.status(200).json({
            userId: user._id,
            publicKey: user.publicKey
        });
    } catch (error) {
        console.error("Error in getUserPublicKey:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Handle key exchange initiation
 */
export const initiateKeyExchange = async (req, res) => {
    try {
        const message = req.body;
        const senderId = req.user._id;

        // Validate message
        if (!message.type || message.type !== "KEY_EXCHANGE_INIT") {
            return res.status(400).json({ error: "Invalid message type" });
        }

        if (message.senderId !== senderId.toString()) {
            return res.status(403).json({ error: "Sender ID mismatch" });
        }

        // Store the initiation message
        const conversationId = message.conversationId || `${message.senderId}_${message.receiverId}`;
        
        // Validate replay protection for key exchange
        const validation = validateReplayProtection(
            conversationId,
            message.nonce,
            message.timestamp || Date.now(),
            null, // No sequence number for key exchange
            null  // No message ID
        );

        if (!validation.valid) {
            return res.status(400).json({ 
                error: `Replay attack detected in key exchange: ${validation.reason}` 
            });
        }

        if (!keyExchangeStore.has(conversationId)) {
            keyExchangeStore.set(conversationId, {});
        }

        const store = keyExchangeStore.get(conversationId);
        store.init = message;
        store.initTimestamp = Date.now();

        // Clean up old entries (older than 5 minutes)
        setTimeout(() => {
            if (keyExchangeStore.has(conversationId)) {
                const entry = keyExchangeStore.get(conversationId);
                if (Date.now() - entry.initTimestamp > 5 * 60 * 1000) {
                    keyExchangeStore.delete(conversationId);
                }
            }
        }, 5 * 60 * 1000);

        console.log(`Key exchange initiated: ${message.senderId} -> ${message.receiverId}`);
        
        // Log key exchange attempt
        logKeyExchangeAttempt(message.senderId, message.receiverId, conversationId, true);

        res.status(200).json({
            success: true,
            message: "Key exchange initiation stored",
            conversationId: conversationId
        });
    } catch (error) {
        console.error("Error in initiateKeyExchange:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Handle key exchange response
 */
export const respondToKeyExchange = async (req, res) => {
    try {
        const message = req.body;
        const senderId = req.user._id;

        // Validate message
        if (!message.type || message.type !== "KEY_EXCHANGE_RESPONSE") {
            return res.status(400).json({ error: "Invalid message type" });
        }

        if (message.senderId !== senderId.toString()) {
            return res.status(403).json({ error: "Sender ID mismatch" });
        }

        // Store the response
        const conversationId = message.conversationId || `${message.receiverId}_${message.senderId}`;
        
        // Validate replay protection for key exchange response
        const validation = validateReplayProtection(
            conversationId,
            message.nonce,
            message.timestamp || Date.now(),
            null, // No sequence number for key exchange
            null  // No message ID
        );

        if (!validation.valid) {
            return res.status(400).json({ 
                error: `Replay attack detected in key exchange response: ${validation.reason}` 
            });
        }

        if (!keyExchangeStore.has(conversationId)) {
            keyExchangeStore.set(conversationId, {});
        }

        const store = keyExchangeStore.get(conversationId);
        store.response = message;
        store.responseTimestamp = Date.now();

        // Clean up old entries
        setTimeout(() => {
            if (keyExchangeStore.has(conversationId)) {
                const entry = keyExchangeStore.get(conversationId);
                if (Date.now() - entry.responseTimestamp > 5 * 60 * 1000) {
                    keyExchangeStore.delete(conversationId);
                }
            }
        }, 5 * 60 * 1000);

        console.log(`Key exchange response: ${message.senderId} -> ${message.receiverId}`);
        
        // Log key exchange response
        logKeyExchangeAttempt(message.senderId, message.receiverId, conversationId, true);

        res.status(200).json({
            success: true,
            message: "Key exchange response stored",
            conversationId: conversationId
        });
    } catch (error) {
        console.error("Error in respondToKeyExchange:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get key exchange response (polling endpoint)
 */
export const getKeyExchangeResponse = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        if (!keyExchangeStore.has(conversationId)) {
            return res.status(200).json({ response: null });
        }

        const store = keyExchangeStore.get(conversationId);

        // Check if response exists and is for this user
        if (store.response) {
            // Check if response is for this user (either as receiver or check by conversation participants)
            const responseReceiverId = store.response.receiverId?.toString() || store.response.receiverId;
            const currentUserId = userId.toString();
            
            if (responseReceiverId === currentUserId) {
                // Return response and clean up
                const response = store.response;
                keyExchangeStore.delete(conversationId);

                console.log(`Key exchange response retrieved for user ${currentUserId}, conversation ${conversationId}`);
                return res.status(200).json({
                    response: response,
                    found: true
                });
            }
        }

        // Check if init exists (for the other party to know exchange is pending)
        if (store.init) {
            return res.status(200).json({
                init: store.init,
                response: store.response || null,
                found: !!store.response
            });
        }

        res.status(200).json({ response: null, found: false });
    } catch (error) {
        console.error("Error in getKeyExchangeResponse:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get pending key exchange initiations for current user
 */
export const getPendingKeyExchanges = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const pending = [];

        for (const [conversationId, store] of keyExchangeStore.entries()) {
            if (store.init && store.init.receiverId === userId && !store.response) {
                pending.push({
                    conversationId: conversationId,
                    init: store.init,
                    senderId: store.init.senderId
                });
            }
        }

        res.status(200).json({ pending: pending });
    } catch (error) {
        console.error("Error in getPendingKeyExchanges:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

