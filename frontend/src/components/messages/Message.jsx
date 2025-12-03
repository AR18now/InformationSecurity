import React, { useState, useEffect } from 'react'
import { useAuthContext } from '../../context/AuthContext';
import useConversation from '../../zustand/useConversation';
import { extractTime } from '../../utils/extractTime';
import useDownloadFile from '../../hooks/useDownloadFile';
import { BsDownload, BsFileEarmark } from 'react-icons/bs';

const Message = ({ message }) => {
    const { authUser } = useAuthContext();
    const { selectedConversation } = useConversation();
    const { loading: downloadLoading, downloadFile } = useDownloadFile();
    const [fileInfo, setFileInfo] = useState(null);

    const fromMe = message.senderId === authUser._id || message.senderId?._id === authUser._id;
    const formattedTime = extractTime(message.createdAt);

    const chatClassName = fromMe ? "chat-end" : "chat-start";
    const profilePic = fromMe ? authUser.profilePic : selectedConversation?.profilePic;
    const bubbleBgColor = fromMe ? "bg-blue-500" : "";

    // Check if message is a file (has file metadata)
    useEffect(() => {
        if (message.fileName || message.fileType || message.messageType === 'file') {
            setFileInfo({
                fileName: message.fileName,
                fileType: message.fileType,
                fileSize: message.fileSize,
                fileId: message.fileId || message._id
            });
        }
    }, [message]);

    // Handle decryption errors
    const messageText = message.decryptionError 
        ? "🔒 [Unable to decrypt message]" 
        : message.message || "[Encrypted message]";

    const handleFileDownload = async () => {
        if (!fileInfo || !selectedConversation) return;
        await downloadFile(fileInfo.fileId, selectedConversation._id);
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className={`chat ${chatClassName}`}>
            <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                    <img alt="Tailwind CSS chat bubble component" src={profilePic} />
                </div>
            </div>
            
            {/* File message */}
            {fileInfo ? (
                <div className={`chat-bubble text-white ${bubbleBgColor} p-4`}>
                    <div className="flex items-center gap-3">
                        <BsFileEarmark className="text-2xl" />
                        <div className="flex-1">
                            <div className="font-semibold">{fileInfo.fileName}</div>
                            <div className="text-xs opacity-75">
                                {formatFileSize(fileInfo.fileSize)} • {fileInfo.fileType}
                            </div>
                        </div>
                        <button
                            onClick={handleFileDownload}
                            disabled={downloadLoading}
                            className="p-2 hover:bg-white/20 rounded transition-colors"
                            title="Download file"
                        >
                            {downloadLoading ? (
                                <div className="loading loading-spinner loading-sm"></div>
                            ) : (
                                <BsDownload className="text-lg" />
                            )}
                        </button>
                    </div>
                    <div className="text-xs mt-2 opacity-75">
                        🔒 Encrypted file - Click to download and decrypt
                    </div>
                </div>
            ) : (
                /* Text message */
                <div className={`chat-bubble text-white ${bubbleBgColor} ${message.decryptionError ? 'opacity-75' : ''}`}>
                    {messageText}
                    {message.decryptionError && (
                        <span className="text-xs block mt-1 opacity-75">
                            Decryption failed - key may be missing or invalid
                        </span>
                    )}
                </div>
            )}

            <div className="chat-footer opacity-50 text-xs flex gap-1 items-center text-white">
                {formattedTime}
                {message.decrypted && (
                    <span className="text-green-400" title="Message decrypted successfully">🔒</span>
                )}
            </div>
        </div>
    );
};

export default Message;
