import { BsSend, BsPaperclip } from "react-icons/bs";
import React, { useState, useRef } from 'react'
import useSendMessage from "../../hooks/useSendMessage";
import useUploadFile from "../../hooks/useUploadFile";
import toast from 'react-hot-toast';

const MessageInput = () => {

    const [message, setMessage] = useState("");
    const { loading, sendMessage } = useSendMessage();
    const { loading: fileLoading, uploadFile } = useUploadFile();
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message) return;

        await sendMessage(message);
        setMessage("");
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (e.g., max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            toast.error("File size exceeds 10MB limit");
            return;
        }

        await uploadFile(file);
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <form className="px-4 my-3" onSubmit={handleSubmit}>
            <div className="w-full relative flex items-center gap-2">
                {/* File upload button */}
                <button
                    type="button"
                    onClick={handleFileButtonClick}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Attach file"
                    disabled={fileLoading}
                >
                    {fileLoading ? (
                        <div className="loading loading-spinner loading-sm"></div>
                    ) : (
                        <BsPaperclip className="text-xl" />
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept="*/*"
                />

                {/* Message input */}
                <input
                    type="text"
                    className="border text-sm rounded-lg block w-full p-2.5 bg-gray-700 border-gray-600 text-white"
                    placeholder="Send a message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                
                {/* Send button */}
                <button 
                    type="submit" 
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    disabled={loading}
                >
                    {loading ? (
                        <div className="loading loading-spinner loading-sm"></div>
                    ) : (
                        <BsSend className="text-xl" />
                    )}
                </button>
            </div>
        </form>
    );
}

export default MessageInput