import * as faceapi from 'face-api.js';

let modelsLoaded = false;

// Load face-api.js models from public/models
export const loadFaceApiModels = async (): Promise<void> => {
    if (modelsLoaded) return;

    const MODEL_URL = '/models';

    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        console.log('Face-API.js models loaded successfully');
    } catch (error) {
        console.error('Failed to load Face-API.js models:', error);
        throw error;
    }
};

export interface FaceDetectionResult {
    detected: boolean;
    gender: 'male' | 'female' | null;
    genderProbability: number;
    age: number | null;
}

// Detect gender from video element
export const detectGenderFromVideo = async (
    videoElement: HTMLVideoElement
): Promise<FaceDetectionResult> => {
    try {
        // Ensure models are loaded
        await loadFaceApiModels();

        // Detect face with age and gender
        const detection = await faceapi
            .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
            .withAgeAndGender();

        if (!detection) {
            return {
                detected: false,
                gender: null,
                genderProbability: 0,
                age: null
            };
        }

        return {
            detected: true,
            gender: detection.gender,
            genderProbability: detection.genderProbability,
            age: Math.round(detection.age)
        };

    } catch (error) {
        console.error('Face detection error:', error);
        return {
            detected: false,
            gender: null,
            genderProbability: 0,
            age: null
        };
    }
};

// Detect gender from canvas/image
export const detectGenderFromImage = async (
    imageElement: HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetectionResult> => {
    try {
        await loadFaceApiModels();

        const detection = await faceapi
            .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
            .withAgeAndGender();

        if (!detection) {
            return {
                detected: false,
                gender: null,
                genderProbability: 0,
                age: null
            };
        }

        return {
            detected: true,
            gender: detection.gender,
            genderProbability: detection.genderProbability,
            age: Math.round(detection.age)
        };

    } catch (error) {
        console.error('Face detection error:', error);
        return {
            detected: false,
            gender: null,
            genderProbability: 0,
            age: null
        };
    }
};
