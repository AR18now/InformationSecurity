import express from "express";
import {
    uploadFile,
    downloadFile,
    getConversationFiles
} from "../controllers/file.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

// File routes (all require authentication)
router.post("/upload/:id", protectRoute, uploadFile); // id = receiverId
router.get("/download/:fileId", protectRoute, downloadFile);
router.get("/conversation/:id", protectRoute, getConversationFiles); // id = conversationId

export default router;
