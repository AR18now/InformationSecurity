/**
 * Log Cleanup Script
 * 
 * Automatically cleans old security logs based on retention policy
 * 
 * Run manually: node backend/scripts/logCleanup.js
 * Or set up as a cron job to run daily
 */

import { cleanOldLogs } from '../utils/securityLogger.js';

// Default retention: 30 days
const DAYS_TO_KEEP = process.env.LOG_RETENTION_DAYS || 30;

console.log(`[LOG_CLEANUP] Starting log cleanup (keeping last ${DAYS_TO_KEEP} days)...`);

try {
    const result = cleanOldLogs(parseInt(DAYS_TO_KEEP));
    
    console.log(`[LOG_CLEANUP] Complete:`);
    console.log(`  - Deleted: ${result.deleted} old log entries`);
    console.log(`  - Kept: ${result.kept} log entries`);
    
    if (result.error) {
        console.error(`[LOG_CLEANUP] Error: ${result.error}`);
        process.exit(1);
    }
    
    process.exit(0);
} catch (error) {
    console.error(`[LOG_CLEANUP] Fatal error:`, error);
    process.exit(1);
}
