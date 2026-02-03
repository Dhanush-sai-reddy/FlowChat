import React, { useEffect, useState } from 'react';
import { getStableDeviceId } from '../services/deviceService';
import { connectSocket, joinQueue, leaveQueue, getSocket } from '../services/socketService';
import Button from './Button';

interface QueueViewProps {
    gender: 'male' | 'female' | 'other';
    nickname: string;
    onMatchFound: (data: { partnerId: string, partnerNickname: string, roomId: string }) => void;
    onCancel: () => void;
}

export const QueueView: React.FC<QueueViewProps> = ({ gender, nickname, onMatchFound, onCancel }) => {
    const [status, setStatus] = useState('Connection to server...');
    const [preference, setPreference] = useState<'male' | 'female' | 'any'>('any');
    const [isQueued, setIsQueued] = useState(false);

    useEffect(() => {
        // Initialize socket connection and set up listeners
        const init = async () => {
            const deviceId = await getStableDeviceId();
            const socket = connectSocket(deviceId);
            setStatus('Ready to find a match.');

            // Set up listeners AFTER socket is connected
            if (socket) {
                socket.on('match_found', (data) => {
                    console.log("MATCH FOUND!", data);
                    onMatchFound(data);
                });

                socket.on('queue_joined', (data) => {
                    setStatus(data.message || 'Waiting for a partner...');
                });
            }
        };
        init();

        return () => {
            // Cleanup listeners
            const socket = getSocket();
            if (socket) {
                socket.off('match_found');
                socket.off('queue_joined');
            }
        };
    }, [onMatchFound]);

    const handleFindMatch = async () => {
        const deviceId = await getStableDeviceId();
        setStatus('Looking for a match...');
        setIsQueued(true);
        joinQueue(deviceId, gender, preference, nickname);
    };

    const handleCancel = async () => {
        const deviceId = await getStableDeviceId();
        leaveQueue(deviceId, gender, preference);
        setIsQueued(false);
        setStatus('Ready to find a match.');
    };

    if (isQueued) {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-6 animate-pulse">
                <div className="text-4xl">🔍</div>
                <h2 className="text-2xl font-bold text-white">{status}</h2>
                <p className="text-gray-400">Searching for {preference === 'any' ? 'anyone' : preference}...</p>
                <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-6 space-y-8 max-w-md w-full mx-auto">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Who do you want to chat with?
            </h2>

            <div className="flex flex-col gap-3 w-full">
                {/* Preference Selection */}
                <div className="grid grid-cols-3 gap-2 bg-gray-900/50 p-1 rounded-xl">
                    {(['male', 'female', 'any'] as const).map((pref) => (
                        <button
                            key={pref}
                            onClick={() => setPreference(pref)}
                            className={`py-2 px-4 rounded-lg capitalize transition-all ${preference === pref
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {pref}
                        </button>
                    ))}
                </div>
            </div>

            <Button onClick={handleFindMatch} className="w-full text-lg py-6">
                Find Match
            </Button>

            <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-sm">
                Go Initial Screen
            </button>
        </div>
    );
};
