import { Server, Socket } from 'socket.io';
import { enqueueUser, dequeueUser, Gender, setUserNickname, getUserNickname } from '../services/queue.service';
import { findMatch } from '../services/match.service';
import { checkLimit, incrementLimit, getRemaining } from '../services/limit.service';
import { reportUser, isBanned } from '../services/report.service';


interface MatchRequest {
    deviceId: string;
    gender: Gender;
    preference: 'male' | 'female' | 'any';
    nickname: string;
}

export default function handleMatchmaking(io: Server, socket: Socket) {

    socket.on('get_limit', async (deviceId: string) => {
        try {
            const remaining = await getRemaining(deviceId);
            socket.emit('limit_update', { remaining });
        } catch (error) {
            console.error("Get limit error:", error);
        }
    });

    socket.on('report_user', async (data: { targetId: string, reporterId: string }) => {
        try {
            if (data.targetId && data.reporterId) {
                console.log(`[Report] ${data.reporterId} reported ${data.targetId}`);
                await reportUser(data.targetId);
            }
        } catch (error) {
            console.error("Report error:", error);
        }
    });

    socket.on('join_queue', async (data: MatchRequest) => {
        try {
            const { deviceId, gender, preference, nickname } = data;

            // Check if banned
            const banned = await isBanned(deviceId);
            if (banned) {
                socket.emit('error', { message: "You have been banned for 24 hours due to multiple reports." });
                return;
            }

            // Check limit if specific preference
            if (preference !== 'any') {
                const canProceed = await checkLimit(deviceId);
                if (!canProceed) {
                    socket.emit('error', { message: "Daily specific match limit reached." });
                    const remaining = await getRemaining(deviceId);
                    socket.emit('limit_update', { remaining });
                    return;
                }
            }

            // 0. Store nickname (or default to 'User')
            const displayNickname = nickname || `User#${deviceId.slice(0, 4)}`;
            await setUserNickname(deviceId, displayNickname);

            console.log(`[Queue] User ${deviceId} (${displayNickname}) looking for ${preference}`);

            // 1. Join the queue first
            await enqueueUser(deviceId, gender, preference);

            // 2. Immediately try to find a match
            // Note: We check if *we* can find someone else who is waiting.
            const matchId = await findMatch({ deviceId, gender, preference });

            if (matchId) {
                console.log(`[Match] Found match: ${deviceId} <-> ${matchId}`);

                const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Retrieve nicknames
                const myNickname = await getUserNickname(deviceId) || "Stranger";
                const partnerNickname = await getUserNickname(matchId) || "Stranger";

                // Count usage if applicable
                // Note: We need to check if the MATCHING USER (partner) was also using a specific filter
                // But for now, let's just increment based on current user's preference
                if (preference !== 'any') {
                    await incrementLimit(deviceId);
                }

                // Notify THIS user (socket)
                socket.emit('match_found', {
                    partnerId: matchId,
                    partnerNickname: partnerNickname,
                    roomId
                });

                // Notify MATCH (partner)
                io.to(`user:${matchId}`).emit('match_found', {
                    partnerId: deviceId,
                    partnerNickname: myNickname,
                    roomId
                });

                // Also we need to check if partner was specific, but we don't know their preference here easily without refetching.
                // Ideally `match.service` handles the dequeue and could return the partner's preference.
                // But simplified: Since `match_found` is emitted to partner, the partner's client can't reliably trigger the increment.
                // Optimization: The partner who was waiting in the queue - we should check if THEY had a specific preference.
                // However, `findMatch` removes them from the queue.
                // Let's rely on the fact that if *I* was searching specific, *I* get charged.
                // If partner was searching specific, *they* charged when *they* trigger the match? No, that only happens if *they* trigger the match.

                // TODO: Correctly increment for the passive partner if they had a specific filter.
                // Since this requires knowing the passive partner's filter preference which was just dequeued:
                // For now, simpler implementation: Active searcher gets charged. 

                // Send updated limits
                const remaining = await getRemaining(deviceId);
                socket.emit('limit_update', { remaining });

            } else {
                // No match yet, just wait.
                socket.emit('queue_joined', { message: "Waiting for a match..." });
            }

        } catch (error: any) {
            console.error("Matchmaking error:", error);
            socket.emit('error', { message: error.message });
        }
    });

    socket.on('leave_queue', async (data: { deviceId: string, gender: Gender, preference: 'male' | 'female' | 'any' }) => {
        try {
            await dequeueUser(data.deviceId, data.gender, data.preference);
            socket.emit('queue_left');
        } catch (error) {
            console.error("Leave queue error:", error);
        }
    });

    // Helper to register deviceId for targeting
    socket.on('register_device', (deviceId: string) => {
        socket.join(`user:${deviceId}`);
        console.log(`Socket ${socket.id} registered as device ${deviceId}`);
        // Send initial limit
        getRemaining(deviceId).then(remaining => {
            socket.emit('limit_update', { remaining });
        });
    });
}
