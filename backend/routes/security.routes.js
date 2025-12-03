import express from "express";
import {
    logDecryptionFailure,
    getLogs,
    getStatistics,
    getDashboard,
    exportSecurityLogs,
    cleanLogs
} from "../controllers/security.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

// Logging endpoints
router.post("/decryption-failure", protectRoute, logDecryptionFailure);

// Log viewing and analysis endpoints
router.get("/logs", protectRoute, getLogs);
router.get("/statistics", protectRoute, getStatistics);
router.get("/dashboard", protectRoute, getDashboard);
router.get("/export", protectRoute, exportSecurityLogs);
router.post("/clean", protectRoute, cleanLogs);

export default router;
