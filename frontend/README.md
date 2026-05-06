# 🎨 HighLighter Frontend

The frontend is a modern, responsive React application built with **Vite** and **Tailwind CSS**. It provides a premium user interface for managing video processing and viewing deep-learning analytics.

## 📋 Prerequisites

*   **Node.js**: Version 18.0 or higher.
*   **npm** or **yarn** or **pnpm**.

---

## 🛠 Setup Guide

### 1. Install Dependencies
Navigate to the frontend directory and install the necessary packages:

```bash
npm install
```

### 2. Backend Configuration
The frontend communicates with the backend via **Axios**. By default, it expects the backend to be running at `http://localhost:8000`.

If you need to change this, update the `baseURL` in `src/api.js`:

```javascript
// src/api.js
export default axios.create({
  baseURL: `http://localhost:8000/`,
  // ...
});
```

---

## 🚀 Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

---

## 🏗 Key Features & Pages

*   **Landing Page (`Landing.jsx`)**: Overview of the tool's capabilities.
*   **Neural Workspace (`Editor.jsx`)**: The core processing hub.
    *   Uploads assets.
    *   Connects to the WebSocket stream.
    *   Displays real-time logs in a Mac-style window.
*   **Curation Studio (`Highlights.jsx`)**: 
    *   Preview extracted segments.
    *   Select and merge clips using FFmpeg.
*   **Telemetry Dashboard (`ModelComparison.jsx`)**: 
    *   Comprehensive performance analytics (Latency, Confidence, Load Times).
    *   Efficiency Matrix (Scatter plot) comparing different NLP models.
    *   Run history with direct download links.

---

## 🎨 Design System

*   **Styling**: Powered by **Tailwind CSS v4**.
*   **Icons**: Using **React Icons (Feather)**.
*   **Charts**: Using **Recharts** for performance telemetry.
*   **Animations**: Using **DotLottie** for a premium loading experience.
