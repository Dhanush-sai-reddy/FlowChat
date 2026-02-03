import { VerificationResult, Gender } from "../types";
import { getStableDeviceId } from "./deviceService";
import { detectGenderFromVideo, loadFaceApiModels } from "./faceApiService";

loadFaceApiModels().catch(console.error);

const base64ToBlob = (base64: string, mimeType = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const verifyGenderClientSide = async (videoElement: HTMLVideoElement): Promise<VerificationResult> => {
  try {
    const result = await detectGenderFromVideo(videoElement);

    if (!result.detected) {
      return {
        isVerified: false,
        detectedGender: null,
        confidence: 0,
        error: "No face detected. Please center your face and try again."
      };
    }

    const detectedGender = result.gender === 'female' ? Gender.FEMALE :
      result.gender === 'male' ? Gender.MALE : null;

    return {
      isVerified: result.genderProbability > 0.6,
      detectedGender: detectedGender,
      confidence: result.genderProbability,
      error: undefined
    };

  } catch (error) {
    console.error("Client-side verification error:", error);
    return {
      isVerified: false,
      detectedGender: null,
      confidence: 0,
      error: "Face detection failed. Please try again."
    };
  }
};

const verifyGender = async (imageBase64: string, videoElement?: HTMLVideoElement): Promise<VerificationResult> => {
  try {
    const blob = base64ToBlob(imageBase64);
    const formData = new FormData();
    formData.append('image', blob, 'capture.jpg');

    const deviceId = await getStableDeviceId();
    const API_URL = 'http://localhost:3000/api/verify';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'device-id': deviceId
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Backend verification failed');
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn("Backend verification timed out (>5s), switching to local.");
        throw new Error("Timeout"); // Triggers catch block below
      }
      throw err;
    }



  } catch (error) {
    console.warn("Backend verification failed, using client-side face-api.js:", error);

    try {
      // Fallback to client-side detection
      const { detectGenderFromImage } = await import("./faceApiService");

      // Create image element from base64
      const img = new Image();
      const imageLoadPromise = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });

      // Handle data URL prefix if missing
      img.src = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      await imageLoadPromise;
      const result = await detectGenderFromImage(img);

      if (!result.detected) {
        return {
          isVerified: false,
          detectedGender: null,
          confidence: 0,
          error: "Backend down & Face not detected locally."
        };
      }

      const detectedGender = result.gender === 'female' ? Gender.FEMALE :
        result.gender === 'male' ? Gender.MALE : null;

      return {
        isVerified: result.genderProbability > 0.6,
        detectedGender: detectedGender,
        confidence: result.genderProbability,
        error: undefined
      };

    } catch (fallbackError) {
      console.error("Fallback verification failed:", fallbackError);

      let backendStatus = "Backend error";
      if (error instanceof Error) {
        if (error.message === "Timeout") backendStatus = "Server timed out";
        else if (error.message === "Backend verification failed") backendStatus = "Server unavailable";
      }

      console.warn(`Technical Error: ${backendStatus} & Local Fallback Failed.`);

      return {
        isVerified: false,
        detectedGender: null,
        confidence: 0,
        error: "Verification unable to confirm. Please ensure your face is clearly visible."
      };
    }
  }
};

export { verifyGender, verifyGenderClientSide };