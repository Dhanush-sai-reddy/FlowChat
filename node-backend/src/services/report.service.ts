import redisClient from "../config/redis";
import ReportRecord from "../models/ReportRecord";
import blockedUsersFilter from "./bloomFilter";

// ─── Thresholds ───────────────────────────────────────────────────────────────

const TEMP_BAN_THRESHOLD = 10;              // reports in a 7-day Redis window → 24h temp ban
const PERMANENT_BLOCK_THRESHOLD = 35;       // lifetime cumulative reports → permanent block
const BAN_DURATION_SECONDS = 24 * 60 * 60;  // 24 hours
const REPORT_WINDOW_SECONDS = 7 * 24 * 60 * 60; // 7 days

// ─── Redis Key Helpers ────────────────────────────────────────────────────────

const getReportKey = (deviceId: string) => `reports:${deviceId}`;
const getBanKey = (deviceId: string) => `ban:${deviceId}`;
const getPermaBanKey = (deviceId: string) => `permaban:${deviceId}`;

// ─── Report Flow ──────────────────────────────────────────────────────────────

export const reportUser = async (targetDeviceId: string): Promise<void> => {
    // Step 0: If already permanently blocked, nothing to do
    if (await isPermanentlyBlocked(targetDeviceId)) {
        console.log(`[Report] User ${targetDeviceId} is already permanently blocked. Ignoring.`);
        return;
    }

    const reportKey = getReportKey(targetDeviceId);

    // Step 1: Increment Redis short-term report counter
    const windowCount = await redisClient.incr(reportKey);

    // Set 7-day expiry on first report in this window
    if (windowCount === 1) {
        await redisClient.expire(reportKey, REPORT_WINDOW_SECONDS);
    }

    console.log(`[Report] User ${targetDeviceId} now has ${windowCount} reports in current window.`);

    // Step 2: Check if temp ban threshold is reached
    if (windowCount >= TEMP_BAN_THRESHOLD) {
        await handleBanThreshold(targetDeviceId, windowCount);
    }
};

// ─── Ban Threshold Handler ────────────────────────────────────────────────────

async function handleBanThreshold(deviceId: string, windowCount: number): Promise<void> {
    // 1. Apply Redis temp ban (24h)
    await applyTempBan(deviceId);

    // 2. Persist to MongoDB — upsert lifetime record
    const record = await ReportRecord.findOneAndUpdate(
        { deviceId },
        {
            $inc: { totalLifetimeReports: windowCount },
            $push: {
                banEvents: {
                    reportCountInWindow: windowCount,
                    bannedAt: new Date(),
                    banType: "temporary",
                },
            },
        },
        { upsert: true, new: true }
    );

    console.log(
        `[Report] MongoDB updated for ${deviceId}: ` +
        `lifetime=${record.totalLifetimeReports}, bans=${record.banEvents.length}`
    );

    // 3. Check for permanent block
    if (record.totalLifetimeReports >= PERMANENT_BLOCK_THRESHOLD) {
        await applyPermanentBlock(deviceId, record);
    }

    // 4. Reset Redis window counter (window consumed)
    await redisClient.del(getReportKey(deviceId));
}

// ─── Temp Ban ─────────────────────────────────────────────────────────────────

async function applyTempBan(deviceId: string): Promise<void> {
    const banKey = getBanKey(deviceId);
    await redisClient.set(banKey, "banned", { EX: BAN_DURATION_SECONDS });
    console.log(`[Ban] User ${deviceId} has been temp-banned for 24 hours.`);
}

// ─── Permanent Block ──────────────────────────────────────────────────────────

async function applyPermanentBlock(deviceId: string, record: any): Promise<void> {
    // Mark permanent in Mongo
    record.isPermanentlyBlocked = true;

    // Update last ban event to be permanent
    const lastEvent = record.banEvents[record.banEvents.length - 1];
    if (lastEvent) {
        lastEvent.banType = "permanent";
    }

    await record.save();

    // Add to Bloom filter (in-memory)
    blockedUsersFilter.add(deviceId);

    // Set permanent Redis key (no TTL — survives until manual deletion)
    await redisClient.set(getPermaBanKey(deviceId), "permanent");

    console.log(
        `[PERMANENT BLOCK] User ${deviceId} permanently blocked. ` +
        `Lifetime reports: ${record.totalLifetimeReports}`
    );
}

// ─── Ban Check Functions ──────────────────────────────────────────────────────

/**
 * Fast permanent block check:
 * 1. Bloom filter (O(1), in-memory) — if negative, definitely not blocked
 * 2. On positive hit, confirm against Redis permanent key
 * 3. On Redis miss (shouldn't happen), confirm against Mongo
 */
export const isPermanentlyBlocked = async (deviceId: string): Promise<boolean> => {
    // Fast path: Bloom filter says no → definitely not blocked
    if (!blockedUsersFilter.mightContain(deviceId)) {
        return false;
    }

    // Bloom says maybe → confirm with Redis (fast) then Mongo (authoritative)
    const redisResult = await redisClient.get(getPermaBanKey(deviceId));
    if (redisResult === "permanent") {
        return true;
    }

    // Redis key might be missing (e.g., Redis restart) → check Mongo
    const record = await ReportRecord.findOne(
        { deviceId, isPermanentlyBlocked: true },
        { _id: 1 }
    ).lean();

    if (record) {
        // Re-set Redis key since it was missing
        await redisClient.set(getPermaBanKey(deviceId), "permanent");
        return true;
    }

    // Bloom filter false positive
    return false;
};

/**
 * Combined ban check — permanent first (fast), then temp ban.
 */
export const isBanned = async (deviceId: string): Promise<{
    banned: boolean;
    type: "permanent" | "temporary" | null;
}> => {
    // Check permanent block first (Bloom filter → fast)
    if (await isPermanentlyBlocked(deviceId)) {
        return { banned: true, type: "permanent" };
    }

    // Check Redis temp ban
    const banKey = getBanKey(deviceId);
    const result = await redisClient.get(banKey);
    if (result === "banned") {
        return { banned: true, type: "temporary" };
    }

    return { banned: false, type: null };
};

// ─── Utility Exports ──────────────────────────────────────────────────────────

export const getReportCount = async (deviceId: string): Promise<number> => {
    const reportKey = getReportKey(deviceId);
    const count = await redisClient.get(reportKey);
    return count ? parseInt(count, 10) : 0;
};
