import React, { useState, useEffect } from 'react';
import { AppView, UserProfile, Gender, FilterOption } from './types';
import { getStableDeviceId, checkSpecificLimit, incrementSpecificUsage, getRemainingSpecificMatches } from './services/deviceService';
import { verifyGender } from './services/verificationService';
import { APP_NAME, MATCH_COOLDOWN_MS } from './constants';
import Button from './components/Button';

import Onboarding from './views/Onboarding';
import CameraView from './components/CameraView';
import ProfileSetup from './views/ProfileSetup';
import ChatView from './views/ChatView';
import CooldownView from './views/CooldownView';

import { Icons } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [matchFilter, setMatchFilter] = useState<FilterOption>('Any');
  const [queueTime, setQueueTime] = useState(0);

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
    enterMatchingQueue();
  };

  const enterMatchingQueue = () => {
    const timeSinceLastExit = Date.now() - lastExitTime;
    if (lastExitTime > 0 && timeSinceLastExit < MATCH_COOLDOWN_MS) {
      setView(AppView.COOLDOWN);
      return;
    }

    if (matchFilter !== 'Any' && !checkSpecificLimit()) {
      setMatchFilter('Any');
    }
    setView(AppView.MATCHING);
  };

  const handleChatExit = (shouldNext: boolean) => {
    setLastExitTime(Date.now());
    if (shouldNext) {
      enterMatchingQueue();
    } else {
      setView(AppView.PROFILE_SETUP);
    }
  };

  useEffect(() => {
    let interval: number | undefined;
    if (view === AppView.MATCHING) {
      setQueueTime(0);
      interval = window.setInterval(() => {
        setQueueTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view]);

  useEffect(() => {
    if (view === AppView.MATCHING) {
      const minWaitTime = matchFilter === 'Any' ? 2 : 5;
      const matchProbability = matchFilter === 'Any' ? 0.8 : 0.3;

      if (queueTime > minWaitTime) {
        if (Math.random() > (1 - matchProbability)) {
          if (matchFilter !== 'Any') {
            incrementSpecificUsage();
          }
          setView(AppView.CHAT);
        }
      }
    }
  }, [queueTime, view, matchFilter]);

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

  if (view === AppView.COOLDOWN) {
    return <CooldownView onComplete={() => setView(AppView.MATCHING)} startTime={lastExitTime} />;
  }

  if (view === AppView.MATCHING) {
    const remainingSpecific = getRemainingSpecificMatches();
    const isSpecificLimitReached = remainingSpecific <= 0;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-teal-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Icons.Sparkles />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Finding a match...</h2>
        <p className="text-slate-400 mb-8">
          Looking for <span className="text-teal-400 font-semibold">{matchFilter}</span> matches
        </p>

        <div className="flex gap-2 mb-4 justify-center">
          {(['Any', 'Male', 'Female'] as FilterOption[]).map(opt => {
            const isSpecific = opt !== 'Any';
            const isDisabled = isSpecific && isSpecificLimitReached;

            return (
              <button
                key={opt}
                onClick={() => {
                  if (!isDisabled) {
                    setMatchFilter(opt);
                    setQueueTime(0); // Reset time when changing filter
                  }
                }}
                disabled={isDisabled}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${matchFilter === opt
                  ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                  : isDisabled
                    ? 'bg-slate-800/50 text-slate-600 cursor-not-allowed border border-slate-800'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                  }`}
              >
                {opt} {isSpecific && isDisabled && "🔒"}
              </button>
            );
          })}
        </div>

        <div className="h-6 mb-8">
          {isSpecificLimitReached ? (
            <p className="text-xs text-red-400">
              Daily specific filter limit reached. Using "Any" is unlimited.
            </p>
          ) : matchFilter === 'Any' ? (
            <p className="text-xs text-slate-500">
              Using "Any" is unlimited and won't use your specific matches.
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Specific filter matches remaining: <span className="text-slate-300">{remainingSpecific}</span>
            </p>
          )}
        </div>

        <p className="text-xs text-slate-600">Time elapsed: {queueTime}s</p>
        <div className="mt-8">
          <Button variant="secondary" onClick={() => setView(AppView.PROFILE_SETUP)}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (view === AppView.CHAT && userProfile) {
    // Generate a stranger identity
    const strangerDiscriminator = Math.floor(1000 + Math.random() * 9000);
    const strangerName = "AnonUser#" + strangerDiscriminator;

    return (
      <div className="h-screen w-full max-w-2xl mx-auto bg-slate-900 shadow-2xl overflow-hidden relative">
        <ChatView
          partnerProfile={{
            nickname: strangerName,
            bio: "Just exploring Klymo.",
            gender: matchFilter === 'Any' ? 'Unknown' : matchFilter
          }}
          onLeave={() => handleChatExit(false)}
          onNext={() => handleChatExit(true)}
        />
      </div>
    );
  }

  // Fallback state
  if (view === AppView.LIMIT_REACHED) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
        <div className="bg-slate-800 p-8 rounded-2xl max-w-sm border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Daily Limit Reached</h2>
          <p className="text-slate-400 mb-6">
            You have used your specific filter matches for today. You can still use the "Any" filter.
          </p>
          <Button onClick={() => enterMatchingQueue()}>Return to Matching</Button>
        </div>
      </div>
    )
  }

  return <div>Error: Unknown State</div>;
};

export default App;