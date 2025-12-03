import { useState } from 'react';
import useConversation from '../zustand/useConversation';
import useKeyExchange from './useKeyExchange';
import { encryptFile } from '../utils/messageEncryption';
import { useAuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Generate a unique nonce for replay protection
function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
import useSendMessage from './useSendMessage';

const useUploadFile = () => {
    const [loading, setLoading] = useState(false);
    const { selectedConversation, setMessages, messages } = useConversation();
    const { getSessionKey } = useKeyExchange();
    const { authUser } = useAuthContext();

    const uploadFile = async (file) => {
        if (!file) {
            toast.error("No file selected");
            return false;
        }

        if (!selectedConversation) {
            toast.error("No conversation selected");
            return false;
        }

        setLoading(true);

        try {
            const receiverId = selectedConversation._id;
            if (!receiverId) {
                throw new Error("Receiver not found");
            }

            // Build the same stable conversation ID used elsewhere for key lookup
            const conversationIdForKey = authUser?._id && receiverId
                ? [authUser._id.toString(), receiverId.toString()].sort().join("_")
                : receiverId;

            // Get session key for this conversation
            const sessionKey = await getSessionKey(conversationIdForKey);
            if (!sessionKey) {
                throw new Error("Session key not available. Key exchange may be in progress.");
            }

            // Encrypt file client-side
            const encryptedData = await encryptFile(file, sessionKey);

            // Get sequence number (increment from last message, same as text messages)
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            const sequenceNumber = lastMessage && lastMessage.sequenceNumber 
                ? lastMessage.sequenceNumber + 1 
                : 1;

            // Generate nonce for replay protection
            const nonce = generateNonce();

            // Send encrypted file to server
            const res = await fetch(`/api/files/upload/${receiverId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ciphertext: encryptedData.ciphertext,
                    iv: encryptedData.iv,
                    authTag: encryptedData.authTag,
                    originalFileName: encryptedData.fileName,
                    fileType: encryptedData.fileType,
                    fileSize: encryptedData.fileSize,
                    encryptedSize: encryptedData.ciphertext.length,
                    sequenceNumber: sequenceNumber,
                    fileTimestamp: Date.now(),
                    nonce: nonce
                }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            toast.success(`File "${encryptedData.fileName}" uploaded successfully`);
            
            // Add file message to UI (if messageId is returned)
            if (data.messageId) {
                const fileMessage = {
                    _id: data.messageId,
                    senderId: authUser._id,
                    messageType: 'file',
                    fileName: encryptedData.fileName,
                    fileType: encryptedData.fileType,
                    fileSize: encryptedData.fileSize,
                    fileId: data._id,
                    message: `[File: ${encryptedData.fileName}]`,
                    decrypted: true,
                    createdAt: new Date()
                };
                setMessages([...messages, fileMessage]);
            }
            
            // Return file data
            return data;

        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(error.message || "Failed to upload file");
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { loading, uploadFile };
};

export default useUploadFile;
