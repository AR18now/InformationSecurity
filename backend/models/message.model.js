import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
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
    // Encrypted message fields (NO PLAINTEXT)
    ciphertext: {
        type: String,
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
    // Message type: 'text' or 'file'
    messageType: {
        type: String,
        enum: ['text', 'file'],
        default: 'text',
    },
    // File reference (if message references a file)
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null,
    },
    // File metadata (for display purposes, not encrypted)
    fileName: {
        type: String,
        default: null,
    },
    fileType: {
        type: String,
        default: null,
    },
    fileSize: {
        type: Number,
        default: null,
    },
    // Sequence number for replay protection
    sequenceNumber: {
        type: Number,
        default: 0,
    },
    // Timestamp for replay protection
    messageTimestamp: {
        type: Number,
        required: true,
        default: () => Date.now(),
    },
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message;