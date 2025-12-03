/**
 * Custom hook for accessing the current user's private key
 * 
 * This hook provides easy access to the private key stored in IndexedDB
 * for the currently authenticated user. The key is retrieved on-demand
 * and can be used for decryption operations.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { retrievePrivateKey, importPrivateKey, keyExists } from '../utils/keyStorage';

/**
 * Hook to get and manage the current user's private key
 * @returns {Object} { privateKey, privateKeyCryptoKey, isLoading, error, refreshKey }
 */
const usePrivateKey = () => {
    const { authUser } = useAuthContext();
    const [privateKeyBase64, setPrivateKeyBase64] = useState(null);
    const [privateKeyCryptoKey, setPrivateKeyCryptoKey] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Load private key from IndexedDB
     */
    const loadPrivateKey = useCallback(async () => {
        if (!authUser?.username) {
            setPrivateKeyBase64(null);
            setPrivateKeyCryptoKey(null);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Check if key exists
            const exists = await keyExists(authUser.username);
            if (!exists) {
                throw new Error(`No private key found for user: ${authUser.username}`);
            }

            // Retrieve key from IndexedDB
            const keyBase64 = await retrievePrivateKey(authUser.username);
            if (!keyBase64) {
                throw new Error("Failed to retrieve private key from secure storage");
            }

            // Import key to CryptoKey object for use in Web Crypto API
            const cryptoKey = await importPrivateKey(keyBase64);

            setPrivateKeyBase64(keyBase64);
            setPrivateKeyCryptoKey(cryptoKey);
            setError(null);
        } catch (err) {
            console.error("Error loading private key:", err);
            setError(err.message);
            setPrivateKeyBase64(null);
            setPrivateKeyCryptoKey(null);
        } finally {
            setIsLoading(false);
        }
    }, [authUser?.username]);

    /**
     * Refresh/reload the private key
     */
    const refreshKey = useCallback(() => {
        loadPrivateKey();
    }, [loadPrivateKey]);

    // Load key when user changes
    useEffect(() => {
        loadPrivateKey();
    }, [loadPrivateKey]);

    return {
        privateKey: privateKeyBase64,
        privateKeyCryptoKey,
        isLoading,
        error,
        refreshKey,
    };
};

export default usePrivateKey;
