import React, { useState } from 'react';
import { AppView, UserProfile } from './types';
import { getStableDeviceId } from './services/deviceService';
import { verifyGender } from './services/verificationService';
import Button from './components/Button';

import Onboarding from './views/Onboarding';
import CameraView from './components/CameraView';
import ProfileSetup from './views/ProfileSetup';
import { QueueView } from './components/QueueView';
import { ChatView } from './components/ChatView';
import CooldownView from './views/CooldownView';
import { MATCH_COOLDOWN_MS } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Real Socket States
  const [matchData, setMatchData] = useState<{ partnerId: string, partnerNickname: string, roomId: string } | null>(null);
  const [shouldAutoQueue, setShouldAutoQueue] = useState(false);
  const [lastExitTime, setLastExitTime] = useState(0);

  const handleCapture = async (base64: string) => {
    setIsProcessing(true);
    setVerificationError('');

    try {
      const [result, deviceId] = await Promise.all([
        verifyGender(base64),
        getStableDeviceId()
      ]);

      setIsProcessing(false);

      if (result.isVerified && result.detectedGender) {
        setUserProfile({
          nickname: '',
          bio: '',
          verifiedGender: result.detectedGender,
          deviceId: deviceId
        });
        setView(AppView.PROFILE_SETUP);
      } else {
        setVerificationError(result.error || "Could not verify gender clearly. Please try better lighting.");
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setVerificationError("An error occurred. Please try again.");
    }
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setView(AppView.MATCHING);
  };

  const handleMatchFound = (data: { partnerId: string, partnerNickname: string, roomId: string }) => {
    setMatchData(data);
    setView(AppView.CHAT);
  };

  if (view === AppView.LANDING) {
    return <Onboarding onStart={() => setView(AppView.VERIFICATION)} />;
  }

  if (view === AppView.VERIFICATION) {
    return (
      <div className="h-screen overflow-hidden flex flex-col justify-center bg-slate-900 p-4">
        {verificationError && (
          <div className="max-w-md mx-auto mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
            {verificationError}
          </div>
        )}
        <CameraView onCapture={handleCapture} isProcessing={isProcessing} />
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={() => setView(AppView.LANDING)}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (view === AppView.PROFILE_SETUP && userProfile) {
    return (
      <div className="min-h-screen bg-slate-900">
        <ProfileSetup
          detectedGender={userProfile.verifiedGender!}
          deviceId={userProfile.deviceId}
          onComplete={handleProfileComplete}
        />
      </div>
    );
  }

  if (view === AppView.MATCHING && userProfile) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <QueueView
          gender={userProfile.verifiedGender!.toLowerCase() as 'male' | 'female' | 'other'}
          nickname={userProfile.nickname}
          onMatchFound={handleMatchFound}
          onCancel={() => setView(AppView.PROFILE_SETUP)}
          autoStart={shouldAutoQueue}
        />
      </div>
    );
  }

  if (view === AppView.CHAT && matchData) {
    return (
      <div className="h-screen w-full max-w-2xl mx-auto bg-slate-900 shadow-2xl overflow-hidden relative">
        <ChatView
          roomId={matchData.roomId}
          partnerId={matchData.partnerId}
          partnerNickname={matchData.partnerNickname}
          partnerGender="Unknown"
          partnerBio="Just exploring Klymo."
          onNext={() => {
            setMatchData(null);
            const now = Date.now();
            const timeSinceLastExit = now - lastExitTime;
            setLastExitTime(now);

            if (lastExitTime > 0 && timeSinceLastExit < MATCH_COOLDOWN_MS) {
              setView(AppView.COOLDOWN);
            } else {
              setShouldAutoQueue(true);
              setView(AppView.MATCHING);
            }
          }}
        />
      </div>
    );
  }

  if (view === AppView.COOLDOWN) {
    return (
      <CooldownView
        onComplete={() => {
          setShouldAutoQueue(true);
          setView(AppView.MATCHING);
        }}
        startTime={lastExitTime}
      />
    );
  }

  return <div>Error: Unknown State</div>;
};

export default App;