import { useEffect, useState } from "react";
import useConversation from "../zustand/useConversation";
import toast from "react-hot-toast";
import useKeyExchange from "./useKeyExchange";
import { decryptMessage } from "../utils/messageEncryption";
import { useAuthContext } from "../context/AuthContext";

const useGetMessages = () => {
    const [loading, setLoading] = useState(false);
    const { messages, setMessages, selectedConversation } = useConversation();
    const { getSessionKey } = useKeyExchange();
    const { authUser } = useAuthContext();

    useEffect(() => {
        const getMessages = async (showLoading = true) => {
            if (!selectedConversation?._id) return;

            if (showLoading) setLoading(true);
            try {
                const res = await fetch(`/api/messages/${selectedConversation._id}`);
                const data = await res.json();

                if (data.error) throw new Error(data.error);

                // Get session key for decryption
                // Build the same stable conversation ID used by the key exchange hook
                const conversationId = authUser?._id && selectedConversation._id
                    ? [authUser._id.toString(), selectedConversation._id.toString()].sort().join("_")
                    : selectedConversation._id?.toString() || selectedConversation._id;
                const sessionKey = await getSessionKey(conversationId);

                if (!sessionKey) {
                    console.warn("Session key not available. Key exchange may be in progress.");
                    // Don't show error toast here - it's too frequent
                    // Just store encrypted messages - they'll be decrypted when key is available
                    // Show encrypted messages with a note
                    const encryptedMessages = data.map(msg => ({
                        ...msg,
                        message: msg.messageType === 'file' 
                            ? `[File: ${msg.fileName || 'Encrypted file'}]`
                            : "[Encrypted - waiting for key exchange]",
                        decrypted: false,
                        waitingForKey: true
                    }));
                    setMessages(encryptedMessages);
                    setLoading(false);
                    return;
                }

                // Decrypt all messages client-side
                const decryptedMessages = await Promise.all(
                    data.map(async (message) => {
                        try {
                            // Check if it's a file message
                            if (message.messageType === 'file' || message.fileId) {
                                // File message - no decryption needed, just return metadata
                                return {
                                    ...message,
                                    message: `[File: ${message.fileName || 'Encrypted file'}]`,
                                    decrypted: true
                                };
                            }

                            // Only decrypt text messages if we have the required fields
                            if (message.ciphertext && message.iv && message.authTag && 
                                message.ciphertext !== "[FILE]") {
                                const decryptedText = await decryptMessage(
                                    message.ciphertext,
                                    message.iv,
                                    message.authTag,
                                    sessionKey
                                );

                                return {
                                    ...message,
                                    message: decryptedText, // Decrypted plaintext for display
                                    decrypted: true
                                };
                            } else {
                                // Legacy message or missing encryption data
                                console.warn("Message missing encryption data:", message);
                                return {
                                    ...message,
                                    message: message.message || "[Encrypted message - unable to decrypt]",
                                    decrypted: false
                                };
                            }
                        } catch (error) {
                            console.error("Error decrypting message:", error);
                            console.warn("Message may have been encrypted with a different session key. This can happen if the message was sent before key exchange completed.");
                            
                            // Log decryption failure to backend (if possible)
                            try {
                                await fetch('/api/security/decryption-failure', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        messageId: message._id,
                                        conversationId: conversationId
                                    })
                                });
                            } catch (logError) {
                                // Ignore logging errors
                            }
                            
                            // Return message with error indicator
                            return {
                                ...message,
                                message: "[Unable to decrypt - may be from before key exchange]",
                                decryptionError: true,
                                decrypted: false
                            };
                        }
                    })
                );

                setMessages(decryptedMessages);
            } catch (error) {
                console.error("Error fetching messages:", error);
                toast.error(error.message || "Failed to load messages");
            } finally {
                if (showLoading) setLoading(false);
            }
        };

        // Fetch messages immediately when conversation changes (with loading indicator)
        getMessages(true);

        // Poll for new messages every 2 seconds when conversation is selected (without loading indicator)
        const intervalId = setInterval(() => {
            if (selectedConversation?._id) {
                getMessages(false); // Don't show loading spinner on polling
            }
        }, 2000); // Poll every 2 seconds

        // Cleanup interval on unmount or conversation change
        return () => clearInterval(intervalId);
    }, [selectedConversation?._id, setMessages, getSessionKey, authUser]);

    return [messages, loading];
};

export default useGetMessages;