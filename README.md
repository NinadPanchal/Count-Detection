# 🎯 CrowdWatch — Real-Time Crowd Management & Density Monitoring

> AI-powered crowd detection, tracking, density estimation, and alerting system with a premium command-center dashboard.

![YOLOv8](https://img.shields.io/badge/YOLOv8-Detection-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-Backend-green) ![Next.js](https://img.shields.io/badge/Next.js-Frontend-black) ![WebSocket](https://img.shields.io/badge/WebSocket-Realtime-purple)

## ✨ Features

- **Real-time person detection** using YOLOv8 nano
- **Object tracking** with ByteTrack (persistent IDs)
- **Crowd density estimation** with zone-based analytics
- **Dynamic heatmap** generation and overlay
- **Smart alerts** with severity levels (Safe → Warning → Critical)
- **Premium dark UI** with glassmorphism, animations, and color-coded status
- **Demo mode** with simulated crowd data (works without camera/video)

## 🏗️ Architecture

```
Video Source → YOLOv8 Detection → ByteTrack Tracking → Density Engine → Heatmap
                                                                      ↓
                            Next.js Dashboard ← WebSocket ← Alert Engine
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend runs on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard opens at `http://localhost:3000`

### Demo Mode (No Video Needed)

The system includes a demo WebSocket (`/ws/demo`) that generates simulated crowd data. The frontend connects to this by default — **no camera or video file required!**

To use a real video file, set `NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/video` and place a video as `backend/sample_video/crowd.mp4`.

### Docker

```bash
docker-compose up --build
```

## 📊 Dashboard

| Feature | Description |
|---------|-------------|
| Live Video Feed | Real-time stream with bounding boxes |
| Heatmap Toggle | Overlay density heatmap on video |
| People Counter | Animated, large real-time count |
| Density Gauge | SVG radial gauge with color transitions |
| Zone Monitor | Per-zone density breakdown |
| Alert Panel | Animated slide-in notifications |
| Status Badges | Color-coded Safe/Warning/Critical |

## 🎨 Design System

- **Theme**: Premium dark mode with glassmorphism
- **Colors**: Green (safe), Amber (warning), Red (critical), Purple (accent)
- **Font**: Inter
- **Animations**: Slide-up, fade-in, pulse, shimmer loading

## 🔧 API Endpoints

| Endpoint | Type | Description |
|----------|------|-------------|
| `/api/status` | GET | System health & stats |
| `/api/alerts` | GET | Recent alert history |
| `/api/config` | GET | Current configuration |
| `/ws/video` | WebSocket | Live video stream |
| `/ws/demo` | WebSocket | Simulated demo stream |

## ⚙️ Configuration

Edit `backend/config.py` to adjust:

- `DENSITY_WARNING_THRESHOLD` — people count for warning (default: 15)
- `DENSITY_CRITICAL_THRESHOLD` — people count for critical (default: 30)
- `TARGET_FPS` — processing frame rate (default: 25)
- `CONFIDENCE_THRESHOLD` — detection confidence (default: 0.35)
- `ZONES` — monitoring zone definitions

## 📁 Project Structure

```
hackathon/
├── backend/
│   ├── main.py          # FastAPI + WebSocket server
│   ├── detector.py      # YOLOv8 detection & tracking
│   ├── density.py       # Density estimation & heatmap
│   ├── alerts.py        # Alert engine
│   ├── config.py        # Configuration
│   └── requirements.txt
├── frontend/
│   ├── src/app/         # Next.js pages
│   ├── src/components/  # React components
│   └── src/hooks/       # WebSocket hook
├── docker-compose.yml
└── README.md
```

## 🏆 Built For

Hackathon demonstration — designed to impress judges within 5 seconds with a premium, production-grade feel.

**Tech Stack**: Python · FastAPI · YOLOv8 · OpenCV · ByteTrack · Next.js · Tailwind CSS · WebSocket
