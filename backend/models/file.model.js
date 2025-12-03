import mongoose from 'mongoose';

/**
 * File Model - Stores encrypted files
 * 
 * NO PLAINTEXT FILES ARE STORED
 * Only encrypted data is stored on the server
 */
const fileSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    // Encrypted file data (NO PLAINTEXT)
    ciphertext: {
        type: String, // Base64 encoded encrypted file data
        required: true,
    },
    iv: {
        type: String, // Base64 encoded IV
        required: true,
    },
    authTag: {
        type: String, // Base64 encoded authentication tag
        required: true,
    },
    // File metadata (not encrypted, but needed for display)
    originalFileName: {
        type: String,
        required: true,
    },
    fileType: {
        type: String, // MIME type
        required: true,
    },
    fileSize: {
        type: Number, // Original file size in bytes
        required: true,
    },
    encryptedSize: {
        type: Number, // Encrypted file size in bytes
        required: true,
    },
    // Sequence number for replay protection
    sequenceNumber: {
        type: Number,
        default: 0,
    },
    // Timestamp for replay protection
    fileTimestamp: {
        type: Number,
        required: true,
        default: () => Date.now(),
    },
    // Chunking support (optional)
    isChunked: {
        type: Boolean,
        default: false,
    },
    totalChunks: {
        type: Number,
        default: 1,
    },
    chunkIndex: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

const File = mongoose.model('File', fileSchema);

export default File;
