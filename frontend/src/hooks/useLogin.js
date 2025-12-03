import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../context/AuthContext';
import { retrievePrivateKey, keyExists, verifyKeyPair } from '../utils/keyStorage';

const useLogin = () => {
    const [loading, setLoading] = useState(false);
    const { setAuthUser } = useAuthContext();

    const login = async (username, password) => {

        const success = handleInputErrors(username, password);
        if (!success) return;

        setLoading(true);

        try {

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Retrieve private key from IndexedDB after successful login
            const privateKeyExists = await keyExists(username);
            if (!privateKeyExists) {
                console.warn(`No private key found for user: ${username}. Key may need to be regenerated.`);
                toast.error("Private key not found. Please contact support or re-register.");
                throw new Error("Private key not found. Account may need key regeneration.");
            }

            // Retrieve and verify private key
            const privateKeyBase64 = await retrievePrivateKey(username);
            if (!privateKeyBase64) {
                throw new Error("Failed to retrieve private key from secure storage");
            }

            // If public key is available from backend, verify the key pair
            if (data.publicKey) {
                const isValid = await verifyKeyPair(privateKeyBase64, data.publicKey);
                if (!isValid) {
                    console.error("Key pair verification failed. Keys may be corrupted.");
                    toast.error("Key verification failed. Please contact support.");
                    throw new Error("Key pair verification failed");
                }
                console.log("Key pair verified successfully");
            }

            // Store user data in localStorage
            localStorage.setItem("chat-user", JSON.stringify(data));
            
            // Store private key reference in memory (not in localStorage for security)
            // The key is already in IndexedDB, we just verified it exists
            setAuthUser(data);

            console.log("Login successful. Private key retrieved and verified.");

        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return { loading, login };
};

export default useLogin;

function handleInputErrors(username, password) {
    if (!username || !password) {
        toast.error("Please fill in all fields");
        return false;
    }

    return true;
}