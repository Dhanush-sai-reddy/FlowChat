
import io
import os
import tempfile
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from transformers import pipeline
from PIL import Image

# Initialize Model
MODEL_NAME = "rizvandwiki/gender-classification"
print(f"Loading model: {MODEL_NAME}...")
try:
    classifier = pipeline("image-classification", model=MODEL_NAME)
    print("Model loaded successfully.")
except Exception as e:
    print(f"Failed to load model: {e}")
    classifier = None

# Create FastAPI app
app = FastAPI(title="Klymo Backend - Verification Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Klymo Verification (Video -> 84M Model)"}

@app.post("/verify")
async def verify_video(file: UploadFile = File(...)):
    if not (file.content_type.startswith("image/") or file.content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="File must be an image or video")
    
    if classifier is None:
        raise HTTPException(status_code=500, detail="Model not loaded")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        pil_image = None

        if file.content_type.startswith("video/") or file.filename.endswith('.webm'):
            cap = cv2.VideoCapture(temp_file_path)
            if not cap.isOpened():
                os.unlink(temp_file_path)
                raise HTTPException(status_code=400, detail="Could not open video file")

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            middle_frame_index = max(0, total_frames // 2)
            cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame_index)
            
            ret, frame = cap.read()
            cap.release()

            if not ret or frame is None:
                cap = cv2.VideoCapture(temp_file_path)
                ret, frame = cap.read()
                cap.release()
                if not ret or frame is None:
                    os.unlink(temp_file_path)
                    raise HTTPException(status_code=400, detail="Could not extract frame from video")

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_frame)
            
        else:
            pil_image = Image.open(temp_file_path).convert("RGB")

        os.unlink(temp_file_path)

        predictions = classifier(pil_image)
        
        top_pred = predictions[0]
        label = top_pred['label']
        score = top_pred['score']
        
        is_verified = score > 0.7
        
        return {
            "isVerified": is_verified,
            "detectedGender": label,
            "confidence": score
        }
        
    except Exception as e:
        print(f"Prediction Error: {e}")
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
             os.unlink(temp_file_path)
        raise HTTPException(status_code=500, detail=f"Model inference failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
