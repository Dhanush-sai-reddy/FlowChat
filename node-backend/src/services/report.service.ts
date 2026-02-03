import redisClient from "../config/redis";

const BAN_THRESHOLD = 10;
const BAN_DURATION_SECONDS = 24 * 60 * 60; // 24 hours

const getReportKey = (deviceId: string) => `reports:${deviceId}`;
const getBanKey = (deviceId: string) => `ban:${deviceId}`;

export const reportUser = async (targetDeviceId: string): Promise<void> => {
    const reportKey = getReportKey(targetDeviceId);

    // Increment report count
    const count = await redisClient.incr(reportKey);

    // Set expiry for report count (e.g., reports expire after 7 days if not banned?)
    // Or just keep them rolling. Let's set a long expiry like 7 days so old reports decay.
    if (count === 1) {
        await redisClient.expire(reportKey, 7 * 24 * 60 * 60);
    }

    console.log(`[Report] User ${targetDeviceId} now has ${count} reports.`);

    // Check for ban
    if (count >= BAN_THRESHOLD) {
        await banUser(targetDeviceId);
    }
};

export const banUser = async (deviceId: string): Promise<void> => {
    const banKey = getBanKey(deviceId);
    await redisClient.set(banKey, 'banned', { EX: BAN_DURATION_SECONDS });
    console.log(`[Ban] User ${deviceId} has been BANNED for 24 hours.`);
};

export const isBanned = async (deviceId: string): Promise<boolean> => {
    const banKey = getBanKey(deviceId);
    const result = await redisClient.get(banKey);
    return result === 'banned';
};

export const getReportCount = async (deviceId: string): Promise<number> => {
    const reportKey = getReportKey(deviceId);
    const count = await redisClient.get(reportKey);
    return count ? parseInt(count, 10) : 0;
};
