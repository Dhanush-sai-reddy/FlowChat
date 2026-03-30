# FlowChat

**FlowChat** is a secure, anonymous video chat platform that prioritizes user safety through AI-powered gender verification. It connects users for spontaneous conversations while ensuring a safe environment through a multi-layered moderation and rate-limiting system.

---

## Features

- **Anonymous Video Chat** -- Instant peer-to-peer connections with strangers via WebRTC.
- **AI Gender Verification**
  - Primary: Backend AI service (FastAPI + HuggingFace 84M parameter model).
  - Fallback: Client-side verification using face-api.js (TensorFlow.js) when the backend model is unavailable or too slow.
- **Report and Ban System** -- Multi-tier rate limiting with in-memory bloom filter, Redis temp bans, and MongoDB-backed permanent blocks.
- **Secure and Private** -- Images processed for verification are deleted immediately. No personal data is stored.
- **Fully Dockerized** -- Entire stack runs with a single command.

---

## Architecture

```
                        +-------------------+
                        |    Frontend       |
                        |  React + Vite     |
                        |  (Port 5173)      |
                        +--------+----------+
                                 |
                          WebSocket / HTTP
                                 |
                        +--------v----------+
                        |   Node Backend    |
                        |  Express + Socket.io
                        |  (Port 3000)      |
                        +----+---------+----+
                             |         |
                    +--------v-------+  +---v-----------+
                    |     Redis      |  | FastAPI Service|
                    |  Temp Bans &   |  | Gender AI Model|
                    |  Matchmaking   |  | (Port 8001)    |
                    |  (Port 6379)   |  +----------------+
                    +----------------+
                             |
                    +--------v----------+
                    |     MongoDB       |
                    | Permanent Records |
                    | (Port 27017)      |
                    +-------------------+
```

---

## Report and Ban System

FlowChat uses a three-tier approach for user moderation:

### Tier 1 -- Bloom Filter (In-Process Memory)

A custom bloom filter (FNV-1a + double hashing, 8192-bit array) runs in the Node.js process heap. On every request, it performs an O(1) membership check with zero network I/O. If the bloom filter returns negative, the user is definitively not blocked. This eliminates unnecessary database lookups for the vast majority of requests.

The filter is hydrated from MongoDB on server startup and updated in real time when new permanent blocks are issued.

### Tier 2 -- Redis (Temporary Bans)

When a user accumulates 10 reports within a 7-day sliding window, a 24-hour temporary ban is applied via a Redis key with TTL. Redis handles only short-lived, time-sensitive state. Permanent blocks do not touch Redis.

### Tier 3 -- MongoDB (Permanent Record)

Once a user crosses 35 lifetime cumulative reports, they are permanently blocked. MongoDB serves as the authoritative source of truth for all ban history, lifetime report counts, and permanent block status. On a bloom filter positive hit, MongoDB is consulted to confirm the block.

### Lookup Flow

```
isPermanentlyBlocked(deviceId):
  1. Bloom Filter (in-memory)  --> negative --> return false (done, no I/O)
  2. Bloom Filter positive     --> query MongoDB to confirm
  3. Return result
```

---

## Tech Stack

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | React, Vite, TypeScript, TailwindCSS          |
| Backend     | Node.js, Express, Socket.io, TypeScript       |
| AI Service  | Python, FastAPI, PyTorch, Transformers, OpenCV |
| Database    | MongoDB (persistent storage)                  |
| Cache       | Redis (temp bans, matchmaking state)          |
| DevOps      | Docker, Docker Compose                        |

---

## Project Structure

```
flowchat/
  frontend/              React application
  node-backend/
    src/
      config/            Redis and MongoDB connection setup
      models/            Mongoose schemas (ReportRecord)
      services/
        bloomFilter.ts   In-memory bloom filter (FNV-1a, singleton)
        report.service.ts  Report, ban, and block logic
      sockets/           WebSocket handlers (matchmaking)
      routes/            Express route definitions
      middleware/        Request middleware
      server.ts          Application entry point
  fastapi-service/       Python AI gender classification service
  docker-compose.yml     Full stack orchestration
```

---

## Quick Start

### Prerequisites

- Docker and Docker Compose

### Run

```bash
docker compose up --build
```

### Service Ports

| Service         | Port  |
|-----------------|-------|
| Frontend        | 5173  |
| Node Backend    | 3000  |
| FastAPI Service | 8001  |
| Redis           | 6379  |
| MongoDB         | 27017 |

---

## License

MIT
