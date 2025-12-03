/**
 * Replay Attack Protection Utility
 * 
 * Implements protection against replay attacks using:
 * - Nonces (Number Used Once)
 * - Timestamps (with tolerance window)
 * - Sequence numbers (monotonically increasing)
 */

import { logReplayAttack } from './securityLogger.js';

// In-memory storage for seen nonces, timestamps, and sequence numbers
// In production, consider using Redis or database for distributed systems
const seenNonces = new Map(); // Map<conversationId, Set<nonce>>
const seenTimestamps = new Map(); // Map<conversationId, Array<timestamp>>
const sequenceNumbers = new Map(); // Map<conversationId, lastSequenceNumber>
const messageHistory = new Map(); // Map<conversationId, Map<sequenceNumber, messageId>>

// Configuration
const TIMESTAMP_TOLERANCE = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_TIMESTAMPS_PER_CONVERSATION = 1000; // Keep last 1000 timestamps per conversation
const NONCE_CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up nonces older than 1 hour
const SEQUENCE_WINDOW = 100; // Allow sequence numbers within this window

/**
 * Clean up old nonces periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [conversationId, nonceSet] of seenNonces.entries()) {
        // In a real implementation, nonces would have timestamps
        // For now, we'll just limit the size
        if (nonceSet.size > 10000) {
            // Clear oldest entries (simple approach - clear all if too large)
            seenNonces.set(conversationId, new Set());
        }
    }
}, NONCE_CLEANUP_INTERVAL);

/**
 * Validate nonce (Number Used Once)
 * @param {string} conversationId - Conversation identifier
 * @param {string} nonce - Nonce to validate
 * @returns {boolean} - True if nonce is valid (not seen before)
 */
export function validateNonce(conversationId, nonce) {
    if (!conversationId || !nonce) {
        return false;
    }

    // Get or create nonce set for this conversation
    if (!seenNonces.has(conversationId)) {
        seenNonces.set(conversationId, new Set());
    }

    const nonceSet = seenNonces.get(conversationId);

    // Check if nonce has been seen before
    if (nonceSet.has(nonce)) {
        logReplayAttack(
            conversationId,
            'nonce',
            { nonce, reason: 'Duplicate nonce detected' }
        );
        return false; // Replay attack detected
    }

    // Add nonce to seen set
    nonceSet.add(nonce);
    return true;
}

/**
 * Validate timestamp (within tolerance window)
 * @param {string} conversationId - Conversation identifier
 * @param {number} timestamp - Timestamp to validate
 * @returns {boolean} - True if timestamp is valid
 */
export function validateTimestamp(conversationId, timestamp) {
    if (!conversationId || !timestamp) {
        return false;
    }

    const now = Date.now();
    const messageTime = timestamp;

    // Check if timestamp is in the future (clock skew or attack)
    if (messageTime > now + TIMESTAMP_TOLERANCE) {
        logReplayAttack(
            conversationId,
            'timestamp',
            { timestamp: messageTime, reason: 'Future timestamp detected', currentTime: now }
        );
        return false;
    }

    // Check if timestamp is too old (outside tolerance window)
    if (messageTime < now - TIMESTAMP_TOLERANCE) {
        logReplayAttack(
            conversationId,
            'timestamp',
            { timestamp: messageTime, reason: 'Timestamp too old', currentTime: now, tolerance: TIMESTAMP_TOLERANCE }
        );
        return false;
    }

    // Store timestamp for this conversation
    if (!seenTimestamps.has(conversationId)) {
        seenTimestamps.set(conversationId, []);
    }

    const timestampArray = seenTimestamps.get(conversationId);
    timestampArray.push(messageTime);

    // Keep only recent timestamps
    if (timestampArray.length > MAX_TIMESTAMPS_PER_CONVERSATION) {
        timestampArray.shift(); // Remove oldest
    }

    return true;
}

/**
 * Validate sequence number (monotonically increasing)
 * @param {string} conversationId - Conversation identifier
 * @param {number} sequenceNumber - Sequence number to validate
 * @param {string} messageId - Message ID for tracking
 * @returns {boolean} - True if sequence number is valid
 */
export function validateSequenceNumber(sequenceContextId, sequenceNumber, messageId) {
    if (!sequenceContextId || sequenceNumber === undefined || sequenceNumber === null) {
        return false;
    }

    // Initialize if needed
    if (!sequenceNumbers.has(sequenceContextId)) {
        sequenceNumbers.set(sequenceContextId, 0);
        messageHistory.set(sequenceContextId, new Map());
    }

    const lastSequence = sequenceNumbers.get(sequenceContextId);
    const history = messageHistory.get(sequenceContextId);

    // Check if this sequence number was already seen (replay)
    if (history.has(sequenceNumber)) {
        const previousMessageId = history.get(sequenceNumber);
        logReplayAttack(
            sequenceContextId,
            'sequence',
            { 
                sequenceNumber, 
                messageId, 
                previousMessageId,
                reason: 'Duplicate sequence number detected' 
            }
        );
        return false; // Replay attack detected
    }

    // Check if sequence number is too far behind (likely replay of old message)
    if (sequenceNumber < lastSequence - SEQUENCE_WINDOW) {
        logReplayAttack(
            conversationId,
            'sequence',
            { 
                sequenceNumber, 
                lastSequence,
                messageId,
                reason: 'Sequence number too old (outside window)' 
            }
        );
        return false;
    }

    // Update last sequence number if this one is higher
    if (sequenceNumber > lastSequence) {
        sequenceNumbers.set(sequenceContextId, sequenceNumber);
    }

    // Store this sequence number
    history.set(sequenceNumber, messageId);

    // Clean up old sequence numbers (keep only recent window)
    const minSequence = sequenceNumber - SEQUENCE_WINDOW;
    for (const [seq, msgId] of history.entries()) {
        if (seq < minSequence) {
            history.delete(seq);
        }
    }

    return true;
}

/**
 * Validate all replay protection mechanisms
 * @param {string} conversationId - Conversation identifier
 * @param {string} nonce - Nonce to validate
 * @param {number} timestamp - Timestamp to validate
 * @param {number} sequenceNumber - Sequence number to validate
 * @param {string} messageId - Message ID for tracking
 * @returns {{valid: boolean, reason?: string}} - Validation result
 */
export function validateReplayProtection(conversationId, nonce, timestamp, sequenceNumber, messageId, sequenceContextId) {
    // Validate nonce
    if (nonce && !validateNonce(conversationId, nonce)) {
        return { valid: false, reason: 'Invalid or duplicate nonce' };
    }

    // Validate timestamp
    if (timestamp && !validateTimestamp(conversationId, timestamp)) {
        return { valid: false, reason: 'Invalid timestamp (outside tolerance window or future timestamp)' };
    }

    // Validate sequence number
    if (sequenceNumber !== undefined && sequenceNumber !== null) {
        const ctx = sequenceContextId || conversationId;
        if (!validateSequenceNumber(ctx, sequenceNumber, messageId)) {
            return { valid: false, reason: 'Invalid sequence number (duplicate or outside window)' };
        }
    }

    return { valid: true };
}

/**
 * Generate a unique nonce
 * @returns {string} - Random nonce
 */
export function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get current timestamp
 * @returns {number} - Current timestamp in milliseconds
 */
export function getCurrentTimestamp() {
    return Date.now();
}

/**
 * Reset replay protection for a conversation (for testing)
 * @param {string} conversationId - Conversation identifier
 */
export function resetReplayProtection(conversationId) {
    seenNonces.delete(conversationId);
    seenTimestamps.delete(conversationId);
    sequenceNumbers.delete(conversationId);
    messageHistory.delete(conversationId);
}

/**
 * Get replay protection statistics (for monitoring)
 * @param {string} conversationId - Conversation identifier
 * @returns {object} - Statistics
 */
export function getReplayProtectionStats(conversationId) {
    return {
        seenNonces: seenNonces.get(conversationId)?.size || 0,
        seenTimestamps: seenTimestamps.get(conversationId)?.length || 0,
        lastSequenceNumber: sequenceNumbers.get(conversationId) || 0,
        messageHistorySize: messageHistory.get(conversationId)?.size || 0
    };
}
