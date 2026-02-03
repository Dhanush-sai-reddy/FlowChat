import React, { useEffect, useState, useRef } from 'react';
import { getStableDeviceId } from '../services/deviceService';
import { connectSocket, joinQueue, leaveQueue, getSocket } from '../services/socketService';
import Button from './Button';
import { Icons } from '../constants';

type FilterOption = 'any' | 'male' | 'female';

interface QueueViewProps {
    gender: 'male' | 'female' | 'other';
    nickname: string;
    onMatchFound: (data: { partnerId: string, partnerNickname: string, roomId: string }) => void;
    onCancel: () => void;
    autoStart?: boolean;
}

export const QueueView: React.FC<QueueViewProps> = ({ gender, nickname, onMatchFound, onCancel, autoStart = false }) => {
    const [status, setStatus] = useState('Connecting to server...');
    const [matchFilter, setMatchFilter] = useState<FilterOption>('any');
    const [isQueued, setIsQueued] = useState(false);
    const [queueTime, setQueueTime] = useState(0);
    const [remainingSpecific, setRemainingSpecific] = useState(5); // Default, updated by server
    const hasAutoStarted = useRef(false);

    const isSpecificLimitReached = remainingSpecific <= 0;

    useEffect(() => {
        let interval: number | undefined;
        if (isQueued) {
            interval = window.setInterval(() => {
                setQueueTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isQueued]);

    useEffect(() => {
        const init = async () => {
            const deviceId = await getStableDeviceId();
            const socket = connectSocket(deviceId);
            setStatus('Ready to find a match.');

            if (socket) {
                // Request initial limit
                socket.emit('get_limit', deviceId);

                socket.on('limit_update', (data: { remaining: number }) => {
                    setRemainingSpecific(data.remaining);
                });

                socket.on('match_found', (data) => {
                    console.log("MATCH FOUND!", data);
                    // No client-side increment needed, server updates us via limit_update
                    onMatchFound(data);
                });

                socket.on('error', (data) => {
                    if (data.message === "Daily specific match limit reached.") {
                        setIsQueued(false);
                        setMatchFilter('any');
                        alert("Daily limit reached for specific filters. Switching to 'Any'.");
                    }
                });

                socket.on('queue_joined', (data) => {
                    setStatus(data.message || 'Waiting for a partner...');
                });
            }

            if (autoStart && !hasAutoStarted.current) {
                hasAutoStarted.current = true;
                setStatus('Looking for a match...');
                setIsQueued(true);
                setQueueTime(0);
                joinQueue(deviceId, gender, matchFilter, nickname);
            }
        };
        init();

        return () => {
            const socket = getSocket();
            if (socket) {
                socket.off('match_found');
                socket.off('queue_joined');
                socket.off('limit_update');
                socket.off('error');
            }
        };
    }, [onMatchFound, autoStart, gender, matchFilter, nickname]);

    const handleFindMatch = async () => {
        const deviceId = await getStableDeviceId();
        setStatus('Looking for a match...');
        setIsQueued(true);
        setQueueTime(0);
        joinQueue(deviceId, gender, matchFilter, nickname);
    };

    const handleFilterChange = async (newFilter: FilterOption) => {
        if (newFilter !== 'any' && isSpecificLimitReached) return;

        const oldFilter = matchFilter;
        setMatchFilter(newFilter);
        setQueueTime(0);

        if (isQueued) {
            const deviceId = await getStableDeviceId();
            leaveQueue(deviceId, gender, oldFilter);
            joinQueue(deviceId, gender, newFilter, nickname);
        }
    };

    const handleCancel = async () => {
        const deviceId = await getStableDeviceId();
        leaveQueue(deviceId, gender, matchFilter);
        setIsQueued(false);
        setQueueTime(0);
        setStatus('Ready to find a match.');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
            <div className="relative w-32 h-32 mb-8">
                <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                <div className={`absolute inset-0 border-4 border-t-teal-500 border-r-transparent border-b-transparent border-l-transparent rounded-full ${isQueued ? 'animate-spin' : ''}`}></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.Handshake />
                </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
                {isQueued ? 'Finding a match...' : 'Who do you want to chat with?'}
            </h2>
            <p className="text-slate-400 mb-8">
                Looking for <span className="text-teal-400 font-semibold">{matchFilter === 'any' ? 'Any' : matchFilter.charAt(0).toUpperCase() + matchFilter.slice(1)}</span> matches
            </p>

            <div className="flex gap-2 mb-4 justify-center">
                {(['any', 'male', 'female'] as FilterOption[]).map(opt => {
                    const isSpecific = opt !== 'any';
                    const isDisabled = isSpecific && isSpecificLimitReached;

                    return (
                        <button
                            key={opt}
                            onClick={() => handleFilterChange(opt)}
                            disabled={isDisabled}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${matchFilter === opt
                                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                                    : isDisabled
                                        ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-800'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                                }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>

            <div className="h-6 mb-8">
                {isSpecificLimitReached ? (
                    <p className="text-xs text-red-400">
                        Daily specific filter limit reached. Using "Any" is unlimited.
                    </p>
                ) : matchFilter === 'any' ? (
                    <p className="text-xs text-slate-500">
                        Using "Any" is unlimited and won't use your specific matches.
                    </p>
                ) : (
                    <p className="text-xs text-slate-500">
                        Specific filter matches remaining: <span className="text-slate-300">{remainingSpecific}</span>
                    </p>
                )}
            </div>

            {isQueued && (
                <p className="text-xs text-slate-600 mb-4">Time elapsed: {queueTime}s</p>
            )}

            <div className="mt-4">
                {isQueued ? (
                    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                ) : (
                    <Button onClick={handleFindMatch}>Find Match</Button>
                )}
            </div>

            {!isQueued && (
                <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 text-sm mt-8">
                    Go back
                </button>
            )}
        </div>
    );
};
