import FingerprintJS from '@fingerprintjs/fingerprintjs';

// DEBUG MODE: Set to true to generate random IDs per session (for testing with multiple tabs)
const DEBUG_MODE = true;

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