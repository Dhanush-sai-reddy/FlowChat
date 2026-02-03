import dotenv from 'dotenv';
dotenv.config();
import { connectRedis } from './config/redis';
import app from './app';
import http from 'http';
import { Server } from 'socket.io';
import initializeSockets from './sockets';

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectRedis();

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*", // Allow all origins for now (adjust for production)
      methods: ["GET", "POST"]
    }
  });

  // Initialize Socket Logic
  initializeSockets(io);

  server.listen(PORT, () => {
    console.log(`Server and Socket.io running on port ${PORT}`);
  });
}

startServer();