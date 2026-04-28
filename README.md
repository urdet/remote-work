# agent_desktop

`agent_desktop` is the SmartPresence desktop client project.

It currently contains:
- A React frontend inside `HybrideWatch AI/`
- A Tauri desktop wrapper inside `HybrideWatch AI/src-tauri/`
- A Python backend inside `backend/`
- A Docker Compose setup for PostgreSQL and the backend API

## Main folders

- `HybrideWatch AI/src/`: React application source
- `HybrideWatch AI/src-tauri/`: Rust and Tauri desktop app code
- `backend/`: FastAPI backend for timer events and screenshot capture uploads

## App dependencies

Frontend and Tauri dependencies are managed with:
- `HybrideWatch AI/package.json`
- `HybrideWatch AI/src-tauri/Cargo.toml`

Backend dependencies are managed with:
- `requirements.txt`

## Backend

The backend exposes:
- `GET /agent/timer-events`
- `GET /agent/captures`
- `GET /agent/captures/{capture_id}/images/{image_index}`
- `POST /agent/timer-events`
- `POST /agent/captures`
- `GET /health`

On every uploaded capture, the backend also attempts an AI screenshot analysis and stores a structured response in PostgreSQL in this shape:

```json
{
  "employee_pin": 12,
  "time": "10:03",
  "activity": "Watching YouTube",
  "apps": "Chrome",
  "details": "Video playing"
}
```

Start PostgreSQL and the backend with:

```bash
docker compose up --build
```

This project uses its own ports so it can run beside `camera-sys`:
- PostgreSQL: `localhost:5431`
- Backend API: `http://localhost:8001`

For local backend development without Docker:

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8001
```

The Tauri/Vite frontend is configured in [`.env`](/Users/mac/Desktop/SmartPresence/agent_desktop/HybrideWatch%20AI/.env) to use `http://localhost:8001`.

AI analysis supports two providers:
- `ANALYSIS_PROVIDER=gemini` with `GEMINI_API_KEY`
- `ANALYSIS_PROVIDER=groq` with `GROQ_API_KEY`

Optional model overrides:
- `GEMINI_MODEL_NAME`
- `GROQ_MODEL_NAME`

The default Groq vision model is `meta-llama/llama-4-scout-17b-16e-instruct`.

## Notes

- Build output, virtual environments, and local editor files are ignored by git.
