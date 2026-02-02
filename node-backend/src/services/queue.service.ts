import redisClient from "../config/redis";
//import genlimits from "../utils/constant";
export type Gender = "male" | "female" | "other";


function queueKey(gender: Gender) {
  return `queue:${gender}`;
}

export async function isUserQueued(
  deviceId: string,
  gender: Gender
): Promise<boolean> {
  const key = queueKey(gender);
  const score = await redisClient.zScore(key, deviceId);
  return score !== null;
}


export async function enqueueUser(
  deviceId: string,
  gender: Gender
) {
  const key = queueKey(gender);
  const timestamp = Date.now();

  // ZADD: add deviceId with timestamp score

  if (await isUserQueued(deviceId, gender)) {
    throw new Error("User already in the queue");
  }
  await redisClient.zAdd(key, {
    score: timestamp,
    value: deviceId,
  });
}

export async function dequeueUser(
  deviceId: string,
  gender: Gender
) {
  const key = queueKey(gender);
  await redisClient.zRem(key, deviceId);
}

export async function getQueuedUsers(
  gender: Gender,
  limit = 20
): Promise<string[]> {
  const key = queueKey(gender);

  return await redisClient.zRange(key, 0, limit - 1);
}


