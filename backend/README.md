# ⚙️ HighLighter Backend

The backend is a robust **FastAPI** application responsible for the heavy lifting: NLP sentiment analysis, real-time WebSocket logging, and video manipulation via FFmpeg.

## 📋 Prerequisites

Before setting up the backend, ensure you have the following installed:

1.  **Python 3.9+**: [Download here](https://www.python.org/downloads/)
2.  **FFmpeg**: 
    *   **Windows**: Install via `choco install ffmpeg` or download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) and add to your PATH.
    *   **Linux**: `sudo apt install ffmpeg`
    *   **Mac**: `brew install ffmpeg`
3.  **PostgreSQL**: Either a local instance or a cloud provider like [Neon.tech](https://neon.tech/).

---

## 🛠 Setup Guide

### 1. Environment Configuration
Create a `.env` file in the `backend/` directory based on the following structure:

```env
# Database Connection (PostgreSQL)
DB_URL=postgresql://user:password@hostname:5432/dbname?sslmode=require

# Security
SECRET_KEY=your_super_secret_jwt_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Optional: Hugging Face Token (for higher rate limits)
# HF_TOKEN=your_token_here
```

### 2. Virtual Environment
It is highly recommended to use a virtual environment:

```bash
# Create venv
python -m venv venv

# Activate venv (Windows)
.\venv\Scripts\activate

# Activate venv (Linux/Mac)
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 🚀 Running the Server

Start the FastAPI server using Uvicorn:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. You can view the interactive Swagger documentation at `http://localhost:8000/docs`.

---

## 📡 Core Endpoints

*   **`POST /upload_assets/`**: Upload MP4 and SRT files. Returns unique filenames.
*   **`WS /ws/analyze`**: WebSocket endpoint for the analysis pipeline.
    *   Accepts a JSON config (video path, model key, etc.).
    *   Streams `type: "log"` and `type: "complete"` messages.
*   **`GET /my-runs`**: Retrieves comprehensive processing history and metrics for the user.
*   **`POST /trim_video/`**: Combines selected segments into a final video.

---

## 🏗 Key Abstractions

*   **`app/utils.py`**: Contains the logic for `create_clips` (FFmpeg wrapper) and `analyze_excitement` (Hugging Face wrapper).
*   **`app/routers/edit.py`**: Manages the complex WebSocket state machine for analysis.
*   **`app/models.py`**: SQLAlchemy database schemas for users, history, and segments.
