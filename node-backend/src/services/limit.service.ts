import redisClient from "../config/redis";

const DAILY_LIMIT = 5;

const getLimitKey = (deviceId: string) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `limit:${deviceId}:${today}`;
};

export const checkLimit = async (deviceId: string): Promise<boolean> => {
    const key = getLimitKey(deviceId);
    const countStr = await redisClient.get(key);
    const count = countStr ? parseInt(countStr) : 0;
    return count < DAILY_LIMIT; // Returns true if user is under limit
};

export const incrementLimit = async (deviceId: string): Promise<number> => {
    const key = getLimitKey(deviceId);
    const count = await redisClient.incr(key);

    // Set expiry to 24 hours (86400 seconds) if it's a new key
    if (count === 1) {
        await redisClient.expire(key, 86400);
    }

    return count;
};

export const getRemaining = async (deviceId: string): Promise<number> => {
    const key = getLimitKey(deviceId);
    const countStr = await redisClient.get(key);
    const count = countStr ? parseInt(countStr) : 0;
    return Math.max(0, DAILY_LIMIT - count);
};
