import React, { useEffect, useState, useRef } from 'react';
import { getStableDeviceId } from '../services/deviceService';
import { joinRoom, sendMessage, getSocket, disconnectSocket } from '../services/socketService';
import Button from './Button';

interface ChatViewProps {
    roomId: string;
    partnerId: string;
    onLeave: () => void;
}

interface Message {
    senderId: string;
    message: string;
    timestamp: number;
    isSelf: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({ roomId, partnerId, onLeave }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [myId, setMyId] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            const id = await getStableDeviceId();
            setMyId(id);
            joinRoom(roomId);
        };
        init();

        // Listen for incoming messages
        const socket = getSocket();
        if (socket) {
            socket.on('receive_message', (data: { senderId: string, message: string, timestamp: number }) => {
                console.log("Received message:", data);
                setMessages(prev => [...prev, { ...data, isSelf: false }]);
            });

            socket.on('user_left_room', () => {
                setMessages(prev => [...prev, { senderId: 'system', message: 'Partner has left the chat.', timestamp: Date.now(), isSelf: false }]);
            });
        }

        return () => {
            if (socket) {
                socket.off('receive_message');
                socket.off('user_left_room');
                socket.emit('leave_room', roomId);
            }
        };
    }, [roomId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const deviceId = await getStableDeviceId();
        sendMessage(roomId, inputText, deviceId);

        // Optimistic update
        setMessages(prev => [...prev, { senderId: deviceId, message: inputText, timestamp: Date.now(), isSelf: true }]);
        setInputText('');
    };

    return (
        <div className="flex flex-col h-full w-full max-w-lg mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900/95 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-white">Anonymous Chat</h3>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Connected with {partnerId}
                    </p>
                </div>
                <button onClick={onLeave} className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors">
                    Leave
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950/50">
                {messages.length === 0 && (
                    <div className="text-center text-gray-600 mt-10">
                        <p>You are connected!</p>
                        <p>Say hello 👋</p>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.senderId === 'system'
                            ? 'bg-gray-800 text-gray-400 text-xs w-full text-center'
                            : msg.isSelf
                                ? 'bg-purple-600 text-white rounded-tr-none'
                                : 'bg-gray-800 text-gray-200 rounded-tl-none'
                            }`}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 bg-gray-900 flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500/50 text-white placeholder-gray-500 outline-none"
                />
                <button
                    onClick={handleSend}
                    disabled={!inputText.trim()}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-colors"
                >
                    Send
                </button>
            </div>
        </div>
    );
};
