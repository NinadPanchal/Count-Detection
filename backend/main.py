"""
CrowdWatch — Crowd Management & Density Monitoring System
Main FastAPI application with WebSocket streaming.
"""

import asyncio
import base64
import io
import json
import socket
import time
import os
import uuid

import cv2
import numpy as np
import qrcode
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse, Response

from detector import PersonDetector
from density import DensityEstimator
from alerts import AlertEngine
from crowd_intelligence import HotspotDetector, MovementAnalyzer
from device_manager import DeviceManager
from camera_page import get_camera_html
import config

app = FastAPI(
    title="CrowdWatch API",
    description="Real-time Crowd Management & Density Monitoring",
    version="1.0.0",
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
density_estimator = DensityEstimator()
alert_engine = AlertEngine()
hotspot_detector = HotspotDetector()
movement_analyzer = MovementAnalyzer()
device_manager = DeviceManager()
tunnel_url: str | None = None  # Set by ngrok on startup
system_stats = {
    "fps": 0,
    "total_frames_processed": 0,
    "uptime_start": time.time(),
    "is_processing": False,
    "video_source": config.VIDEO_SOURCE,
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


@app.on_event("startup")
async def startup():
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
    _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return base64.b64encode(buffer).decode("utf-8")


@app.websocket("/ws/video")
async def video_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time video streaming.
    Sends JSON messages with frame data, stats, alerts, hotspots, and movement trends.
    """
    await websocket.accept()
    print("[WebSocket] Client connected")

    # Open video source
    source = config.VIDEO_SOURCE
    if source == "0" or source == 0:
        cap = cv2.VideoCapture(0)
    else:
        if not os.path.exists(source):
            await websocket.send_json({
                "type": "error",
                "message": f"Video source not found: {source}",
            })
            await websocket.close()
            return
        cap = cv2.VideoCapture(source)

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

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                # Loop video for demo
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                if not ret:
                    break

            # Resize for performance (720p max)
            h, w = frame.shape[:2]
            if w > 1280:
                scale = 1280 / w
                frame = cv2.resize(frame, (1280, int(h * scale)))

            # Detect & track
            detections = detector.detect_and_track(frame)

            # Density estimation
            density_data = density_estimator.calculate_density(
                detections, frame.shape
            )

            # Crowd intelligence
            hotspot_data = hotspot_detector.analyze(detections, frame.shape)
            movement_data = movement_analyzer.analyze(detections, frame.shape)

            # Generate heatmap with hotspot overlays
            heatmap_b64 = density_estimator.generate_heatmap(
                detections, frame, hotspots=hotspot_data["hotspots"]
            )

            # Check all alert types
            alert = alert_engine.check_and_generate(density_data)
            hotspot_alerts = alert_engine.check_hotspots(hotspot_data)
            convergence_alerts = alert_engine.check_convergence(movement_data)

            # Draw annotated frame with grid + hotspot indicators
            annotated = draw_detections(
                frame, detections, density_data["density_level"]
            )
            annotated = draw_density_grid(
                annotated, hotspot_data["grid_density"], hotspot_data["hotspots"]
            )
            if hotspot_data["hotspots"]:
                annotated = draw_hotspots_on_frame(annotated, hotspot_data["hotspots"])
            frame_b64 = frame_to_base64(annotated)

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
                "heatmap": heatmap_b64,
                "stats": {
                    **density_data,
                    "fps": current_fps,
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

            await websocket.send_json(message)

            # Frame pacing
            await asyncio.sleep(config.FRAME_INTERVAL)

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

            await websocket.send_json(message)
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

                # Resize for performance
                h, w = frame.shape[:2]
                if w > 1280:
                    scale = 1280 / w
                    frame = cv2.resize(frame, (1280, int(h * scale)))

                # Run detection pipeline
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

                # Draw annotated frame
                annotated = draw_detections(frame, detections, density_data["density_level"])
                annotated = draw_density_grid(annotated, hotspot_data["grid_density"], hotspot_data["hotspots"])
                if hotspot_data["hotspots"]:
                    annotated = draw_hotspots_on_frame(annotated, hotspot_data["hotspots"])
                annotated_b64 = frame_to_base64(annotated)

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
                    await websocket.send_json(processed)

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
