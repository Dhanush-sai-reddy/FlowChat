import redisClient from "../config/redis";
//import genlimits from "../utils/constant";
export type Gender = "male" | "female" | "other";
export type Preference = "male" | "female" | "other" | "any";

function queueKey(gender: Gender, preference: Preference) {
  return `queue:${gender}:${preference}`;
}

export async function isUserQueued(
  deviceId: string,
  gender: Gender,
  preference: Preference
): Promise<boolean> {
  const key = queueKey(gender, preference);
  const score = await redisClient.zScore(key, deviceId);
  return score !== null;
}


import { getReportCount } from "./report.service";

export async function enqueueUser(
  deviceId: string,
  gender: Gender,
  preference: Preference
) {
  const key = queueKey(gender, preference);

  // Karma Logic:
  // Base Score = Timestamp (FIFO)
  // Penalty = Report Count * 1 Minute (60000ms)
  // Higher Score = Later in queue (De-prioritized)
  const reportCount = await getReportCount(deviceId);
  const penalty = reportCount * 60000;
  const score = Date.now() + penalty;

  if (await isUserQueued(deviceId, gender, preference)) {
    throw new Error("User already in the queue");
  }
  await redisClient.zAdd(key, {
    score: score,
    value: deviceId,
  });
}

export async function dequeueUser(
  deviceId: string,
  gender: Gender,
  preference: Preference
) {
  const key = queueKey(gender, preference);
  await redisClient.zRem(key, deviceId);
}

// Metadata handling
export async function setUserNickname(deviceId: string, nickname: string) {
  await redisClient.set(`user:nickname:${deviceId}`, nickname, { EX: 3600 }); // Expire in 1 hour
}

export async function getUserNickname(deviceId: string): Promise<string | null> {
  return await redisClient.get(`user:nickname:${deviceId}`);
}

export async function getQueuedUsers(
  gender: Gender,
  preference: Preference,
  limit = 20
): Promise<string[]> {
  const key = queueKey(gender, preference);
  return await redisClient.zRange(key, 0, limit - 1);
}


