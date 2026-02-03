import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3000';
let socket: Socket | null = null;

export const connectSocket = (deviceId: string) => {
    if (socket && socket.connected) return socket;

    socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log('Connected to backend socket:', socket?.id);
        if (deviceId) {
            socket?.emit('register_device', deviceId);
        }
    });

    return socket;
};

export const getSocket = () => socket;

export const joinQueue = (deviceId: string, gender: 'male' | 'female' | 'other', preference: 'male' | 'female' | 'any', nickname: string) => {
    if (!socket) throw new Error("Socket not initialized");
    socket.emit('join_queue', { deviceId, gender, preference, nickname });
};

export const leaveQueue = (deviceId: string, gender: string, preference: string) => {
    if (!socket) return;
    socket.emit('leave_queue', { deviceId, gender, preference });
};

export const sendMessage = (roomId: string, message: string, senderId: string) => {
    if (!socket) return;
    socket.emit('send_message', { roomId, message, senderId });
};

export const joinRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('join_room', roomId);
};

export const reportUser = (targetId: string, reporterId: string) => {
    if (!socket) return;
    socket.emit('report_user', { targetId, reporterId });
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
