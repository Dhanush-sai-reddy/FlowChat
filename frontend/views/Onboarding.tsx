import React from 'react';
import Button from '../components/Button';
import { Icons } from '../constants';

interface OnboardingProps {
  onStart: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
      <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-teal-500/20 transform rotate-3">
        <Icons.ShieldCheck />
      </div>
      
      <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
        Klymo
      </h1>
      
      <p className="text-xl text-slate-400 mb-12 max-w-md">
        Controlled Anonymity. Real Conversations. <br/>
        <span className="text-teal-400 text-sm font-semibold uppercase tracking-wider mt-2 block">
          AI Verified • No Signups • Ephemeral
        </span>
      </p>
      
      <div className="grid gap-4 w-full max-w-xs">
        <Button onClick={onStart} className="w-full justify-between group">
          <span>Start Anonymous Chat</span>
          <span className="group-hover:translate-x-1 transition-transform">
             <Icons.ArrowRight />
          </span>
        </Button>
      </div>

      <p className="mt-8 text-xs text-slate-600 max-w-xs">
        By continuing, you agree to our usage policy. Abuse is prevented via device fingerprinting.
      </p>
    </div>
  );
};

export default Onboarding;