"""
Configuration for CrowdWatch — Crowd Management & Density Monitoring System
"""

# Video source: path to video file, or 0 for webcam
VIDEO_SOURCE = "sample_video/crowd.mp4"

# Explicit mapping of cameras/video feeds
AVAILABLE_CAMERAS = [
    {"id": "cam-1", "name": "Main Entrance", "path": "sample_video/crowd.mp4", "zone": "Zone 1"},
    {"id": "cam-2", "name": "Center Area", "path": "sample_video/crowd6.mp4", "zone": "Zone 2"},
    {"id": "cam-3", "name": "Exit Corridor", "path": "sample_video/crowd11.mp4", "zone": "Zone 3"},
]

# YOLO11 model (medium — best accuracy/speed trade-off on M4 Apple Silicon)
MODEL_NAME = "yolo11m.pt"
YOLO_IMGSZ = 960              # Reduced from 1280 — sweet spot for M-series silicon

# Detection confidence threshold
CONFIDENCE_THRESHOLD = 0.15

# Person class ID in COCO dataset
PERSON_CLASS_ID = 0

# Density thresholds
DENSITY_WARNING_THRESHOLD = 15   # people count to trigger warning
DENSITY_CRITICAL_THRESHOLD = 30  # people count to trigger critical alert

# Heatmap settings
HEATMAP_GRID_SIZE = 20  # grid cells for density calculation
HEATMAP_BLUR_KERNEL = 31  # Gaussian blur kernel size (reduced from 51 for speed)
HEATMAP_ALPHA = 0.4  # overlay transparency

# Streaming JPEG quality settings
STREAM_JPEG_QUALITY = 55      # Main video stream (reduced from 70 — 40% smaller payloads)
HEATMAP_JPEG_QUALITY = 50     # Heatmap overlay (blurred, quality doesn't matter)

# Pipeline throttle — metadata & heatmaps sent every Nth frame
METADATA_SEND_INTERVAL = 3    # Only send detections/grid/movement every 3rd frame
CASCADE_RUN_INTERVAL = 3      # Only run Haar cascades every 3rd frame

# Alert cooldown (seconds) — prevent spam
ALERT_COOLDOWN = 30

# Target FPS for processing (matches source video)
TARGET_FPS = 25

# WebSocket frame send interval (seconds)
FRAME_INTERVAL = 1.0 / TARGET_FPS

# Server settings
HOST = "0.0.0.0"
PORT = 8002

# Zone definitions (normalized coordinates: x1, y1, x2, y2)
# These define monitoring zones within the frame
ZONES = [
    {"id": "zone-1", "name": "Main Entrance", "coords": [0.0, 0.0, 0.5, 0.5]},
    {"id": "zone-2", "name": "Center Area", "coords": [0.25, 0.25, 0.75, 0.75]},
    {"id": "zone-3", "name": "Exit Area", "coords": [0.5, 0.5, 1.0, 1.0]},
]

# --- Hotspot / Red Zone Detection ---
HOTSPOT_GRID_COLS = 8          # divide frame into 8 columns
HOTSPOT_GRID_ROWS = 6          # divide frame into 6 rows
HOTSPOT_THRESHOLD = 4          # people per cell to trigger hotspot
HOTSPOT_ESCALATION_FRAMES = 45 # consecutive frames a hotspot must persist to dispatch security (~1.8s at 25fps)
HOTSPOT_HISTORY_FRAMES = 10    # rolling window of frames for hotspot averaging

# --- Movement Trend Analysis ---
MOVEMENT_HISTORY_FRAMES = 10   # frames of position history to compute velocity
CONVERGENCE_THRESHOLD = 3      # people flowing toward same cell to flag convergence
MOVEMENT_SPEED_MIN = 2.0       # minimum pixel displacement per frame to count as "moving"

# --- External Camera Streaming ---
CAMERA_SECRET_KEY = "crowdwatch-2024-hackathon"   # used to generate auth tokens for QR URLs
CAMERA_FRAME_INTERVAL = 1.0 / 24                  # aligned to user requested 24 FPS
CAMERA_MAX_DEVICES = 8                             # max simultaneous camera connections
