import React, { useEffect, useState } from 'react';
import { Icons, MATCH_COOLDOWN_MS } from '../constants';

interface CooldownViewProps {
  onComplete: () => void;
  startTime: number;
}

const CooldownView: React.FC<CooldownViewProps> = ({ onComplete, startTime }) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, MATCH_COOLDOWN_MS - elapsed);
      setRemaining(left);

      if (left <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, onComplete]);

  // Calculate progress percentage for a visual bar (inverse)
  const progress = Math.min(100, ((MATCH_COOLDOWN_MS - remaining) / MATCH_COOLDOWN_MS) * 100);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-6 text-center">
      <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 text-orange-400 animate-pulse">
        <Icons.Clock />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2">Slow down, traveler</h2>
      <p className="text-slate-400 mb-8 max-w-xs">
        To prevent spam, we enforce a short cooldown between rapid matches.
      </p>

      <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-orange-500 transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-sm font-mono text-slate-500">
        Resuming in {(remaining / 1000).toFixed(1)}s...
      </p>
    </div>
  );
};

export default CooldownView;