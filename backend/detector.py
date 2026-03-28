"""
Person Detection using YOLOv8
Handles loading the model and running inference on frames.
"""

import numpy as np
import cv2
import uuid
from ultralytics import YOLO
from config import MODEL_NAME, CONFIDENCE_THRESHOLD, PERSON_CLASS_ID


class PersonDetector:
    def __init__(self):
        """Initialize YOLOv8 model."""
        print(f"[Detector] Loading model: {MODEL_NAME}")
        self.model = YOLO(MODEL_NAME)
        
        print("[Detector] Booting Secondary Cascades (Ensemble Mode)...")
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
        
        # We start pseudo-IDs very high to safely distinguish them from standard ByteTrack IDs.
        self.pseudo_id_counter = 5000000 
        
        print("[Detector] Model loaded successfully")

    def _get_intersection_area(self, box1, box2):
        x1_1, y1_1, x2_1, y2_1 = box1
        x1_2, y1_2, x2_2, y2_2 = box2
        
        xi1 = max(x1_1, x1_2)
        yi1 = max(y1_1, y1_2)
        xi2 = min(x2_1, x2_2)
        yi2 = min(y2_1, y2_2)
        
        inter_width = max(0, xi2 - xi1)
        inter_height = max(0, yi2 - yi1)
        return inter_width * inter_height

    def _is_isolated(self, target_box, primary_boxes, threshold=0.15):
        """Returns True if target_box lies outside existing tracked full-body boxes."""
        t_x1, t_y1, t_x2, t_y2 = target_box
        t_area = (t_x2 - t_x1) * (t_y2 - t_y1)
        if t_area <= 0:
            return False
            
        for p_box in primary_boxes:
            inter_area = self._get_intersection_area(target_box, p_box)
            # If the intersection represents > 15% of the cascade box, we assume it's part of the same person
            if (inter_area / t_area) > threshold:
                return False 
                
        return True

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
            device="mps",
            imgsz=1280,
            verbose=False,
        )

        detections = []
        primary_boxes = []
        
        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    box_list = [float(x1), float(y1), float(x2), float(y2)]
                    detections.append({
                        "bbox": box_list,
                        "confidence": conf,
                        "class_id": PERSON_CLASS_ID,
                    })
                    primary_boxes.append(box_list)
                    
        # --- SECONDARY TARGETING (CASCADES) ---
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Heavy CPU operations: scale down logic 50% for speed
        scale = 0.5
        h, w = gray.shape
        small_gray = cv2.resize(gray, (int(w * scale), int(h * scale)))
        
        faces = self.face_cascade.detectMultiScale(small_gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
        profiles = self.profile_cascade.detectMultiScale(small_gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
        
        all_secondary = []
        if len(faces) > 0: all_secondary.extend(faces)
        if len(profiles) > 0: all_secondary.extend(profiles)
        
        # Calculate Non-Maximum Suppression intersection
        for (x, y, w_box, h_box) in all_secondary:
            # Upscale coordinates back to original frame size
            rx, ry, rw, rh = x/scale, y/scale, w_box/scale, h_box/scale
            sec_box = [float(rx), float(ry), float(rx+rw), float(ry+rh)]
            
            # If completely isolated from standard tracked humans, it's an occlusion!
            if self._is_isolated(sec_box, primary_boxes, threshold=0.15):
                detections.append({
                    "bbox": sec_box,
                    "confidence": 0.40,  # Fallback confidence
                    "class_id": PERSON_CLASS_ID,
                })
                # Add to primary boxes to prevent overlapping cascade matches (frontal/profile) returning duplicate targets
                primary_boxes.append(sec_box)

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
            device="mps",
            imgsz=1280,
            verbose=False,
        )

        tracked = []
        primary_boxes = []
        
        for result in results:
            if result.boxes is not None and result.boxes.id is not None:
                for box, track_id in zip(result.boxes, result.boxes.id):
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf[0].cpu().numpy())
                    tid = int(track_id.cpu().numpy())
                    box_list = [float(x1), float(y1), float(x2), float(y2)]
                    tracked.append({
                        "bbox": box_list,
                        "confidence": conf,
                        "track_id": tid,
                    })
                    primary_boxes.append(box_list)
                    
        # --- SECONDARY TARGETING (CASCADES) ---
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Heavy CPU operations: scale down logic 50% for speed
        scale = 0.5
        h, w = gray.shape
        small_gray = cv2.resize(gray, (int(w * scale), int(h * scale)))
        
        faces = self.face_cascade.detectMultiScale(small_gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
        profiles = self.profile_cascade.detectMultiScale(small_gray, scaleFactor=1.1, minNeighbors=5, minSize=(15, 15))
        
        all_secondary = []
        if len(faces) > 0: all_secondary.extend(faces)
        if len(profiles) > 0: all_secondary.extend(profiles)
        
        # Calculate Non-Maximum Suppression intersection
        for (x, y, w_box, h_box) in all_secondary:
            # Upscale coordinates back to original frame size
            rx, ry, rw, rh = x/scale, y/scale, w_box/scale, h_box/scale
            sec_box = [float(rx), float(ry), float(rx+rw), float(ry+rh)]
            
            # If completely isolated from standard tracked humans, it's an occlusion!
            if self._is_isolated(sec_box, primary_boxes, threshold=0.15):
                self.pseudo_id_counter += 1
                tracked.append({
                    "bbox": sec_box,
                    "confidence": 0.40,  # Fallback confidence
                    "track_id": self.pseudo_id_counter,
                })
                # Add to primary boxes to prevent overlapping cascade matches (frontal/profile) returning duplicate targets
                primary_boxes.append(sec_box)

        return tracked
