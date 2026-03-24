"""
CrowdWatch — Crowd Management & Density Monitoring System
Main FastAPI application with WebSocket streaming.
"""

import asyncio
import base64
import json
import time
import os

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from detector import PersonDetector
from density import DensityEstimator
from alerts import AlertEngine
from crowd_intelligence import HotspotDetector, MovementAnalyzer
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
system_stats = {
    "fps": 0,
    "total_frames_processed": 0,
    "uptime_start": time.time(),
    "is_processing": False,
    "video_source": config.VIDEO_SOURCE,
}


@app.on_event("startup")
async def startup():
    global detector
    try:
        import ssl
        ssl._create_default_https_context = ssl._create_unverified_context
        detector = PersonDetector()
        print("[CrowdWatch] System ready — detector loaded")
    except Exception as e:
        print(f"[CrowdWatch] WARNING: Detector failed to load ({e})")
        print("[CrowdWatch] Demo mode still available at /ws/demo")
        detector = None


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

            # Draw annotated frame with hotspot indicators
            annotated = draw_detections(
                frame, detections, density_data["density_level"]
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

            # Draw hotspot indicators on frame
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.HOST, port=config.PORT)
