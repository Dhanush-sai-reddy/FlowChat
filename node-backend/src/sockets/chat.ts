import { Server, Socket } from 'socket.io';

export default function handleChat(io: Server, socket: Socket) {

    // Join a specific chat room (assigned by matchmaking)
    socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
        // Notify others in room
        socket.to(roomId).emit('user_joined_room');
    });

    // Send a message
    socket.on('send_message', (data: { roomId: string, message: string, senderId: string }) => {
        // Relay to everyone in the room EXCEPT sender (or including, depending on frontend logic)
        // Using socket.to(room) sends to everyone EXCEPT sender.
        socket.to(data.roomId).emit('receive_message', {
            senderId: data.senderId,
            message: data.message,
            timestamp: Date.now()
        });
    });

    // Typing indicators
    socket.on('typing', (data: { roomId: string, isTyping: boolean }) => {
        socket.to(data.roomId).emit('platform_typing', { isTyping: data.isTyping });
    });

    // Leave room (or disconnect logic)
    socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user_left_room');
    });
}
