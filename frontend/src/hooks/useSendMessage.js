import { useState } from 'react';
import useConversation from '../zustand/useConversation';
import toast from 'react-hot-toast';
import useKeyExchange from './useKeyExchange';
import { encryptMessage, decryptMessage } from '../utils/messageEncryption';
import { useAuthContext } from '../context/AuthContext';

// Generate a unique nonce for replay protection
function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

const useSendMessage = () => {
    const [loading, setLoading] = useState(false);
    const { messages, setMessages, selectedConversation } = useConversation();
    const { getSessionKey } = useKeyExchange();
    const { authUser } = useAuthContext();

    const sendMessage = async (plaintextMessage) => {
        if (!plaintextMessage || !plaintextMessage.trim()) {
            toast.error("Message cannot be empty");
            return;
        }

        setLoading(true);

        try {
            // Get conversation ID
            const receiverId = selectedConversation?._id;
            if (!receiverId) {
                throw new Error("No conversation selected");
            }

            // Stable conversation ID for key lookup (must match MessageContainer / useGetMessages)
            const conversationIdForKey = authUser?._id && receiverId
                ? [authUser._id.toString(), receiverId.toString()].sort().join("_")
                : receiverId;

            // Get session key for this conversation
            const sessionKey = await getSessionKey(conversationIdForKey);
            if (!sessionKey) {
                throw new Error("Session key not available. Key exchange may be in progress.");
            }

            // Encrypt message client-side
            const { ciphertext, iv, authTag } = await encryptMessage(plaintextMessage, sessionKey);

            // Get sequence number (increment from last message or start at 1)
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const sequenceNumber = lastMessage && lastMessage.sequenceNumber 
                ? lastMessage.sequenceNumber + 1 
                : 1;

            // Generate nonce for replay protection
            const nonce = generateNonce();

            // Send encrypted message to server
            const res = await fetch(`/api/messages/send/${receiverId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ciphertext: ciphertext,
                    iv: iv,
                    authTag: authTag,
                    messageType: 'text',
                    sequenceNumber: sequenceNumber,
                    messageTimestamp: Date.now(),
                    nonce: nonce
                }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Check if it's a file message
            if (data.messageType === 'file' || data.fileId) {
                // File message - no decryption needed
                const messageForUI = {
                    ...data,
                    message: `[File: ${data.fileName || 'Encrypted file'}]`,
                    senderId: authUser._id,
                    decrypted: true
                };
                setMessages([...messages, messageForUI]);
            } else {
                // Text message - decrypt for local display
                const decryptedMessage = await decryptMessage(data.ciphertext, data.iv, data.authTag, sessionKey);
                
                // Create message object with decrypted content for UI
                const messageForUI = {
                    ...data,
                    message: decryptedMessage, // Decrypted for display
                    senderId: authUser._id,
                    decrypted: true
                };

                setMessages([...messages, messageForUI]);
            }

        } catch (error) {
            console.error("Error sending message:", error);
            toast.error(error.message || "Failed to send message");
        } finally {
            setLoading(false);
        }
    };

    return { loading, sendMessage };
};

export default useSendMessage;