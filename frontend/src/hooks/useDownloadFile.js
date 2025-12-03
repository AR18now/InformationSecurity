import { useState } from 'react';
import useKeyExchange from './useKeyExchange';
import { decryptFile } from '../utils/messageEncryption';
import toast from 'react-hot-toast';

const useDownloadFile = () => {
    const [loading, setLoading] = useState(false);
    const { getSessionKey } = useKeyExchange();

    const downloadFile = async (fileId, conversationId) => {
        setLoading(true);

        try {
            // Get encrypted file from server
            const res = await fetch(`/api/files/download/${fileId}`);
            const fileData = await res.json();

            if (fileData.error) {
                throw new Error(fileData.error);
            }

            // Get session key for decryption
            const sessionKey = await getSessionKey(conversationId);
            if (!sessionKey) {
                throw new Error("Session key not available. Cannot decrypt file.");
            }

            // Decrypt file client-side
            const decryptedBlob = await decryptFile(
                fileData.ciphertext,
                fileData.iv,
                fileData.authTag,
                fileData.originalFileName,
                fileData.fileType,
                sessionKey
            );

            // Create download link
            const url = window.URL.createObjectURL(decryptedBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileData.originalFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success(`File "${fileData.originalFileName}" downloaded successfully`);
            return true;

        } catch (error) {
            console.error("Error downloading file:", error);
            toast.error(error.message || "Failed to download file");
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { loading, downloadFile };
};

export default useDownloadFile;
