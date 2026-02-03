import { Server, Socket } from 'socket.io';
import { enqueueUser, dequeueUser, Gender, setUserNickname, getUserNickname } from '../services/queue.service';
import { findMatch } from '../services/match.service';


interface MatchRequest {
    deviceId: string;
    gender: Gender;
    preference: 'male' | 'female' | 'any';
    nickname: string;
}

export default function handleMatchmaking(io: Server, socket: Socket) {

    socket.on('join_queue', async (data: MatchRequest) => {
        try {
            const { deviceId, gender, preference, nickname } = data;

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
    });
}
