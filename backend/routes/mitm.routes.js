import express from "express";
import { testMITMDetection, getMITMStats } from "../controllers/mitm.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

// MITM demonstration routes
router.post("/test-detection", protectRoute, testMITMDetection);
router.get("/stats", protectRoute, getMITMStats);

export default router;
