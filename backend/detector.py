"""
Person Detection using YOLOv8
Handles loading the model and running inference on frames.
"""

import numpy as np
from ultralytics import YOLO
from config import MODEL_NAME, CONFIDENCE_THRESHOLD, PERSON_CLASS_ID


class PersonDetector:
    def __init__(self):
        """Initialize YOLOv8 model."""
        print(f"[Detector] Loading model: {MODEL_NAME}")
        self.model = YOLO(MODEL_NAME)
        print("[Detector] Model loaded successfully")

    def detect(self, frame: np.ndarray) -> list[dict]:
        """
        Detect persons in a frame.
        
        Returns list of detections:
        [{"bbox": [x1, y1, x2, y2], "confidence": float, "class_id": int}]
        """
        results = self.model(
            frame,
            conf=CONFIDENCE_THRESHOLD,
            classes=[PERSON_CLASS_ID],
            verbose=False,
        )

        detections = []
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    detections.append({
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                        "confidence": conf,
                        "class_id": PERSON_CLASS_ID,
                    })

        return detections

    def detect_and_track(self, frame: np.ndarray) -> list[dict]:
        """
        Detect and track persons using YOLOv8's built-in ByteTrack.
        
        Returns list of tracked detections with persistent IDs:
        [{"bbox": [x1, y1, x2, y2], "confidence": float, "track_id": int}]
        """
        results = self.model.track(
            frame,
            conf=CONFIDENCE_THRESHOLD,
            classes=[PERSON_CLASS_ID],
            tracker="bytetrack.yaml",
            persist=True,
            verbose=False,
        )

        tracked = []
        for result in results:
            if result.boxes is not None and result.boxes.id is not None:
                for box, track_id in zip(result.boxes, result.boxes.id):
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    tid = int(track_id.cpu().numpy())
                    tracked.append({
                        "bbox": [float(x1), float(y1), float(x2), float(y2)],
                        "confidence": conf,
                        "track_id": tid,
                    })

        return tracked
