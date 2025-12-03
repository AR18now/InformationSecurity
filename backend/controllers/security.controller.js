import {
    logDecryptionFailure as logDecryptionFailureUtil,
    getSecurityLogs,
    getLogStatistics,
    cleanOldLogs,
    exportLogs
} from "../utils/securityLogger.js";

/**
 * Log decryption failure from client
 */
export const logDecryptionFailure = async (req, res) => {
    try {
        const { messageId, conversationId } = req.body;
        const userId = req.user._id;

        logDecryptionFailureUtil(messageId, userId.toString(), conversationId, {
            message: "Client-side decryption failed"
        });

        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error logging decryption failure:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get security logs with filtering
 * 
 * Query parameters:
 * - limit: Number of logs to return (default: 100)
 * - category: Filter by category (AUTHENTICATION, KEY_EXCHANGE, etc.)
 * - level: Filter by level (INFO, WARN, ERROR)
 * - userId: Filter by user ID
 * - startDate: Filter logs from this date (ISO format)
 * - endDate: Filter logs until this date (ISO format)
 * - conversationId: Filter by conversation ID
 */
export const getLogs = async (req, res) => {
    try {
        const {
            limit = 100,
            category,
            level,
            userId,
            startDate,
            endDate,
            conversationId
        } = req.query;

        const filters = {};
        if (category) filters.category = category;
        if (level) filters.level = level;
        if (userId) filters.userId = userId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (conversationId) filters.conversationId = conversationId;

        const logs = getSecurityLogs(parseInt(limit), filters);

        res.status(200).json({
            success: true,
            count: logs.length,
            logs: logs
        });
    } catch (error) {
        console.error("Error in getLogs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get log statistics
 */
export const getStatistics = async (req, res) => {
    try {
        const {
            category,
            level,
            userId,
            startDate,
            endDate,
            conversationId
        } = req.query;

        const filters = {};
        if (category) filters.category = category;
        if (level) filters.level = level;
        if (userId) filters.userId = userId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (conversationId) filters.conversationId = conversationId;

        const stats = getLogStatistics(filters);

        res.status(200).json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        console.error("Error in getStatistics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Get security dashboard data
 */
export const getDashboard = async (req, res) => {
    try {
        // Get statistics for last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const recentStats = getLogStatistics({
            startDate: yesterday.toISOString()
        });

        // Get all-time statistics
        const allTimeStats = getLogStatistics({});

        // Get recent security events (last 50)
        const recentLogs = getSecurityLogs(50);

        res.status(200).json({
            success: true,
            dashboard: {
                last24Hours: recentStats,
                allTime: allTimeStats,
                recentEvents: recentLogs
            }
        });
    } catch (error) {
        console.error("Error in getDashboard:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Export logs
 * 
 * Query parameters:
 * - format: Export format (json, csv, txt) - default: json
 * - category, level, userId, startDate, endDate, conversationId: Same filters as getLogs
 */
export const exportSecurityLogs = async (req, res) => {
    try {
        const {
            format = 'json',
            category,
            level,
            userId,
            startDate,
            endDate,
            conversationId
        } = req.query;

        const filters = {};
        if (category) filters.category = category;
        if (level) filters.level = level;
        if (userId) filters.userId = userId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (conversationId) filters.conversationId = conversationId;

        const exportedData = exportLogs(filters, format);

        // Set appropriate content type
        let contentType = 'application/json';
        let filename = 'security-logs.json';
        
        if (format === 'csv') {
            contentType = 'text/csv';
            filename = 'security-logs.csv';
        } else if (format === 'txt') {
            contentType = 'text/plain';
            filename = 'security-logs.txt';
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(exportedData);
    } catch (error) {
        console.error("Error in exportSecurityLogs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Clean old logs (admin only)
 * 
 * Body parameters:
 * - daysToKeep: Number of days to keep logs (default: 30)
 */
export const cleanLogs = async (req, res) => {
    try {
        const { daysToKeep = 30 } = req.body;

        if (daysToKeep < 1 || daysToKeep > 365) {
            return res.status(400).json({
                error: "daysToKeep must be between 1 and 365"
            });
        }

        const result = cleanOldLogs(parseInt(daysToKeep));

        res.status(200).json({
            success: true,
            message: `Cleaned old logs. Deleted ${result.deleted}, kept ${result.kept}`,
            result: result
        });
    } catch (error) {
        console.error("Error in cleanLogs:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
