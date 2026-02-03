import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import Button from './Button';
import { Icons } from '../constants';

interface CameraViewProps {
  onCapture: (base64Image: string) => void;
  isProcessing: boolean;
}

export interface CameraViewRef {
  getVideoElement: () => HTMLVideoElement | null;
}

const CameraView = forwardRef<CameraViewRef, CameraViewProps>(({ onCapture, isProcessing }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const streamRef = useRef<MediaStream | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
      setIsStreamReady(false);
    }
  };

  const startCamera = async () => {
    if (isInitializing) return;
    setIsInitializing(true);
    stopCamera();
    // Do not clear error immediately to avoid flashing "Initializing" text
    // setError(''); 
    setIsStreamReady(false);

    try {
      console.log("Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      console.log("Camera access granted");
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsStreamReady(true);
      setError(''); // Clear error only on success
    } catch (err: any) {
      console.error("Camera Error:", err);
      // Even if blocked, we want to allow them to try again, but we must show the error.
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera access is blocked by your browser. Please click the lock icon in your address bar, Allow Camera, and then click Retry.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is in use by another app. Please close it and try again.');
      } else {
        setError('Camera error. Click retry to ask for permission again.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useImperativeHandle(ref, () => ({
    getVideoElement: () => videoRef.current
  }));

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      if (context) {
        const size = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;

        context.drawImage(video, startX, startY, size, size, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];

        onCapture(base64);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="relative w-full aspect-square bg-slate-800 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl mb-6 group">
        {!isStreamReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500">
            Initializing Camera...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-red-400 bg-slate-900/95 z-30">
            <p className="mb-6 text-sm">{error}</p>
            <Button variant="secondary" onClick={startCamera} isLoading={isInitializing}>Retry Camera</Button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
        />

        {!error && isStreamReady && (
          <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-teal-500/30 rounded-full m-12 opacity-50"></div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
            <div className="text-white font-semibold">Verifying...</div>
          </div>
        )}
      </div>

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Verify it's you</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Center your face. The image is processed by AI and deleted immediately.
        </p>
      </div>

      <Button
        onClick={handleCapture}
        isLoading={isProcessing}
        className="w-full max-w-xs"
        disabled={!!error || !isStreamReady}
      >
        <Icons.Camera />
        Take Selfie & Verify
      </Button>
    </div>
  );
});

export default CameraView;