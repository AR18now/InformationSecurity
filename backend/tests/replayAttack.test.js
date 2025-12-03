/**
 * Replay Attack Protection Tests
 * 
 * Run with: npm test -- replayAttack.test.js
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
    validateReplayProtection,
    generateNonce,
    resetReplayProtection,
    validateNonce,
    validateTimestamp,
    validateSequenceNumber
} from '../utils/replayProtection.js';

describe('Replay Attack Protection', () => {
    const conversationId = 'test-conversation-123';

    beforeEach(() => {
        resetReplayProtection(conversationId);
    });

    describe('Nonce Validation', () => {
        test('Should accept valid nonce', () => {
            const nonce = generateNonce();
            const result = validateNonce(conversationId, nonce);
            expect(result).toBe(true);
        });

        test('Should reject duplicate nonce', () => {
            const nonce = generateNonce();
            
            // First use - should pass
            const result1 = validateNonce(conversationId, nonce);
            expect(result1).toBe(true);

            // Replay with same nonce - should fail
            const result2 = validateNonce(conversationId, nonce);
            expect(result2).toBe(false);
        });

        test('Should reject empty nonce', () => {
            const result = validateNonce(conversationId, '');
            expect(result).toBe(false);
        });
    });

    describe('Timestamp Validation', () => {
        test('Should accept valid timestamp', () => {
            const timestamp = Date.now();
            const result = validateTimestamp(conversationId, timestamp);
            expect(result).toBe(true);
        });

        test('Should reject future timestamp', () => {
            const futureTimestamp = Date.now() + (10 * 60 * 1000); // 10 minutes in future
            const result = validateTimestamp(conversationId, futureTimestamp);
            expect(result).toBe(false);
        });

        test('Should reject old timestamp', () => {
            const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
            const result = validateTimestamp(conversationId, oldTimestamp);
            expect(result).toBe(false);
        });
    });

    describe('Sequence Number Validation', () => {
        test('Should accept valid sequence number', () => {
            const sequenceNumber = 1;
            const result = validateSequenceNumber(conversationId, sequenceNumber, 'msg-1');
            expect(result).toBe(true);
        });

        test('Should reject duplicate sequence number', () => {
            const sequenceNumber = 1;
            
            // First message
            const result1 = validateSequenceNumber(conversationId, sequenceNumber, 'msg-1');
            expect(result1).toBe(true);

            // Replay with same sequence number
            const result2 = validateSequenceNumber(conversationId, sequenceNumber, 'msg-2');
            expect(result2).toBe(false);
        });

        test('Should accept increasing sequence numbers', () => {
            expect(validateSequenceNumber(conversationId, 1, 'msg-1')).toBe(true);
            expect(validateSequenceNumber(conversationId, 2, 'msg-2')).toBe(true);
            expect(validateSequenceNumber(conversationId, 3, 'msg-3')).toBe(true);
        });

        test('Should reject out-of-order sequence numbers', () => {
            // Send sequence 5
            expect(validateSequenceNumber(conversationId, 5, 'msg-5')).toBe(true);
            
            // Try to replay sequence 1 (too old)
            const result = validateSequenceNumber(conversationId, 1, 'msg-1-replay');
            expect(result).toBe(false);
        });
    });

    describe('Complete Replay Protection', () => {
        test('Should accept valid message with all protections', () => {
            const nonce = generateNonce();
            const timestamp = Date.now();
            const sequenceNumber = 1;

            const result = validateReplayProtection(
                conversationId,
                nonce,
                timestamp,
                sequenceNumber,
                'msg-1'
            );

            expect(result.valid).toBe(true);
        });

        test('Should reject message with duplicate nonce', () => {
            const nonce = generateNonce();
            const timestamp = Date.now();
            const sequenceNumber = 1;

            // First message
            const result1 = validateReplayProtection(
                conversationId,
                nonce,
                timestamp,
                sequenceNumber,
                'msg-1'
            );
            expect(result1.valid).toBe(true);

            // Replay with same nonce
            const result2 = validateReplayProtection(
                conversationId,
                nonce, // Same nonce!
                timestamp + 1000,
                sequenceNumber + 1,
                'msg-2'
            );
            expect(result2.valid).toBe(false);
            expect(result2.reason).toContain('nonce');
        });

        test('Should reject message with old timestamp', () => {
            const nonce = generateNonce();
            const oldTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
            const sequenceNumber = 1;

            const result = validateReplayProtection(
                conversationId,
                nonce,
                oldTimestamp,
                sequenceNumber,
                'msg-1'
            );

            expect(result.valid).toBe(false);
            expect(result.reason).toContain('timestamp');
        });

        test('Should reject message with duplicate sequence number', () => {
            const nonce1 = generateNonce();
            const nonce2 = generateNonce();
            const timestamp = Date.now();
            const sequenceNumber = 1;

            // First message
            const result1 = validateReplayProtection(
                conversationId,
                nonce1,
                timestamp,
                sequenceNumber,
                'msg-1'
            );
            expect(result1.valid).toBe(true);

            // Replay with same sequence number
            const result2 = validateReplayProtection(
                conversationId,
                nonce2,
                timestamp + 1000,
                sequenceNumber, // Same sequence number!
                'msg-2'
            );
            expect(result2.valid).toBe(false);
            expect(result2.reason).toContain('sequence');
        });
    });
});
