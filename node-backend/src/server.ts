import dotenv from 'dotenv';
dotenv.config();
import { connectRedis } from './config/redis';
import app from './app';
const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();