import React, { useState, useEffect, useRef } from 'react';
import { getStableDeviceId } from '../services/deviceService';
import { joinRoom, sendMessage, getSocket, reportUser } from '../services/socketService';
import Button from './Button';
import { Icons } from '../constants';

interface ChatViewProps {
    roomId: string;
    partnerId: string; // This must be the Device ID for reporting/matching
    partnerNickname?: string; // This is for display
    partnerGender?: string;
    partnerBio?: string;
    onNext: () => void;
}

interface Message {
    id: string;
    sender: 'me' | 'stranger' | 'system';
    text: string;
    timestamp: number;
}

export const ChatView: React.FC<ChatViewProps> = ({
    roomId,
    partnerId,
    partnerNickname = 'Stranger',
    partnerGender = 'Unknown',
    partnerBio = 'Just exploring Klymo.',
    onNext
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [partnerLeft, setPartnerLeft] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
        // Consistency check: If last message says partner left, ensure state reflects it
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.sender === 'system' && lastMsg.text === 'Partner has left the chat.' && !partnerLeft) {
                setPartnerLeft(true);
            }
        }
    }, [messages, partnerLeft]);

    useEffect(() => {
        const init = async () => {
            const id = await getStableDeviceId();
            joinRoom(roomId);
        };
        init();

        const socket = getSocket();
        if (socket) {
            socket.on('receive_message', (data: { senderId: string, message: string, timestamp: number }) => {
                const newMsg: Message = {
                    id: crypto.randomUUID(),
                    sender: 'stranger',
                    text: data.message,
                    timestamp: data.timestamp
                };
                setMessages(prev => [...prev, newMsg]);
            });

            socket.on('user_left_room', () => {
                setPartnerLeft(true);
                const systemMsg: Message = {
                    id: crypto.randomUUID(),
                    sender: 'system',
                    text: 'Partner has left the chat.',
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, systemMsg]);
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

    const addMessage = (sender: 'me' | 'stranger' | 'system', text: string) => {
        const newMsg: Message = {
            id: crypto.randomUUID(),
            sender,
            text,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, newMsg]);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || partnerLeft) return;

        const deviceId = await getStableDeviceId();
        sendMessage(roomId, input, deviceId);
        addMessage('me', input);
        setInput('');
    };

    const handleReport = async () => {
        // Report Logic
        const myId = await getStableDeviceId();
        reportUser(partnerId, myId);

        alert('User reported. Thank you for helping keep Klymo safe.');
        onNext(); // Leave chat immediately
    };

    const renderName = (fullName: string) => {
        const cleanName = fullName.split('#')[0];
        return <span className="font-semibold text-white">{cleanName}</span>;
    };

    return (
        <div className="flex flex-col h-full bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {partnerNickname[0]?.toUpperCase() || 'A'}
                    </div>
                    <div>
                        <h3 className="text-sm">{renderName(partnerNickname)}</h3>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${partnerLeft ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            {partnerLeft ? 'Disconnected' : `${partnerGender} • ${partnerBio}`}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="danger" onClick={handleReport} className="!p-2 !rounded-lg" title="Report & Leave">
                        <Icons.XMark />
                    </Button>
                    <Button variant="secondary" onClick={onNext} className="!px-3 !py-2 !text-sm" title="Next Match">
                        Next
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="text-center text-xs text-slate-600 my-4">
                    Chat is end-to-end encrypted. Messages are ephemeral.
                </div>

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${msg.sender === 'me'
                            ? 'bg-teal-600 text-white rounded-tr-none'
                            : msg.sender === 'system'
                                ? 'bg-slate-800/50 text-slate-500 text-xs text-center w-full'
                                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800">
                {partnerLeft ? (
                    <div className="text-center">
                        <p className="text-slate-500 text-sm mb-3">Partner has disconnected</p>
                        <Button onClick={onNext} className="w-full">
                            Find New Match
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-colors"
                        />
                        <Button type="submit" disabled={!input.trim()} className="!rounded-xl !px-4">
                            <Icons.Send />
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
};
