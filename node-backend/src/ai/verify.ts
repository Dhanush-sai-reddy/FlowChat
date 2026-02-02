
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

// Define the response type from FastAPI
interface VerificationResult {
    isVerified: boolean;
    detectedGender: string;
    confidence: number;
}

export async function verifyImage(filePath: string): Promise<VerificationResult> {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        console.log(`Verifying image: ${filePath}`);

        // Prepare form data
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));

        // Call FastAPI Service
        // TODO: Move URL to env variable (verified in implementation plan)
        const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

        try {
            const response = await axios.post(`${FASTAPI_URL}/verify`, form, {
                headers: {
                    ...form.getHeaders(),
                },
                timeout: 60000, // 60 seconds timeout for CPU inference
            });

            console.log('Verification success:', response.data);
            return response.data;
        } catch (apiError: any) {
            console.error('FastAPI call failed:', apiError.message);
            // Extract specific error detail from FastAPI (e.g. "Could not extract frame")
            const msg = apiError.response?.data?.detail || apiError.message || 'Verification service failed';
            throw new Error(msg);
        }

    } catch (error) {
        console.error('Error in verifyImage:', error);
        throw error;
    } finally {
        // Controlled Anonymity: CRITICAL CLEANUP
        // Always delete the local file after processing, regardless of success/failure
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Securely deleted file: ${filePath}`);
            }
        } catch (cleanupError) {
            console.error(`Failed to delete file ${filePath}:`, cleanupError);
            // This is a critical security failure, we should strictly log it.
        }
    }
}
