export enum AppView {
  LANDING = 'LANDING',
  VERIFICATION = 'VERIFICATION',
  PROFILE_SETUP = 'PROFILE_SETUP',
  MATCHING = 'MATCHING',
  CHAT = 'CHAT',
  LIMIT_REACHED = 'LIMIT_REACHED',
  COOLDOWN = 'COOLDOWN'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other', // Fallback for UI, though verification targets binary as per PDF
  UNKNOWN = 'Unknown'
}

export interface UserProfile {
  nickname: string;
  bio: string;
  verifiedGender?: Gender;
  deviceId: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'stranger' | 'system';
  text: string;
  timestamp: number;
}

export interface VerificationResult {
  isVerified: boolean;
  detectedGender: Gender | null;
  confidence: number;
  error?: string;
}

export type FilterOption = 'Any' | 'Male' | 'Female';