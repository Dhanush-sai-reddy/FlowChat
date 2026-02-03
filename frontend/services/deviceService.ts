import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { DAILY_MATCH_LIMIT } from "../constants";

// DEBUG MODE: Set to true to generate random IDs per session (for testing with multiple tabs)
const DEBUG_MODE = true;

const DAILY_SPECIFIC_USAGE_KEY = 'klymo_daily_specific_usage';
const FALLBACK_ID_KEY = 'klymo_fallback_id';
const SESSION_ID_KEY = 'klymo_session_id';

// Initialize the agent at application startup
const fpPromise = FingerprintJS.load();

export const getStableDeviceId = async (): Promise<string> => {
  // Debug mode: Use session-based random ID for testing
  if (DEBUG_MODE) {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      console.log("[DEBUG] Generated new session ID:", sessionId);
    }
    return sessionId;
  }

  try {
    const fp = await fpPromise;
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.warn("FingerprintJS failed, falling back to UUID", error);

    // Fallback logic for adblockers or errors
    let id = localStorage.getItem(FALLBACK_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(FALLBACK_ID_KEY, id);
    }
    return id;
  }
};

interface UsageRecord {
  date: string;
  count: number;
}

const getSpecificUsage = (): UsageRecord => {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(DAILY_SPECIFIC_USAGE_KEY);

  if (stored) {
    const usage: UsageRecord = JSON.parse(stored);
    if (usage.date === today) {
      return usage;
    }
  }

  // Reset or new
  return { date: today, count: 0 };
};

export const checkSpecificLimit = (): boolean => {
  const usage = getSpecificUsage();
  return usage.count < DAILY_MATCH_LIMIT;
};

export const incrementSpecificUsage = () => {
  const usage = getSpecificUsage();
  usage.count += 1;
  localStorage.setItem(DAILY_SPECIFIC_USAGE_KEY, JSON.stringify(usage));
};

export const getRemainingSpecificMatches = (): number => {
  const usage = getSpecificUsage();
  return Math.max(0, DAILY_MATCH_LIMIT - usage.count);
};