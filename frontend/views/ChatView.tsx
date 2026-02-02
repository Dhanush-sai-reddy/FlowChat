import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, UserProfile } from '../types';
import Button from '../components/Button';
import { Icons } from '../constants';

interface ChatViewProps {
  partnerProfile: { nickname: string; bio: string; gender: string };
  onLeave: () => void;
  onNext: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ partnerProfile, onLeave, onNext }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fake "Stranger" messages logic
  const strangerResponses = [
    "Hey there! How's it going?",
    "That's interesting.",
    "I'm using Klymo because I value privacy.",
    "Have you verified your gender?",
    "What do you do for fun?",
    "Cool!",
    "I gotta go soon, but nice chatting."
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      addMessage('stranger', "Connected! Say hi.");
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const addMessage = (sender: 'me' | 'stranger' | 'system', text: string) => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender,
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    addMessage('me', input);
    setInput('');

    // Simulate response delay
    const delay = Math.random() * 2000 + 1000;
    setTimeout(() => {
      const randomResponse = strangerResponses[Math.floor(Math.random() * strangerResponses.length)];
      addMessage('stranger', randomResponse);
    }, delay);
  };

  // Helper to render name. 
  // We strip the #Discriminator for the UI to keep it clean, 
  // even though it exists in the data for system uniqueness.
  const renderName = (fullName: string) => {
    const cleanName = fullName.split('#')[0];
    return <span className="font-semibold text-white">{cleanName}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {partnerProfile.nickname[0].toUpperCase()}
          </div>
          <div>
            <h3 className="text-sm">
              {renderName(partnerProfile.nickname)}
            </h3>
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              {partnerProfile.gender} • {partnerProfile.bio || "No bio"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="danger" onClick={onLeave} className="!p-2 !rounded-lg" title="Report & Leave">
             <Icons.XMark />
           </Button>
           <Button variant="secondary" onClick={onNext} className="!px-3 !py-2 !text-sm" title="Next Match">
             Next
           </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-xs text-slate-600 my-4">
          Chat is end-to-end encrypted. Messages are ephemeral.
        </div>
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
              msg.sender === 'me' 
                ? 'bg-teal-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
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
      </div>
    </div>
  );
};

export default ChatView;