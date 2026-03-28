"""
CrowdWatch — Crowd Management & Density Monitoring System
Main FastAPI application with WebSocket streaming.
"""

import asyncio
import base64
import io
import json
import orjson
import socket
import time
import os
import uuid
import threading

import cv2
import numpy as np
import qrcode
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, Response
from pydantic import BaseModel

from detector import PersonDetector
from density import DensityEstimator
from alerts import AlertEngine
from crowd_intelligence import HotspotDetector, MovementAnalyzer
from device_manager import DeviceManager
from camera_page import get_camera_html
from analytics_tracker import AnalyticsTracker
import config

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector, tunnel_url
    try:
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context
        detector = PersonDetector()
        print("[CrowdWatch] System ready — detector loaded")
    except Exception as e:
        print(f"[CrowdWatch] WARNING: Detector failed to load ({e})")
        print("[CrowdWatch] Demo mode still available at /ws/demo")
        detector = None

    # Check for tunnel URL (set via env variable or auto-detect)
    env_tunnel = os.environ.get("TUNNEL_URL", "").strip()
    if env_tunnel:
        tunnel_url = env_tunnel.rstrip("/")
        print(f"[CrowdWatch] 🌐 Tunnel: {tunnel_url}")
        print(f"[CrowdWatch] 📱 Camera: {tunnel_url}/camera?token={device_manager.session_token}")
    else:
        # Try ngrok as fallback
        try:
            from pyngrok import ngrok
            public_url = ngrok.connect(config.PORT, "http").public_url
            tunnel_url = public_url
            print(f"[CrowdWatch] 🌐 Tunnel: {tunnel_url}")
            print(f"[CrowdWatch] 📱 Camera: {tunnel_url}/camera?token={device_manager.session_token}")
        except Exception as e:
            print(f"[CrowdWatch] No tunnel ({e}), using local IP")
            tunnel_url = None

    # Start the daemon for background preview processing
    threading.Thread(target=background_preview_generator, daemon=True).start()
    print("[CrowdWatch] Started background preview generator multi-threading")
    yield  # Runs the app

app = FastAPI(
    title="CrowdWatch API",
    description="Real-time Crowd Management & Density Monitoring",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
detector: PersonDetector | None = None
inference_lock = threading.Lock()
density_estimator = DensityEstimator()
alert_engine = AlertEngine()
hotspot_detector = HotspotDetector()
movement_analyzer = MovementAnalyzer()
device_manager = DeviceManager()
global_analytics = AnalyticsTracker()
tunnel_url: str | None = None  # Set by ngrok on startup

# Global Video Source Manager
current_video_source = config.VIDEO_SOURCE
GLOBAL_PREVIEWS = {}

system_stats = {
    "fps": 0,
    "total_frames_processed": 0,
    "uptime_start": time.time(),
    "is_processing": False,
    "video_source": current_video_source,
}


def get_local_ip() -> str:
    """Get the local network IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def background_preview_generator():
    """Continuously generates 1-FPS preview frames for inactive videos."""
    caps = {}
    
    while True:
        if detector is None:
            time.sleep(5)
            continue
            
        active_video_paths = [cam["path"] for cam in config.AVAILABLE_CAMERAS]
        
        # Cleanup old caps
        for k in list(caps.keys()):
            if k not in active_video_paths:
                caps[k].release()
                del caps[k]
                
        for cam in config.AVAILABLE_CAMERAS:
            v_path = cam["path"]
            v_id = cam["id"]
            
            if v_path == current_video_source or v_path == os.path.basename(current_video_source):
                continue # Skip the currently active global stream
                
            full_path = os.path.join(os.getcwd(), v_path)
            if not os.path.exists(full_path):
                continue
                
            if v_path not in caps:
                caps[v_path] = cv2.VideoCapture(full_path)
                
            cap = caps[v_path]
            
            # Skip 25 frames to simulate real-time progression while we slept 1 second
            for _ in range(25): 
                cap.grab()
            
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                
            if ret:
                frame = cv2.resize(frame, (480, 270))
                try:
                    # Use strictly CPU-based cascades for backgrounds to free PyTorch entirely for active dashboard stream!!
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    h, w = gray.shape
                    small_gray = cv2.resize(gray, (int(w * 0.5), int(h * 0.5)))
                    
                    faces = detector.face_cascade.detectMultiScale(small_gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
                    profiles = detector.profile_cascade.detectMultiScale(small_gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
                    
                    count = len(faces) + len(profiles)
                    
                    for (fx, fy, fw, fh) in faces:
                        rx, ry, rw, rh = int(fx/0.5), int(fy/0.5), int(fw/0.5), int(fh/0.5)
                        cv2.rectangle(frame, (rx, ry), (rx+rw, ry+rh), (0, 255, 156), 2)
                                
                    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 50])
                    b64 = base64.b64encode(buffer).decode("utf-8")
                    GLOBAL_PREVIEWS[v_id] = {"frame": b64, "count": count}
                except Exception as e:
                    print(f"[Preview] Error on {v_path}: {e}")
                    
        time.sleep(1.0) # 1 FPS refresh rate for background previews

@app.get("/api/status")
async def get_status():
    """System health & status endpoint."""
    return JSONResponse({
        "status": "online",
        "fps": system_stats["fps"],
        "total_frames": system_stats["total_frames_processed"],
        "uptime_seconds": round(time.time() - system_stats["uptime_start"], 1),
        "is_processing": system_stats["is_processing"],
        "video_source": system_stats["video_source"],
        "model": config.MODEL_NAME,
    })


@app.get("/api/alerts")
async def get_alerts():
    """Get recent alerts."""
    return JSONResponse({
        "alerts": alert_engine.get_recent_alerts(20),
    })


@app.get("/api/config")
async def get_config():
    """Get current configuration."""
    return JSONResponse({
        "warning_threshold": config.DENSITY_WARNING_THRESHOLD,
        "critical_threshold": config.DENSITY_CRITICAL_THRESHOLD,
        "target_fps": config.TARGET_FPS,
        "zones": config.ZONES,
        "confidence_threshold": config.CONFIDENCE_THRESHOLD,
    })


@app.get("/api/analytics")
async def api_get_analytics():
    """Get aggregated analytics tracker stats (replacing frontend mock data)."""
    return JSONResponse(global_analytics.get_summary_stats())


class VideoSwitchRequest(BaseModel):
    filename: str

@app.get("/api/videos")
async def get_videos():
    """List available local videos explicitly mapped in config.py."""
    videos = []
    for cam in config.AVAILABLE_CAMERAS:
        full_path = os.path.join(os.getcwd(), cam["path"])
        size_mb = 0
        status = "offline"
        if os.path.exists(full_path):
            size_mb = round(os.path.getsize(full_path) / (1024 * 1024), 2)
            status = "online"
            
        videos.append({
            "id": cam["id"],
            "name": cam["name"],
            "path": cam["path"],
            "zone": cam.get("zone", ""),
            "size_mb": size_mb,
            "status": status,
        })
    return JSONResponse({"videos": videos, "active": current_video_source})

@app.get("/api/videos/live")
async def api_videos_live():
    """Returns the latest detection-burned base64 snapshot for all background videos."""
    return JSONResponse(GLOBAL_PREVIEWS)

@app.post("/api/video/switch")
async def switch_video(req: VideoSwitchRequest):
    """Switch the global video feed source. The active /ws/video stream will hot-swap on next frame."""
    global current_video_source
    target = req.filename
    if not target.startswith("sample_video/") and target != "0":
        target = f"sample_video/{target}"
    
    if os.path.exists(target) or target == "0":
        old_source = current_video_source
        current_video_source = target
        system_stats["video_source"] = current_video_source
        print(f"[CrowdWatch] 🔄 Video source switched: {old_source} → {current_video_source}")
        return JSONResponse({"status": "success", "active": current_video_source})
    else:
        return JSONResponse({"status": "error", "message": f"File not found: {target}"}, status_code=404)


def draw_detections(frame: np.ndarray, detections: list[dict], density_level: str) -> np.ndarray:
    """Draw bounding boxes and labels on frame."""
    annotated = frame.copy()

    # Color based on density level
    colors = {
        "safe": (0, 230, 118),       # green
        "warning": (0, 171, 255),     # amber (BGR)
        "critical": (68, 23, 255),    # red (BGR)
    }
    color = colors.get(density_level, (0, 230, 118))

    for det in detections:
        x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
        track_id = det.get("track_id", "?")
        conf = det.get("confidence", 0)

        # Draw bbox with rounded corners effect
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

        # Label background
        label = f"#{track_id}"
        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(
            annotated,
            (x1, y1 - label_size[1] - 8),
            (x1 + label_size[0] + 8, y1),
            color,
            -1,
        )
        cv2.putText(
            annotated, label, (x1 + 4, y1 - 4),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1,
        )

    # Count overlay in top-left
    count_text = f"People: {len(detections)}"
    cv2.putText(
        annotated, count_text, (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3,
    )

    return annotated


def draw_density_grid(
    frame: np.ndarray, grid_density: list[list[int]], hotspots: list[dict]
) -> np.ndarray:
    """
    Draw an 8×6 density grid overlay on the frame.
    Each cell is color-coded by person count and shows the count number.
    """
    annotated = frame.copy()
    overlay = frame.copy()
    h, w = frame.shape[:2]
    rows = len(grid_density)
    cols = len(grid_density[0]) if rows > 0 else 0
    if rows == 0 or cols == 0:
        return annotated

    cell_w = w / cols
    cell_h = h / rows

    # Build a set of hotspot cells for quick lookup
    hotspot_cells = set()
    for hs in hotspots:
        hotspot_cells.add((hs["cell"][0], hs["cell"][1]))

    for r in range(rows):
        for c in range(cols):
            count = grid_density[r][c]
            x1 = int(c * cell_w)
            y1 = int(r * cell_h)
            x2 = int((c + 1) * cell_w)
            y2 = int((r + 1) * cell_h)

            # Color based on count
            if count >= 8:
                fill_color = (0, 0, 200)       # red
                text_color = (255, 255, 255)
                alpha = 0.25
            elif count >= 4:
                fill_color = (0, 140, 255)     # amber/orange
                text_color = (255, 255, 255)
                alpha = 0.15
            elif count >= 1:
                fill_color = (0, 180, 80)      # green
                text_color = (200, 255, 200)
                alpha = 0.08
            else:
                fill_color = None
                text_color = (80, 80, 90)
                alpha = 0

            # Semi-transparent fill for cells with people
            if fill_color and count > 0:
                cv2.rectangle(overlay, (x1, y1), (x2, y2), fill_color, -1)

            # Grid lines (subtle)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (50, 50, 60), 1)

            # Red circle for hotspot cells
            if (r, c) in hotspot_cells:
                center_x = int((x1 + x2) / 2)
                center_y = int((y1 + y2) / 2)
                radius = int(min(cell_w, cell_h) * 0.4)
                cv2.circle(overlay, (center_x, center_y), radius, (0, 0, 255), -1)
                cv2.circle(annotated, (center_x, center_y), radius, (0, 0, 255), 2)

            # Count label in each cell
            if count > 0:
                label = str(count)
                font_scale = 0.45
                thickness = 1
                label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
                tx = int((x1 + x2) / 2 - label_size[0] / 2)
                ty = int((y1 + y2) / 2 + label_size[1] / 2)
                # Shadow
                cv2.putText(annotated, label, (tx + 1, ty + 1), cv2.FONT_HERSHEY_SIMPLEX, font_scale, (0, 0, 0), thickness + 1)
                cv2.putText(annotated, label, (tx, ty), cv2.FONT_HERSHEY_SIMPLEX, font_scale, text_color, thickness)

    # Blend overlay (fills + circles) with annotated frame
    annotated = cv2.addWeighted(overlay, 0.3, annotated, 0.7, 0)

    return annotated


def draw_hotspots_on_frame(frame: np.ndarray, hotspots: list[dict]) -> np.ndarray:
    """Draw red zone indicators directly on the annotated frame."""
    annotated = frame.copy()

    for hs in hotspots:
        x1, y1, x2, y2 = hs["coords"]
        severity = hs.get("severity", "warning")
        persistent = hs.get("persistent", False)

        if severity == "critical":
            color = (0, 0, 255)     # red
            thickness = 2
        else:
            color = (0, 140, 255)   # orange
            thickness = 1

        # Dashed-style border (draw corner marks)
        corner_len = min(20, (x2 - x1) // 4, (y2 - y1) // 4)
        # Top-left
        cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), color, thickness)
        cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), color, thickness)
        # Top-right
        cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), color, thickness)
        cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), color, thickness)
        # Bottom-left
        cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), color, thickness)
        cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), color, thickness)
        # Bottom-right
        cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color, thickness)
        cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), color, thickness)

        # Label for persistent/critical
        if persistent:
            label = "DISPATCH"
            label_color = (0, 0, 255)
        elif severity == "critical":
            label = "RED ZONE"
            label_color = (0, 0, 255)
        else:
            label = "ALERT"
            label_color = (0, 140, 255)

        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
        cv2.rectangle(
            annotated,
            (x1, y1 - label_size[1] - 6),
            (x1 + label_size[0] + 6, y1),
            label_color, -1,
        )
        cv2.putText(
            annotated, label, (x1 + 3, y1 - 3),
            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1,
        )

    return annotated


def frame_to_base64(frame: np.ndarray) -> str:
    """Encode frame as base64 JPEG."""
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, config.STREAM_JPEG_QUALITY])
    return base64.b64encode(buffer).decode("utf-8")


@app.websocket("/ws/video")
async def video_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time video streaming.
    Sends JSON messages with frame data, stats, alerts, hotspots, and movement trends.
    """
    await websocket.accept()
    print("[WebSocket] Client connected")

    global current_video_source
    local_source = current_video_source
    if local_source == "0" or local_source == 0:
        cap = cv2.VideoCapture(0)
    else:
        if not os.path.exists(local_source):
            await websocket.send_json({
                "type": "error",
                "message": f"Video source not found: {local_source}",
            })
            await websocket.close()
            return
        cap = cv2.VideoCapture(local_source)

    if not cap.isOpened():
        await websocket.send_json({
            "type": "error",
            "message": "Failed to open video source",
        })
        await websocket.close()
        return

    system_stats["is_processing"] = True
    frame_count = 0
    fps_start = time.time()
    current_fps = 0

    # Cap output at 15fps — sustainable for YOLO + encode + WebSocket + browser decode
    source_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    OUTPUT_FPS = 15.0
    target_interval = 1.0 / OUTPUT_FPS
    # How many source frames to skip per output frame (e.g. 30fps source → skip every other)
    frame_skip = max(1, int(round(source_fps / OUTPUT_FPS)))

    # Detection state — reuse between frames for smooth playback
    last_detections = []
    last_density_data = {"total_count": 0, "density_level": "safe", "zones": []}
    last_hotspot_data = {"hotspots": [], "grid_density": []}
    last_movement_data = {"trends": [], "convergence_zones": [], "overall_direction": "stable", "avg_speed": 0}
    last_heatmap_b64 = ""
    video_frame_idx = 0

    try:
        while True:
            frame_start = time.time()
            
            if current_video_source != local_source:
                local_source = current_video_source
                cap.release()
                if local_source == "0" or local_source == 0:
                    cap = cv2.VideoCapture(0)
                else:
                    cap = cv2.VideoCapture(local_source)
                
                if cap.isOpened():
                    source_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                    frame_skip = max(1, int(round(source_fps / OUTPUT_FPS)))
                else:
                    print(f"[WebSocket] Failed to hot-swap to {local_source}")
                    break
                
                video_frame_idx = 0
                last_detections = []
                system_stats["video_source"] = local_source

            # Skip frames to stay in sync — read and discard intermediate frames
            frame = None
            for _ in range(frame_skip):
                ret, frame = cap.read()
                if not ret:
                    break

            if not ret or frame is None:
                # Loop video for demo
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                video_frame_idx = 0
                ret, frame = cap.read()
                if not ret:
                    break

            video_frame_idx += 1

            # Downscale frame for speed and bandwidth
            h, w = frame.shape[:2]
            target_w = config.YOLO_IMGSZ
            if w > target_w:
                scale = target_w / w
                frame = cv2.resize(frame, (target_w, int(h * scale)))

            send_metadata = (video_frame_idx % config.METADATA_SEND_INTERVAL == 0) or video_frame_idx == 1

            # Run full AI pipeline on metadata frames
            if send_metadata:
                with inference_lock:
                    if detector:
                        last_detections = detector.detect_and_track(frame)
                    else:
                        last_detections = []

                last_density_data = density_estimator.calculate_density(
                    last_detections, frame.shape
                )

                last_hotspot_data = hotspot_detector.analyze(last_detections, frame.shape)
                last_movement_data = movement_analyzer.analyze(last_detections, frame.shape)

                last_heatmap_b64 = density_estimator.generate_heatmap(
                    last_detections, frame, hotspots=last_hotspot_data["hotspots"]
                )

                # Check all alert types
                alert = alert_engine.check_and_generate(last_density_data)
                hotspot_alerts = alert_engine.check_hotspots(last_hotspot_data)
                convergence_alerts = alert_engine.check_convergence(last_movement_data)

                # Record into analytics tracker
                zone_counts = [z["count"] for z in last_density_data.get("zones", [])]
                global_analytics.add_frame_data(last_density_data["total_count"], zone_counts, 0)
            else:
                alert = None
                hotspot_alerts = []
                convergence_alerts = []

            # Send raw frame for Client-Side Canvas rendering
            frame_b64 = frame_to_base64(frame)

            # Calculate FPS
            frame_count += 1
            system_stats["total_frames_processed"] += 1
            elapsed = time.time() - fps_start
            if elapsed >= 1.0:
                current_fps = round(frame_count / elapsed, 1)
                system_stats["fps"] = current_fps
                frame_count = 0
                fps_start = time.time()

            # Build message
            message = {
                "type": "frame",
                "frame": frame_b64,
                "stats": {
                    **last_density_data,
                    "fps": current_fps,
                    "timestamp": time.time(),
                    "time_str": time.strftime("%H:%M:%S"),
                },
            }

            if send_metadata:
                message["heatmap"] = last_heatmap_b64
                message["hotspots"] = last_hotspot_data["hotspots"]
                message["detections"] = last_detections
                message["grid_density"] = last_hotspot_data["grid_density"]
                message["movement"] = {
                    "trends": last_movement_data["trends"],
                    "convergence_zones": last_movement_data["convergence_zones"],
                    "overall_direction": last_movement_data["overall_direction"],
                    "avg_speed": last_movement_data["avg_speed"],
                }

            # Collect all alerts for this frame
            all_alerts = []
            if alert:
                all_alerts.append(alert)
            all_alerts.extend(hotspot_alerts)
            all_alerts.extend(convergence_alerts)

            if all_alerts:
                message["alert"] = all_alerts[0]  # primary alert
                if len(all_alerts) > 1:
                    message["extra_alerts"] = all_alerts[1:]

            await websocket.send_bytes(orjson.dumps(message))

            # Frame pacing — sleep remaining time to maintain target FPS
            processing_time = time.time() - frame_start
            sleep_time = max(0, target_interval - processing_time)
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        print("[WebSocket] Client disconnected")
    except Exception as e:
        print(f"[WebSocket] Error: {e}")
    finally:
        cap.release()
        system_stats["is_processing"] = False
        print("[WebSocket] Stream ended")


@app.websocket("/ws/demo")
async def demo_websocket(websocket: WebSocket):
    """
    Demo WebSocket that sends simulated data.
    Used when no video source is available.
    """
    await websocket.accept()
    print("[WebSocket] Demo client connected")

    system_stats["is_processing"] = True
    frame_num = 0

    # Per-demo instances for isolation
    demo_hotspot = HotspotDetector()
    demo_movement = MovementAnalyzer()

    try:
        while True:
            frame_num += 1

            # Simulate varying crowd density
            t = time.time()
            base_count = 10
            variation = int(15 * abs(np.sin(t * 0.1)))
            spike = int(20 * max(0, np.sin(t * 0.03))) if np.sin(t * 0.05) > 0.7 else 0
            people_count = base_count + variation + spike

            # Generate simulated detections with persistent track IDs
            # Cluster some people in certain areas to trigger hotspots
            sim_detections = []
            cluster_count = int(people_count * 0.4)  # 40% cluster in one area
            scatter_count = people_count - cluster_count

            # Cluster center shifts over time to simulate movement
            cluster_cx = 400 + int(200 * np.sin(t * 0.08))
            cluster_cy = 300 + int(100 * np.cos(t * 0.06))

            for i in range(cluster_count):
                x = int(np.clip(cluster_cx + np.random.normal(0, 50), 50, 1200))
                y = int(np.clip(cluster_cy + np.random.normal(0, 40), 50, 670))
                w_box = int(np.random.uniform(30, 60))
                h_box = int(np.random.uniform(60, 120))
                sim_detections.append({
                    "bbox": [x, y, x + w_box, y + h_box],
                    "confidence": round(np.random.uniform(0.5, 0.95), 2),
                    "track_id": i + 1,
                })

            for i in range(scatter_count):
                x = int(np.random.uniform(50, 1200))
                y = int(np.random.uniform(50, 670))
                w_box = int(np.random.uniform(30, 60))
                h_box = int(np.random.uniform(60, 120))
                sim_detections.append({
                    "bbox": [x, y, x + w_box, y + h_box],
                    "confidence": round(np.random.uniform(0.5, 0.95), 2),
                    "track_id": cluster_count + i + 1,
                })

            # Create a dark frame with grid lines for demo
            demo_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
            demo_frame[:] = (20, 20, 25)  # dark background

            # Draw grid
            for gx in range(0, 1280, 64):
                cv2.line(demo_frame, (gx, 0), (gx, 720), (35, 35, 40), 1)
            for gy in range(0, 720, 64):
                cv2.line(demo_frame, (0, gy), (1280, gy), (35, 35, 40), 1)

            # Draw simulated person markers
            level_colors = {
                "safe": (0, 230, 118),
                "warning": (0, 171, 255),
                "critical": (68, 23, 255),
            }

            density_data = density_estimator.calculate_density(
                sim_detections, demo_frame.shape
            )
            color = level_colors.get(density_data["density_level"], (0, 230, 118))

            for det in sim_detections:
                x1, y1, x2, y2 = [int(v) for v in det["bbox"]]
                cv2.rectangle(demo_frame, (x1, y1), (x2, y2), color, 2)
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                cv2.circle(demo_frame, (cx, cy), 3, color, -1)

            # Count text
            cv2.putText(
                demo_frame, f"People: {people_count}", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, color, 3,
            )
            cv2.putText(
                demo_frame, "DEMO MODE", (20, 700),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 100, 100), 1,
            )

            # Crowd intelligence
            hotspot_data = demo_hotspot.analyze(sim_detections, demo_frame.shape)
            movement_data = demo_movement.analyze(sim_detections, demo_frame.shape)

            # Draw density grid + hotspot indicators on frame
            demo_frame = draw_density_grid(
                demo_frame, hotspot_data["grid_density"], hotspot_data["hotspots"]
            )
            if hotspot_data["hotspots"]:
                demo_frame = draw_hotspots_on_frame(demo_frame, hotspot_data["hotspots"])

            frame_b64 = frame_to_base64(demo_frame)
            heatmap_b64 = density_estimator.generate_heatmap(
                sim_detections, demo_frame, hotspots=hotspot_data["hotspots"]
            )

            # Check all alert types
            alert = alert_engine.check_and_generate(density_data)
            hotspot_alerts = alert_engine.check_hotspots(hotspot_data)
            convergence_alerts = alert_engine.check_convergence(movement_data)

            message = {
                "type": "frame",
                "frame": frame_b64,
                "heatmap": heatmap_b64,
                "stats": {
                    **density_data,
                    "fps": 25.0,
                    "timestamp": time.time(),
                    "time_str": time.strftime("%H:%M:%S"),
                },
                "hotspots": hotspot_data["hotspots"],
                "movement": {
                    "trends": movement_data["trends"],
                    "convergence_zones": movement_data["convergence_zones"],
                    "overall_direction": movement_data["overall_direction"],
                    "avg_speed": movement_data["avg_speed"],
                },
            }

            # Collect all alerts
            all_alerts = []
            if alert:
                all_alerts.append(alert)
            all_alerts.extend(hotspot_alerts)
            all_alerts.extend(convergence_alerts)

            if all_alerts:
                message["alert"] = all_alerts[0]
                if len(all_alerts) > 1:
                    message["extra_alerts"] = all_alerts[1:]

            await websocket.send_bytes(orjson.dumps(message))
            await asyncio.sleep(config.FRAME_INTERVAL)

    except WebSocketDisconnect:
        print("[WebSocket] Demo client disconnected")
    except Exception as e:
        print(f"[WebSocket] Demo error: {e}")
    finally:
        system_stats["is_processing"] = False


# =========================================
#  External Camera Streaming Endpoints
# =========================================

def _get_base_url() -> str:
    """Get the best available base URL (tunnel or local IP)."""
    if tunnel_url:
        return tunnel_url
    return f"http://{get_local_ip()}:{config.PORT}"


def _get_ws_base_url() -> str:
    """Get WebSocket base URL (wss for tunnel, ws for local)."""
    if tunnel_url:
        return tunnel_url.replace("https://", "wss://").replace("http://", "ws://")
    return f"ws://{get_local_ip()}:{config.PORT}"


@app.get("/api/qrcode")
async def generate_qrcode():
    """Generate a QR code PNG for connecting external cameras."""
    token = device_manager.session_token
    base = _get_base_url()
    url = f"{base}/camera?token={token}"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#5eead4", back_color="#0c1220")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "no-cache"},
    )


@app.get("/api/qrcode-url")
async def get_qrcode_url():
    """Get the URL encoded in the QR code (for display purposes)."""
    token = device_manager.session_token
    base = _get_base_url()
    url = f"{base}/camera?token={token}"
    return JSONResponse({"url": url, "base": base, "token": token})


@app.get("/api/devices")
async def list_devices():
    """List all connected external camera devices."""
    return JSONResponse({
        "devices": device_manager.list_devices(),
        "count": device_manager.device_count,
        "max": config.CAMERA_MAX_DEVICES,
    })


@app.get("/camera", response_class=HTMLResponse)
async def camera_page(token: str = Query("")):
    """Serve the camera capture page for external devices."""
    if not device_manager.validate_token(token):
        return HTMLResponse(
            "<h1 style='color:#f87171;font-family:sans-serif;text-align:center;margin-top:40vh'>"
            "Invalid or expired token. Please scan a new QR code.</h1>",
            status_code=403,
        )

    device_id = uuid.uuid4().hex[:12]
    ws_base = _get_ws_base_url()
    ws_url = f"{ws_base}/ws/camera/{device_id}"

    html = get_camera_html(ws_url, device_id, token)
    return HTMLResponse(html)


@app.websocket("/ws/camera/{device_id}")
async def camera_receiver(websocket: WebSocket, device_id: str):
    """
    WebSocket endpoint that receives frames FROM an external camera device.
    Runs each frame through the full detection pipeline.
    """
    await websocket.accept()
    print(f"[Camera] Device {device_id} socket opened")

    authenticated = False
    # Per-device processing instances
    dev_density = DensityEstimator()
    dev_alerts = AlertEngine()
    dev_hotspot = HotspotDetector()
    dev_movement = MovementAnalyzer()

    frame_count = 0
    fps_start = time.time()
    current_fps = 0.0

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            # Handle auth message
            if msg.get("type") == "auth":
                token = msg.get("token", "")
                if not device_manager.validate_token(token):
                    await websocket.send_json({"type": "error", "message": "Invalid token"})
                    await websocket.close()
                    return

                name = msg.get("name", f"Camera-{device_id[:6]}")
                if not device_manager.register(device_id, name):
                    await websocket.send_json({"type": "error", "message": "Max devices reached"})
                    await websocket.close()
                    return

                authenticated = True
                await websocket.send_json({"type": "auth_ok", "device_id": device_id})
                print(f"[Camera] Device {device_id} authenticated as '{name}'")
                continue

            if not authenticated:
                await websocket.send_json({"type": "error", "message": "Not authenticated"})
                continue

            # Handle frame message
            if msg.get("type") == "frame":
                frame_b64 = msg.get("frame", "")
                if not frame_b64:
                    continue

                # Decode base64 JPEG to OpenCV frame
                try:
                    jpg_bytes = base64.b64decode(frame_b64)
                    nparr = np.frombuffer(jpg_bytes, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                    if frame is None:
                        continue
                except Exception:
                    continue

                # Resize aggressively for AI inference performance (720 max width)
                h, w = frame.shape[:2]
                if w > 720:
                    scale = 720 / w
                    frame = cv2.resize(frame, (720, int(h * scale)))

                # Run detection pipeline
                with inference_lock:
                    if detector:
                        detections = detector.detect_and_track(frame)
                    else:
                        detections = []

                density_data = dev_density.calculate_density(detections, frame.shape)
                hotspot_data = dev_hotspot.analyze(detections, frame.shape)
                movement_data = dev_movement.analyze(detections, frame.shape)

                heatmap_b64 = dev_density.generate_heatmap(
                    detections, frame, hotspots=hotspot_data["hotspots"]
                )

                alert = dev_alerts.check_and_generate(density_data)
                hotspot_alerts = dev_alerts.check_hotspots(hotspot_data)
                convergence_alerts = dev_alerts.check_convergence(movement_data)

                # Record into analytics tracker
                zone_counts = [z["count"] for z in density_data.get("zones", [])]
                global_analytics.add_frame_data(density_data["total_count"], zone_counts, 0)

                # Send raw frame for Client-Side Canvas rendering
                annotated_b64 = frame_to_base64(frame)

                # FPS calculation
                frame_count += 1
                elapsed = time.time() - fps_start
                if elapsed >= 1.0:
                    current_fps = round(frame_count / elapsed, 1)
                    frame_count = 0
                    fps_start = time.time()

                # Store processed frame for feed endpoint
                device_manager.update_frame(device_id, frame, annotated_b64)

                # Build processed message (same format as /ws/video)
                processed = {
                    "type": "frame",
                    "frame": annotated_b64,
                    "heatmap": heatmap_b64,
                    "stats": {
                        **density_data,
                        "fps": current_fps,
                        "timestamp": time.time(),
                        "time_str": time.strftime("%H:%M:%S"),
                    },
                    "hotspots": hotspot_data["hotspots"],
                    "detections": detections,
                    "grid_density": hotspot_data["grid_density"],
                    "movement": {
                        "trends": movement_data["trends"],
                        "convergence_zones": movement_data["convergence_zones"],
                        "overall_direction": movement_data["overall_direction"],
                        "avg_speed": movement_data["avg_speed"],
                    },
                    "device_id": device_id,
                }

                all_alerts = []
                if alert:
                    all_alerts.append(alert)
                all_alerts.extend(hotspot_alerts)
                all_alerts.extend(convergence_alerts)
                if all_alerts:
                    processed["alert"] = all_alerts[0]
                    if len(all_alerts) > 1:
                        processed["extra_alerts"] = all_alerts[1:]

                # Store processed data for feed subscribers
                device_manager._devices[device_id]["_latest_processed"] = processed

    except WebSocketDisconnect:
        print(f"[Camera] Device {device_id} disconnected")
    except Exception as e:
        print(f"[Camera] Device {device_id} error: {e}")
    finally:
        if authenticated:
            device_manager.unregister(device_id)


@app.websocket("/ws/feed/{device_id}")
async def device_feed(websocket: WebSocket, device_id: str):
    """
    WebSocket endpoint that streams processed frames TO the dashboard
    for a specific external camera device.
    """
    await websocket.accept()
    print(f"[Feed] Dashboard subscribed to device {device_id}")

    try:
        last_frame_count = -1
        while True:
            dev = device_manager._devices.get(device_id)
            if dev is None:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Device {device_id} not connected",
                })
                await asyncio.sleep(1)
                continue

            current_count = dev.get("frame_count", 0)
            if current_count != last_frame_count:
                last_frame_count = current_count
                processed = dev.get("_latest_processed")
                if processed:
                    await websocket.send_bytes(orjson.dumps(processed))

            await asyncio.sleep(config.CAMERA_FRAME_INTERVAL)

    except WebSocketDisconnect:
        print(f"[Feed] Dashboard unsubscribed from device {device_id}")
    except Exception as e:
        print(f"[Feed] Error: {e}")


if __name__ == "__main__":
    import uvicorn
    local_ip = get_local_ip()
    print(f"\n{'='*50}")
    print(f"  CrowdWatch — Crowd Monitoring System")
    print(f"  Local:   http://localhost:{config.PORT}")
    print(f"  Network: http://{local_ip}:{config.PORT}")
    print(f"  QR Code: http://{local_ip}:{config.PORT}/api/qrcode")
    print(f"{'='*50}\n")
    uvicorn.run(app, host=config.HOST, port=config.PORT)
