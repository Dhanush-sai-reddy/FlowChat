import { dequeueUser, Gender, Preference, getQueuedUsers } from "./queue.service";
import redisClient from "../config/redis";

interface MatchRequest {
    deviceId: string;
    gender: Gender;
    preference: Preference;
}

async function getCandidates(
    gender: Gender,
    preference: Preference,
    limit = 85
): Promise<string[]> {
    const key = await getQueuedUsers(gender, preference, limit);
    return key;
}

export async function findMatch(
    requester: MatchRequest
): Promise<string | null> {
    const { deviceId, gender, preference } = requester;

    // Logic: 
    // I am [Gender] looking for [Preference].
    // I need to look in queues of:
    // 1. [Preference] looking for [Gender]
    // 2. [Preference] looking for "any"

    let targetGenders: Gender[] = [];

    if (preference !== "any") {
        targetGenders = [preference];
    } else {
        targetGenders = ["male", "female", "other"];
    }

    for (const targetGender of targetGenders) {
        // Check both specific intent and "any" intent queues of the target gender
        const targetPreferences: Preference[] = [gender, "any"];

        for (const targetPref of targetPreferences) {
            const candidates = await getCandidates(targetGender, targetPref);

            for (const candidateId of candidates) {
                if (candidateId === deviceId) continue;

                // FOUND MUTUAL MATCH
                // I want them (targetGender), they want me (targetPref which is my gender or 'any')

                // Remove both from their respective queues
                await dequeueUser(deviceId, gender, preference);
                await dequeueUser(candidateId, targetGender, targetPref);

                return candidateId;
            }
        }
    }

    // No match found
    return null;
}

