import express from "express";
import {
    getUserPublicKey,
    initiateKeyExchange,
    respondToKeyExchange,
    getKeyExchangeResponse,
    getPendingKeyExchanges
} from "../controllers/keyExchange.controller.js";
import protectRoute from "../middleware/protectRoute.js";

const router = express.Router();

// Get user's public key (public endpoint, but authenticated for security)
router.get("/users/:id/publickey", protectRoute, getUserPublicKey);

// Key exchange endpoints (all require authentication)
router.post("/initiate", protectRoute, initiateKeyExchange);
router.post("/respond", protectRoute, respondToKeyExchange);
router.get("/response/:conversationId", protectRoute, getKeyExchangeResponse);
router.get("/pending", protectRoute, getPendingKeyExchanges);

export default router;

