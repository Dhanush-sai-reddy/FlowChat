import { dequeueUser, Gender , getQueuedUsers} from "./queue.service";
import redisClient from "../config/redis";
type Preference = "male" | "female" | "other" | "any";

interface MatchRequest {
deviceId: string;
gender: Gender;
preference: Preference;
}

async function getCandidates(
gender: Gender,
limit = 85
): Promise<string[]> {
const key =await getQueuedUsers(gender);
return key;
}

export async function findMatch(
requester: MatchRequest
): Promise<string | null> {
const { deviceId, gender, preference } = requester;

// 1. Determine which genders we are allowed to match with
let preferredGenders: Gender[] = [];

if (preference !== "any") {
    preferredGenders = [preference];
} else {
    // "any" is fallback only
    preferredGenders = ["male", "female", "other"];
}

// 2. Try explicit preference first
for (const targetGender of preferredGenders) {
    const candidates = await getCandidates(targetGender);

    for (const candidateId of candidates) {
    if (candidateId === deviceId) continue;

    // Found a match
    await dequeueUser(deviceId, gender);
    await dequeueUser(candidateId, targetGender);

    return candidateId;
    }
}

// 3. No match found
return null;
}

