import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthContext } from '../context/AuthContext';
import { generateKeyPair, storePrivateKey, verifyKeyPair } from '../utils/keyStorage';
const useSignup = () => {
    const [loading, setLoading] = useState(false);
    const { setAuthUser } = useAuthContext();

    const signup = async (fullName, username, password, confirmPassword, gender) => {
        const success = handleInputErrors(fullName, username, password, confirmPassword, gender);
        if (!success) return;
        setLoading(true);

        try {
            console.log({ fullName, username, password, confirmPassword, gender });

            // Generate RSA key pair using centralized utility
            const { publicKeyBase64, privateKeyBase64 } = await generateKeyPair();

            // Verify key pair is valid before storing
            const isValid = await verifyKeyPair(privateKeyBase64, publicKeyBase64);
            if (!isValid) {
                throw new Error("Generated key pair validation failed");
            }

            // Store private key securely in IndexedDB
            await storePrivateKey(privateKeyBase64, username);
            console.log("Private key stored successfully in IndexedDB");

            // Send PUBLIC key to backend
            const res = await fetch('/api/auth/signup', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName,
                    username,
                    password,
                    confirmPassword,
                    gender,
                    publicKey: publicKeyBase64
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Something went wrong');
            }

            const data = await res.json();
            if (data.error) {
                throw new Error(data.error);
            }

            localStorage.setItem("chat-user", JSON.stringify(data));
            setAuthUser(data);

            console.log(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return { loading, signup };
};

// Input validation
function handleInputErrors(fullName, username, password, confirmPassword, gender) {
    if (!fullName || !username || !password || !confirmPassword || !gender) {
        toast.error('All fields are required');
        return false;
    }
    if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return false;
    }
    if (password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return false;
    }
    return true;
}

export default useSignup;