# 🎥 Video HighLighter

**Video HighLighter** is an open-source, AI-powered tool designed to automatically extract the most "exciting" moments from long-form video content. By analyzing subtitle sentiment using state-of-the-art NLP models (BERT, RoBERTa, etc.), it identifies high-impact segments and uses FFmpeg to slice and merge them into a high-quality highlight reel.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20React%20%7C%20PostgreSQL-orange)

---

## 🛠 Project Architecture

The application is split into two main components:

1.  **Backend (FastAPI)**: 
    *   Handles video and subtitle uploads.
    *   Runs NLP inference using Hugging Face Transformers.
    *   Streams real-time logs via WebSockets.
    *   Performs video manipulation via FFmpeg.
    *   Manages data persistence with PostgreSQL.
2.  **Frontend (React + Vite)**: 
    *   Premium, dark-mode inspired UI.
    *   Interactive "Curation Studio" for segment selection.
    *   Real-time processing dashboard with a Mac-style console.
    *   Comprehensive model performance analytics with Recharts.

---

## 🚀 High-Level Workflow

1.  **Upload**: Provide an MP4 video and its corresponding SRT subtitle file.
2.  **Engine Selection**: Choose an NLP model (e.g., BERT for accuracy or DistilBERT for speed).
3.  **Neural Analysis**: The system maps sentiment vectors to video timestamps in real-time.
4.  **Curation**: Review the extracted clips in the dashboard and select which ones to include.
5.  **Export**: FFmpeg merges the selected clips into a final highlight video ready for download.
6.  **Analytics**: Review model performance metrics (latency, confidence, load times) in the Telemetry dashboard.

---

## 📂 Directory Structure

```bash
highlighter/
├── backend/            # FastAPI Application
│   ├── app/            # Core logic, routers, and models
│   ├── static/         # Uploaded assets and generated clips
│   ├── Dockerfile      # Backend containerization
│   └── requirements.txt
├── frontend/           # React Application
│   ├── src/            # Components, pages, and API logic
│   ├── public/         # Static assets
│   └── Dockerfile      # Frontend containerization
└── docker-compose.yml  # Full-stack orchestration
```

---

## 🚦 Getting Started

To get the full application running, please refer to the specific setup guides in each directory:

*   **[Backend Setup Guide](./backend/README.md)**: Python environment, FFmpeg installation, and Database configuration.
*   **[Frontend Setup Guide](./frontend/README.md)**: Node.js dependencies and environment variables.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
