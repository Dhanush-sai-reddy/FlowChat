import { Server, Socket } from 'socket.io';
import handleMatchmaking from './matchmaking';
import handleChat from './chat';

export default function initializeSockets(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log(`User connected: ${socket.id}`);

        // Attach modules
        handleMatchmaking(io, socket);
        handleChat(io, socket);

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`);
            // Cleanup logic is handled per module if needed
        });
    });
}
