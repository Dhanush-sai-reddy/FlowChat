# FlowChat

**FlowChat** is a secure, anonymous video chat platform that prioritizes user safety through AI-powered gender verification. It connects users for spontaneous conversations while ensuring a safe environment.

## Features

-   **Anonymous Video Chat**: Instant connections with strangers.
-   **AI Gender Verification**:
    -   **Primary**: Backend AI Service (FastAPI + HuggingFace 84M model).
    -   **Fallback**: Client-side verification using `face-api.js` (TensorFlow.js) if the model is           unavailable for incoming users or taking too long
-   **Secure & Private**: Images processed for verification are deleted immediately. No personal data storage.
-   **Dockerized**: Full stack (Frontend + Node Backend + FastAPI + Redis) runnable with a single command.

## Tech Stack

-   **Frontend**: React (Vite), TypeScript, TailwindCSS
-   **Backend**: Node.js (Express), Socket.io (planned)
-   **AI Service**: Python (FastAPI), PyTorch, Transformers, OpenCV
-   **Database/Cache**: Redis
-   **DevOps**: Docker, Docker Compose

## Quick Start

### Prerequisites
-   Docker & Docker Compose

### Run the App

```bash
docker compose up --build
```

The application will be available at:
-   **Frontend**: `http://localhost:5173`
-   **Node Backend**: `http://localhost:3000`
-   **AI Service**: `http://localhost:8000`

## Project Structure

-   `frontend/`: React application
-   `node-backend/`: Main server for handling requests and socket connections
-   `fastapi-service/`: Python service running the gender classification model

## License
MIT
