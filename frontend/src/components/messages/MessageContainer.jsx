import React, { useEffect, useState } from 'react'
import Messages from './Messages';
import MessageInput from './MessageInput';
import { TiMessages } from "react-icons/ti"
import useConversation from '../../zustand/useConversation';
import { useAuthContext } from '../../context/AuthContext';
import useKeyExchange from '../../hooks/useKeyExchange';
import toast from 'react-hot-toast';

const MessageContainer = () => {

    const { selectedConversation, setSelectedConversation } = useConversation();
    const { authUser } = useAuthContext();
    const { initiateKeyExchange, needsKeyExchange, isExchanging, handleKeyExchangeMessage, getSessionKey } = useKeyExchange();
    const [keyExchangeInitiated, setKeyExchangeInitiated] = useState(false);
    const [showRetryButton, setShowRetryButton] = useState(false);

    // Helper to build a stable conversation ID for key exchange / session keys
    // We use a sorted combination of both user IDs so both sides derive the same ID
    const getConversationKeyId = () => {
        if (!selectedConversation || !authUser?._id || !selectedConversation._id) return null;
        const ids = [authUser._id.toString(), selectedConversation._id.toString()].sort();
        return ids.join("_");
    };

    // Automatic key exchange when conversation is selected
    useEffect(() => {
        const performKeyExchange = async () => {
            if (!selectedConversation || !authUser) return;

            // In this UI, selectedConversation is the OTHER user (from sidebar), not a Conversation document
            // Skip key exchange if the user somehow selects themself
            if (selectedConversation._id?.toString() === authUser._id?.toString()) {
                console.warn("Selected conversation is the same user; skipping key exchange");
                return;
            }

            const conversationId = getConversationKeyId();
            const receiverId = selectedConversation._id?.toString() || selectedConversation._id;

            if (!conversationId || !receiverId) {
                console.warn("Unable to derive conversation / receiver IDs for key exchange");
                return;
            }

            // Check if key exchange is needed
            const needsExchange = await needsKeyExchange(conversationId);
            
            if (needsExchange && !keyExchangeInitiated && !isExchanging) {
                setKeyExchangeInitiated(true);
                console.log("Initiating automatic key exchange for conversation:", conversationId);
                toast.loading("Establishing secure connection...", { id: "key-exchange" });
                
                try {
                    const success = await initiateKeyExchange(receiverId, conversationId);
                    
                    if (success) {
                        console.log("✅ Key exchange completed successfully");
                        toast.success("Secure connection established!", { id: "key-exchange" });
                        // Reload messages to decrypt them
                        window.location.reload();
                    } else {
                        // Don't show error immediately - might be waiting for other user
                        console.warn("Key exchange in progress or waiting for other user...");
                        // Allow retry after timeout
                        setTimeout(async () => {
                            const hasKey = await getSessionKey(conversationId);
                            if (!hasKey && !isExchanging) {
                                setShowRetryButton(true);
                                setKeyExchangeInitiated(false);
                            }
                        }, 35000); // After 35 seconds
                    }
                } catch (error) {
                    console.error("Key exchange error:", error);
                    toast.error(error.message || "Key exchange failed", { id: "key-exchange" });
                    setKeyExchangeInitiated(false);
                }
            }
        };

        // Reset when conversation changes
        setKeyExchangeInitiated(false);
        setShowRetryButton(false);
        performKeyExchange();
    }, [selectedConversation, authUser, initiateKeyExchange, needsKeyExchange, keyExchangeInitiated, isExchanging, getSessionKey, showRetryButton]);

    // Check for pending key exchange messages
    useEffect(() => {
        const checkPendingExchanges = async () => {
            if (!selectedConversation || !authUser) return;

            try {
                const response = await fetch('/api/keyexchange/pending');
                if (response.ok) {
                    const data = await response.json();
                    const conversationId = getConversationKeyId();
                    const pending = data.pending.find(
                        p => p.conversationId === conversationId || p.conversationId?.toString() === conversationId
                    );

                    if (pending && pending.init) {
                        // Get sender's public key
                        const senderKeyResponse = await fetch(`/api/keyexchange/users/${pending.senderId}/publickey`);
                        if (senderKeyResponse.ok) {
                            const senderKeyData = await senderKeyResponse.json();
                            const convId = conversationId;
                            await handleKeyExchangeMessage(
                                pending.init,
                                pending.senderId,
                                senderKeyData.publicKey,
                                convId
                            );
                        }
                    }
                }
            } catch (error) {
                console.error("Error checking pending key exchanges:", error);
            }
        };

        if (selectedConversation && authUser) {
            checkPendingExchanges();
            // Check periodically
            const interval = setInterval(checkPendingExchanges, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedConversation, authUser, handleKeyExchangeMessage]);

    useEffect(() => {
        // cleanup function (unmounts)
        return () => setSelectedConversation(null);
    }, [setSelectedConversation]);

    return (
        <div className="md:min-w-[450px] flex flex-col">
            {!selectedConversation ? (
                <NoChatSelected />
            ) : (
                <>
                    {/* Header */}
                    <div className="bg-slate-500 px-4 py-2 mb-2">
                        <span className="label-text">To: </span>
                        <span className="text-gray-900 font-bold">{selectedConversation.fullName}</span>
                    </div>

                    <Messages />
                    {isExchanging && (
                        <div className="px-4 py-2 bg-blue-500 text-white text-sm text-center">
                            🔐 Establishing secure connection...
                        </div>
                    )}
                    {showRetryButton && !isExchanging && (
                        <div className="px-4 py-2 bg-yellow-500 text-white text-sm text-center">
                            ⚠️ Key exchange pending. The other user may be offline.
                            <button 
                                onClick={async () => {
                                    if (!selectedConversation || !authUser) return;
                                    
                                    const conversationId = selectedConversation._id?.toString() || selectedConversation._id;
                                    const otherUser = selectedConversation.participants.find(
                                        p => p._id?.toString() !== authUser._id?.toString() && p._id !== authUser._id
                                    );
                                    
                                    if (otherUser) {
                                        const receiverId = otherUser._id?.toString() || otherUser._id;
                                        setShowRetryButton(false);
                                        setKeyExchangeInitiated(false);
                                        
                                        toast.loading("Retrying key exchange...", { id: "key-exchange-retry" });
                                        const success = await initiateKeyExchange(receiverId, conversationId);
                                        
                                        if (success) {
                                            toast.success("Secure connection established!", { id: "key-exchange-retry" });
                                            window.location.reload();
                                        } else {
                                            toast.error("Still waiting for other user...", { id: "key-exchange-retry" });
                                        }
                                    }
                                }}
                                className="ml-2 underline font-bold hover:bg-yellow-600 px-2 py-1 rounded"
                            >
                                Retry Key Exchange
                            </button>
                        </div>
                    )}
                    <MessageInput />
                </>
            )}
        </div>
    );
}

export default MessageContainer

const NoChatSelected = () => {
    const { authUser } = useAuthContext();
    return (
        <div className="flex items-center justify-center w-full h-full">
            <div className="px-4 text-center sm:text-lg md:text-xl text-gray-200 font-semibold flex flex-col items-center gap-2">
                <p>Welcome 👤 {authUser.fullName}</p>
                <p>Select a chat to start messaging</p>
                <TiMessages className="text-3xl md:text-6xl text-center" />
            </div>
        </div>
    );
};