import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { validateReplayProtection } from "../utils/replayProtection.js";

export const sendMessage = async (req, res) => {
    try {
        // Accept encrypted message data (NO PLAINTEXT ALLOWED)
        const { 
            ciphertext, 
            iv, 
            authTag, 
            messageType = 'text',
            sequenceNumber,
            messageTimestamp,
            nonce,
            fileName,
            fileType,
            fileSize
        } = req.body;

        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        // Validate that encrypted data is present (NO PLAINTEXT)
        if (!ciphertext || !iv || !authTag) {
            return res.status(400).json({ 
                error: "Encrypted message data required (ciphertext, iv, authTag). Plaintext messages are not allowed." 
            });
        }

        // Reject if plaintext message is sent (security check)
        if (req.body.message && typeof req.body.message === 'string') {
            console.warn("SECURITY WARNING: Plaintext message detected and rejected");
            return res.status(400).json({ 
                error: "Plaintext messages are not allowed. All messages must be encrypted client-side." 
            });
        }

        // Find or create conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] },
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
            });
        }

        // Validate replay protection (nonce, timestamp, sequence number)
        const conversationId = conversation._id.toString();
        const sequenceContextId = `${conversationId}_${senderId.toString()}`;
        const validation = validateReplayProtection(
            conversationId,
            nonce,
            messageTimestamp || Date.now(),
            sequenceNumber,
            null, // messageId not yet created
            sequenceContextId
        );

        if (!validation.valid) {
            return res.status(400).json({ 
                error: `Replay attack detected: ${validation.reason}` 
            });
        }

        // Create message with encrypted data only (NO PLAINTEXT)
        const newMessage = new Message({
            senderId,
            receiverId,
            ciphertext,      // Encrypted message
            iv,              // Initialization vector
            authTag,         // Authentication tag
            messageType,     // 'text' or 'file'
            sequenceNumber: sequenceNumber || 0,
            messageTimestamp: messageTimestamp || Date.now(),
            fileName: fileName || null,
            fileType: fileType || null,
            fileSize: fileSize || null
        });

        if (newMessage) {
            conversation.messages.push(newMessage._id);
        }

        // Save the conversation and new message in parallel
        await Promise.all([conversation.save(), newMessage.save()]);

        // Update sequence number validation with actual message ID
        if (sequenceNumber !== undefined && sequenceNumber !== null) {
            const { validateSequenceNumber } = await import("../utils/replayProtection.js");
            // Re-validate with actual message ID (this is a bit redundant but ensures consistency)
            validateSequenceNumber(sequenceContextId, sequenceNumber, newMessage._id.toString());
        }

        // Return encrypted message (NO PLAINTEXT)
        // Client will decrypt using session key
        res.status(201).json({
            _id: newMessage._id,
            senderId: newMessage.senderId,
            receiverId: newMessage.receiverId,
            ciphertext: newMessage.ciphertext,
            iv: newMessage.iv,
            authTag: newMessage.authTag,
            messageType: newMessage.messageType,
            sequenceNumber: newMessage.sequenceNumber,
            messageTimestamp: newMessage.messageTimestamp,
            fileName: newMessage.fileName,
            fileType: newMessage.fileType,
            fileSize: newMessage.fileSize,
            createdAt: newMessage.createdAt,
            updatedAt: newMessage.updatedAt
        });

    } catch (error) {
        console.log("Error in sendMessage controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
export const getMessages = async (req, res) => {
    try {
        const { id: userToChatId } = req.params;
        const senderId = req.user._id;

        const conversation = await Conversation.findOne({
            participants: { $all: [senderId, userToChatId] },
        }).populate("messages"); // NOT REFERENCE BUT ACTUAL MESSAGE

        if (!conversation) return res.status(200).json([]);

        const messages = conversation.messages;

        // Return only encrypted data (NO PLAINTEXT)
        // Client will decrypt using session key
        const encryptedMessages = messages.map(msg => ({
            _id: msg._id,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            authTag: msg.authTag,
            messageType: msg.messageType || 'text',
            sequenceNumber: msg.sequenceNumber || 0,
            messageTimestamp: msg.messageTimestamp || msg.createdAt?.getTime(),
            fileName: msg.fileName || null,
            fileType: msg.fileType || null,
            fileSize: msg.fileSize || null,
            createdAt: msg.createdAt,
            updatedAt: msg.updatedAt
        }));

        res.status(200).json(encryptedMessages);
    } catch (error) {
        console.log("Error in getMessages controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};