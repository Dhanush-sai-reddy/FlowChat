import React, { useState, useMemo } from 'react';
import Button from '../components/Button';
import { UserProfile, Gender } from '../types';

interface ProfileSetupProps {
  detectedGender: Gender;
  deviceId: string;
  onComplete: (profile: UserProfile) => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ detectedGender, deviceId, onComplete }) => {
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');

  // Deterministic hash generation
  // We keep this logic to ensure unique identification in the backend/system
  // based on the combination of Nickname + DeviceID.
  const discriminator = useMemo(() => {
    const cleanName = nickname.trim() || 'User';
    const input = `${cleanName}:${deviceId}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return (Math.abs(hash) % 9000) + 1000;
  }, [nickname, deviceId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('Nickname is required');
      return;
    }

    // The tag is appended here for system use, but will be hidden in UI
    const fullIdentity = `${nickname.trim()}#${discriminator}`;

    onComplete({
      nickname: fullIdentity,
      bio: bio.trim(),
      verifiedGender: detectedGender,
      deviceId
    });
  };

  return (
    <div className="w-full max-w-md mx-auto pt-10 px-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Profile Setup</h2>
        <p className="text-slate-400">
          Set a temporary identity. This is all people will see.
        </p>
      </div>

      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 backdrop-blur-sm mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400">
             {/* Icon placeholder for Verified status */}
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          </div>
          <div>
            <p className="text-sm text-slate-400">Verified as</p>
            <p className="text-lg font-semibold text-white">{detectedGender}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Nickname</label>
          <div className="relative">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder-slate-600"
              placeholder="e.g. NeonTraveler"
              maxLength={15}
            />
          </div>
          {/* Tag display removed for cleaner UI as requested */}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Short Bio (Optional)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder-slate-600 resize-none h-24"
            placeholder="Just here to chat about sci-fi..."
            maxLength={60}
          />
          <div className="text-right text-xs text-slate-500 mt-1">{bio.length}/60</div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button type="submit" className="w-full">
          Enter Queue
        </Button>
      </form>
    </div>
  );
};

export default ProfileSetup;