/**
 * Security Logging Utility
 * 
 * Logs security-related events for auditing:
 * - Authentication attempts
 * - Key exchange attempts
 * - Failed decryptions
 * - Replay attack detections
 * - Invalid signatures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'security.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Format log entry
 */
function formatLogEntry(level, category, message, metadata = {}) {
    return {
        timestamp: new Date().toISOString(),
        level,
        category,
        message,
        ...metadata
    };
}

/**
 * Write log entry to file
 */
function writeLog(entry) {
    try {
        const logLine = JSON.stringify(entry) + '\n';
        fs.appendFileSync(LOG_FILE, logLine, 'utf8');
    } catch (error) {
        console.error("Error writing to security log:", error);
    }
}

/**
 * Log authentication attempt
 */
export function logAuthenticationAttempt(userId, username, success, ipAddress) {
    const entry = formatLogEntry(
        success ? 'INFO' : 'WARN',
        'AUTHENTICATION',
        success ? 'Successful login' : 'Failed login attempt',
        {
            userId,
            username,
            success,
            ipAddress
        }
    );
    writeLog(entry);
    console.log(`[AUTH] ${success ? 'SUCCESS' : 'FAILED'} - User: ${username} (${userId}) from ${ipAddress}`);
}

/**
 * Log key exchange attempt
 */
export function logKeyExchangeAttempt(senderId, receiverId, conversationId, success, error = null) {
    const entry = formatLogEntry(
        success ? 'INFO' : 'WARN',
        'KEY_EXCHANGE',
        success ? 'Key exchange successful' : 'Key exchange failed',
        {
            senderId,
            receiverId,
            conversationId,
            success,
            error: error?.message || null
        }
    );
    writeLog(entry);
    console.log(`[KEY_EXCHANGE] ${success ? 'SUCCESS' : 'FAILED'} - ${senderId} -> ${receiverId} (${conversationId})`);
}

/**
 * Log failed decryption
 */
export function logDecryptionFailure(messageId, userId, conversationId, error) {
    const entry = formatLogEntry(
        'ERROR',
        'DECRYPTION',
        'Failed to decrypt message',
        {
            messageId,
            userId,
            conversationId,
            error: error?.message || String(error)
        }
    );
    writeLog(entry);
    console.log(`[DECRYPTION_FAILURE] Message: ${messageId}, User: ${userId}, Conversation: ${conversationId}`);
}

/**
 * Log replay attack detection
 */
export function logReplayAttack(conversationId, attackType, details) {
    const entry = formatLogEntry(
        'WARN',
        'REPLAY_ATTACK',
        'Replay attack detected',
        {
            conversationId,
            attackType, // 'nonce', 'timestamp', or 'sequence'
            ...details
        }
    );
    writeLog(entry);
    console.log(`[REPLAY_ATTACK] Detected - Conversation: ${conversationId}, Type: ${attackType}`);
}

/**
 * Log invalid signature
 */
export function logInvalidSignature(conversationId, userId, details) {
    const entry = formatLogEntry(
        'WARN',
        'INVALID_SIGNATURE',
        'Invalid signature detected',
        {
            conversationId,
            userId: userId || 'unknown',
            ...details
        }
    );
    writeLog(entry);
    console.log(`[INVALID_SIGNATURE] Conversation: ${conversationId}, User: ${userId || 'unknown'}`);
}

/**
 * Log metadata access
 */
export function logMetadataAccess(userId, resourceType, resourceId, action) {
    const entry = formatLogEntry(
        'INFO',
        'METADATA_ACCESS',
        `Metadata access: ${action}`,
        {
            userId,
            resourceType,
            resourceId,
            action
        }
    );
    writeLog(entry);
    console.log(`[METADATA_ACCESS] User: ${userId}, ${action} ${resourceType}: ${resourceId}`);
}

/**
 * Get security logs (for admin/debugging)
 */
export function getSecurityLogs(limit = 100, filters = {}) {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return [];
        }

        const logContent = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = logContent.trim().split('\n').filter(line => line.trim());
        let logs = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(log => log !== null);

        // Apply filters
        if (filters.category) {
            logs = logs.filter(log => log.category === filters.category);
        }
        if (filters.level) {
            logs = logs.filter(log => log.level === filters.level);
        }
        if (filters.userId) {
            logs = logs.filter(log => log.userId === filters.userId);
        }
        if (filters.startDate) {
            const start = new Date(filters.startDate);
            logs = logs.filter(log => new Date(log.timestamp) >= start);
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            logs = logs.filter(log => new Date(log.timestamp) <= end);
        }
        if (filters.conversationId) {
            logs = logs.filter(log => log.conversationId === filters.conversationId);
        }

        // Return most recent logs
        return logs.slice(-limit).reverse();
    } catch (error) {
        console.error("Error reading security logs:", error);
        return [];
    }
}

/**
 * Get log statistics
 */
export function getLogStatistics(filters = {}) {
    try {
        const logs = getSecurityLogs(10000, filters); // Get more logs for statistics

        const stats = {
            total: logs.length,
            byCategory: {},
            byLevel: {},
            byDate: {},
            recentAttacks: [],
            topUsers: {}
        };

        logs.forEach(log => {
            // Count by category
            stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;

            // Count by level
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;

            // Count by date
            const date = new Date(log.timestamp).toISOString().split('T')[0];
            stats.byDate[date] = (stats.byDate[date] || 0) + 1;

            // Track attacks (WARN and ERROR levels)
            if (log.level === 'WARN' || log.level === 'ERROR') {
                stats.recentAttacks.push({
                    timestamp: log.timestamp,
                    category: log.category,
                    level: log.level,
                    message: log.message,
                    details: log
                });
            }

            // Count by user
            if (log.userId) {
                stats.topUsers[log.userId] = (stats.topUsers[log.userId] || 0) + 1;
            }
        });

        // Sort recent attacks by timestamp (most recent first)
        stats.recentAttacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        stats.recentAttacks = stats.recentAttacks.slice(0, 50); // Top 50

        // Sort top users
        const topUsersArray = Object.entries(stats.topUsers)
            .map(([userId, count]) => ({ userId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
        stats.topUsers = topUsersArray;

        return stats;
    } catch (error) {
        console.error("Error generating log statistics:", error);
        return {
            total: 0,
            byCategory: {},
            byLevel: {},
            byDate: {},
            recentAttacks: [],
            topUsers: []
        };
    }
}

/**
 * Clean old logs (retention policy)
 * 
 * @param {number} daysToKeep - Number of days to keep logs (default: 30)
 */
export function cleanOldLogs(daysToKeep = 30) {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return { deleted: 0, kept: 0 };
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const logContent = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = logContent.trim().split('\n').filter(line => line.trim());
        
        let kept = 0;
        let deleted = 0;
        const keptLogs = [];

        lines.forEach(line => {
            try {
                const log = JSON.parse(line);
                const logDate = new Date(log.timestamp);
                
                if (logDate >= cutoffDate) {
                    keptLogs.push(line);
                    kept++;
                } else {
                    deleted++;
                }
            } catch (e) {
                // Invalid log line, skip it
            }
        });

        // Write back only kept logs
        if (keptLogs.length > 0) {
            fs.writeFileSync(LOG_FILE, keptLogs.join('\n') + '\n', 'utf8');
        } else {
            // If no logs to keep, create empty file
            fs.writeFileSync(LOG_FILE, '', 'utf8');
        }

        console.log(`[LOG_CLEANUP] Deleted ${deleted} old logs, kept ${kept} logs`);
        return { deleted, kept };
    } catch (error) {
        console.error("Error cleaning old logs:", error);
        return { deleted: 0, kept: 0, error: error.message };
    }
}

/**
 * Export logs to file
 */
export function exportLogs(filters = {}, format = 'json') {
    try {
        const logs = getSecurityLogs(100000, filters); // Get all matching logs

        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        } else if (format === 'csv') {
            // Convert to CSV
            if (logs.length === 0) return '';
            
            const headers = Object.keys(logs[0]).join(',');
            const rows = logs.map(log => {
                return Object.values(log).map(val => {
                    if (typeof val === 'object') {
                        return JSON.stringify(val).replace(/"/g, '""');
                    }
                    return String(val).replace(/"/g, '""');
                }).map(val => `"${val}"`).join(',');
            });
            
            return [headers, ...rows].join('\n');
        } else {
            // Plain text format
            return logs.map(log => {
                return `[${log.timestamp}] ${log.level} ${log.category}: ${log.message}`;
            }).join('\n');
        }
    } catch (error) {
        console.error("Error exporting logs:", error);
        return '';
    }
}
