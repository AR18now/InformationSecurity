import File from "../models/file.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { logMetadataAccess } from "../utils/securityLogger.js";
import { validateReplayProtection } from "../utils/replayProtection.js";

/**
 * Upload encrypted file
 * 
 * Server receives ONLY encrypted file data
 * NO PLAINTEXT FILES ARE ACCEPTED
 */
export const uploadFile = async (req, res) => {
    try {
        const {
            ciphertext,
            iv,
            authTag,
            originalFileName,
            fileType,
            fileSize,
            encryptedSize,
            sequenceNumber,
            fileTimestamp,
            nonce,
            isChunked,
            totalChunks,
            chunkIndex
        } = req.body;

        const { id: receiverId } = req.params;
        const senderId = req.user._id;

        // Validate that encrypted data is present (NO PLAINTEXT)
        if (!ciphertext || !iv || !authTag) {
            return res.status(400).json({
                error: "Encrypted file data required (ciphertext, iv, authTag). Plaintext files are not allowed."
            });
        }

        // Reject if plaintext file is sent (security check)
        if (req.body.file || req.body.fileData) {
            console.warn("SECURITY WARNING: Plaintext file detected and rejected");
            return res.status(400).json({
                error: "Plaintext files are not allowed. All files must be encrypted client-side."
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

        // Validate replay protection for file upload
        const conversationId = conversation._id.toString();
        const sequenceContextId = `${conversationId}_${senderId.toString()}`;
        const validation = validateReplayProtection(
            conversationId,
            nonce,
            fileTimestamp || Date.now(),
            sequenceNumber,
            null, // fileId not yet created
            sequenceContextId
        );

        if (!validation.valid) {
            return res.status(400).json({
                error: `Replay attack detected in file upload: ${validation.reason}`
            });
        }

        // Create file record with encrypted data only
        const newFile = new File({
            senderId,
            receiverId,
            conversationId: conversation._id,
            ciphertext,      // Encrypted file data
            iv,              // Initialization vector
            authTag,         // Authentication tag
            originalFileName,
            fileType,
            fileSize,
            encryptedSize: encryptedSize || ciphertext.length,
            sequenceNumber: sequenceNumber || 0,
            fileTimestamp: fileTimestamp || Date.now(),
            isChunked: isChunked || false,
            totalChunks: totalChunks || 1,
            chunkIndex: chunkIndex || 0
        });

        await newFile.save();

        // Update sequence number validation with actual file ID
        if (sequenceNumber !== undefined && sequenceNumber !== null) {
            const { validateSequenceNumber } = await import("../utils/replayProtection.js");
            validateSequenceNumber(conversationId, sequenceNumber, newFile._id.toString());
        }

        // Create a message entry for the file (optional - for chat history)
        // This allows files to appear in message list
        const fileMessage = new Message({
            senderId,
            receiverId,
            ciphertext: "[FILE]", // Placeholder - actual file is separate
            iv: "file",
            authTag: "file",
            messageType: 'file',
            fileId: newFile._id,
            fileName: newFile.originalFileName,
            fileType: newFile.fileType,
            fileSize: newFile.fileSize,
            sequenceNumber: newFile.sequenceNumber,
            messageTimestamp: newFile.fileTimestamp
        });

        if (fileMessage) {
            conversation.messages.push(fileMessage._id);
            await Promise.all([conversation.save(), fileMessage.save()]);
        }

        // Log metadata access
        logMetadataAccess(
            senderId.toString(),
            'file',
            newFile._id.toString(),
            'upload'
        );

        // Return file metadata (NO PLAINTEXT)
        res.status(201).json({
            _id: newFile._id,
            senderId: newFile.senderId,
            receiverId: newFile.receiverId,
            conversationId: newFile.conversationId,
            originalFileName: newFile.originalFileName,
            fileType: newFile.fileType,
            fileSize: newFile.fileSize,
            encryptedSize: newFile.encryptedSize,
            sequenceNumber: newFile.sequenceNumber,
            fileTimestamp: newFile.fileTimestamp,
            createdAt: newFile.createdAt,
            updatedAt: newFile.updatedAt,
            messageId: fileMessage._id // Include message ID for UI
        });

    } catch (error) {
        console.log("Error in uploadFile controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get encrypted file for download
 * 
 * Returns ONLY encrypted data
 * Client will decrypt using session key
 */
export const downloadFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user._id;

        // Find file
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        // Verify user has access (sender or receiver)
        const isSender = file.senderId.toString() === userId.toString();
        const isReceiver = file.receiverId.toString() === userId.toString();

        if (!isSender && !isReceiver) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Log metadata access
        logMetadataAccess(
            userId.toString(),
            'file',
            fileId,
            'download'
        );

        // Return encrypted file data (NO PLAINTEXT)
        res.status(200).json({
            _id: file._id,
            ciphertext: file.ciphertext,
            iv: file.iv,
            authTag: file.authTag,
            originalFileName: file.originalFileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            encryptedSize: file.encryptedSize,
            sequenceNumber: file.sequenceNumber,
            fileTimestamp: file.fileTimestamp
        });

    } catch (error) {
        console.log("Error in downloadFile controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get all files for a conversation
 * 
 * Returns file metadata only (encrypted data available via download endpoint)
 */
export const getConversationFiles = async (req, res) => {
    try {
        const { id: conversationId } = req.params;
        const userId = req.user._id;

        // Verify user is part of conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const isParticipant = conversation.participants.some(
            p => p.toString() === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ error: "Access denied" });
        }

        // Get all files for this conversation
        const files = await File.find({ conversationId });

        // Return file metadata only (NO ENCRYPTED DATA)
        const fileList = files.map(file => ({
            _id: file._id,
            senderId: file.senderId,
            receiverId: file.receiverId,
            originalFileName: file.originalFileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            encryptedSize: file.encryptedSize,
            sequenceNumber: file.sequenceNumber,
            fileTimestamp: file.fileTimestamp,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt
        }));

        res.status(200).json(fileList);

    } catch (error) {
        console.log("Error in getConversationFiles controller:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};
