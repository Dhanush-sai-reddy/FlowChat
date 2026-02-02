
import { Router } from 'express';
import multer from 'multer';
import { verifyImage } from '../ai/verify';
import path from 'path';

const verificationRoute = Router();

// Configure Multer for temporary storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this directory exists or use /tmp
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

verificationRoute.post('/api/verify', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No image file provided"
            });
        }

        const result = await verifyImage(req.file.path);

        res.status(200).json(result);

    } catch (error) {
        console.error("Verification route error:", error);
        res.status(500).json({
            message: "Verification failed",
            error: (error as Error).message
        });
    }
});

export default verificationRoute;
