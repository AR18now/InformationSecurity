/**
 * React Hook for Key Exchange
 * 
 * YOUR TASK: Implement the key exchange flow using the functions from keyExchange.js
 * 
 * This hook should:
 * 1. Initiate key exchange when starting a conversation
 * 2. Handle incoming key exchange messages
 * 3. Manage session key state
 * 4. Provide status updates
 */

import { useState, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import usePrivateKey from './usePrivateKey';
import toast from 'react-hot-toast';
import {
    generateECDHKeyPair,
    createKeyExchangeInit,
    validateKeyExchangeInit,
    createKeyExchangeResponse,
    completeKeyExchange,
    storeSessionKey,
    retrieveSessionKey,
    importECDHPublicKey
} from '../utils/keyExchange';

/**
 * Hook for managing key exchange
 * 
 * @returns {Object} Key exchange functions and state
 */
const useKeyExchange = () => {
    const { authUser } = useAuthContext();
    const { privateKeyCryptoKey, privateKey: privateKeyBase64 } = usePrivateKey();
    const [isExchanging, setIsExchanging] = useState(false);
    const [error, setError] = useState(null);
    const [sessionKeys, setSessionKeys] = useState({}); // conversationId -> sessionKey

    /**
     * Initiate key exchange with another user
     * 
     * @param {string} receiverId - User ID to exchange keys with
     * @returns {Promise<boolean>} Success status
     * 
     * YOUR TASK:
     * 1. Generate ECDH key pair
     * 2. Create key exchange initiation message
     * 3. Send to server (you'll need to create the endpoint)
     * 4. Wait for response
     * 5. Complete key exchange
     * 6. Store session key
     */
    const initiateKeyExchange = useCallback(async (receiverId, conversationId) => {
        if (!authUser || !privateKeyBase64) {
            setError("Not authenticated or private key not available");
            return false;
        }

        setIsExchanging(true);
        setError(null);

        try {
            // 1. Generate ECDH key pair
            const { publicKey: ecdhPublicKey, privateKey: ecdhPrivateKey } = await generateECDHKeyPair();

            // 2. Create initiation message
            const initMessage = await createKeyExchangeInit(
                ecdhPublicKey,
                receiverId,
                privateKeyBase64,
                authUser._id,
                conversationId || `${authUser._id}_${receiverId}`
            );

            // 3. Send to server
            const response = await fetch('/api/keyexchange/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(initMessage)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to initiate key exchange');
            }

            // 4. Poll for response (or use WebSocket in future)
            let responseReceived = false;
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds timeout
            const convId = conversationId || `${authUser._id}_${receiverId}`;

            while (!responseReceived && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

                try {
                    const checkResponse = await fetch(`/api/keyexchange/response/${convId}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    if (checkResponse.ok) {
                        const responseData = await checkResponse.json();
                        if (responseData.response && responseData.found) {
                            // 5. Get receiver's public key
                            const receiverKeyResponse = await fetch(`/api/keyexchange/users/${receiverId}/publickey`);
                            if (!receiverKeyResponse.ok) {
                                throw new Error("Failed to get receiver's public key");
                            }
                            const receiverKeyData = await receiverKeyResponse.json();

                            // 6. Complete key exchange
                            const sessionKey = await completeKeyExchange(
                                responseData.response,
                                ecdhPrivateKey,
                                receiverKeyData.publicKey,
                                authUser._id,
                                receiverId,
                                convId
                            );

                            // 8. Store session key in state
                            setSessionKeys(prev => ({
                                ...prev,
                                [convId]: sessionKey
                            }));

                            console.log("✅ Key exchange completed successfully");
                            responseReceived = true;
                            return true;
                        }
                    }
                } catch (pollError) {
                    console.error("Error polling for key exchange response:", pollError);
                }

                attempts++;
            }

            if (!responseReceived) {
                // Don't throw error - just return false so UI can still work
                console.warn("Key exchange timeout - waiting for other user to come online");
                return false;
            }

            return true;
        } catch (err) {
            console.error("Key exchange initiation error:", err);
            setError(err.message);
            toast.error(`Key exchange failed: ${err.message}`);
            return false;
        } finally {
            setIsExchanging(false);
        }
    }, [authUser, privateKeyBase64]);

    /**
     * Handle incoming key exchange message
     * 
     * @param {Object} message - Key exchange message
     * @param {string} senderId - Sender's user ID
     * @param {string} senderPublicKeyBase64 - Sender's RSA public key
     * @returns {Promise<boolean>} Success status
     * 
     * YOUR TASK:
     * 1. Validate the message
     * 2. Generate your ECDH key pair
     * 3. Create response
     * 4. Send response
     * 5. Derive and store session key
     */
    const handleKeyExchangeMessage = useCallback(async (message, senderId, senderPublicKeyBase64, conversationId) => {
        if (!authUser || !privateKeyBase64) {
            setError("Not authenticated or private key not available");
            return false;
        }

        setIsExchanging(true);
        setError(null);

        try {
            // 1. Validate incoming message
            const validation = await validateKeyExchangeInit(message, senderPublicKeyBase64);
            if (!validation.valid) {
                throw new Error(validation.error || "Invalid key exchange message");
            }

            // 2. Generate your ECDH key pair
            const { publicKey: myECDHPublicKey, privateKey: myECDHPrivateKey } = await generateECDHKeyPair();

            // 3. Create response message
            const responseResult = await createKeyExchangeResponse(
                myECDHPublicKey,
                validation.ecdhPublicKey,
                myECDHPrivateKey,
                senderId,
                privateKeyBase64,
                authUser._id,
                conversationId || validation.conversationId
            );
            
            const responseMessage = responseResult.response;
            const sessionKey = responseResult.sessionKey;

            // 4. Send response to server
            const serverResponse = await fetch('/api/keyexchange/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(responseMessage)
            });

            if (!serverResponse.ok) {
                const errorData = await serverResponse.json();
                throw new Error(errorData.error || 'Failed to send key exchange response');
            }

            // 5. Store session key
            const convId = conversationId || validation.conversationId;
            setSessionKeys(prev => ({
                ...prev,
                [convId]: sessionKey
            }));

            console.log("Key exchange completed with:", senderId);
            return true;
        } catch (err) {
            console.error("Key exchange handling error:", err);
            setError(err.message);
            return false;
        } finally {
            setIsExchanging(false);
        }
    }, [authUser, privateKeyBase64]);

    /**
     * Get session key for a conversation
     * 
     * @param {string} conversationId - Conversation ID
     * @returns {Promise<CryptoKey|null>} Session key or null
     */
    const getSessionKey = useCallback(async (conversationId) => {
        // Check if already in state
        if (sessionKeys[conversationId]) {
            return sessionKeys[conversationId];
        }

        // Try to retrieve from storage
        try {
            const key = await retrieveSessionKey(conversationId);
            if (key) {
                setSessionKeys(prev => ({ ...prev, [conversationId]: key }));
                return key;
            }
        } catch (err) {
            console.error("Error retrieving session key:", err);
        }

        return null;
    }, [sessionKeys]);

    /**
     * Check if key exchange is needed for a conversation
     * 
     * @param {string} conversationId - Conversation ID
     * @returns {Promise<boolean>} True if key exchange needed
     */
    const needsKeyExchange = useCallback(async (conversationId) => {
        const key = await getSessionKey(conversationId);
        return key === null;
    }, [getSessionKey]);

    return {
        initiateKeyExchange,
        handleKeyExchangeMessage,
        getSessionKey,
        needsKeyExchange,
        isExchanging,
        error,
        sessionKeys
    };
};

export default useKeyExchange;

