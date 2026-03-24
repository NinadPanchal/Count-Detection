"""
Density Estimation & Heatmap Generation
Calculates crowd density per zone and generates visual heatmaps
with red zone overlays for detected hotspots.
"""

import cv2
import numpy as np
import base64
from config import HEATMAP_GRID_SIZE, HEATMAP_BLUR_KERNEL, HEATMAP_ALPHA, ZONES


class DensityEstimator:
    def __init__(self):
        self.density_history = []  # rolling average
        self.max_history = 30

    def calculate_density(
        self, detections: list[dict], frame_shape: tuple
    ) -> dict:
        """
        Calculate crowd density metrics.
        
        Returns:
        {
            "total_count": int,
            "density_level": "safe" | "warning" | "critical",
            "zones": [{"id": str, "name": str, "count": int, "density_level": str}],
            "avg_density": float,  # people per unit area
        }
        """
        h, w = frame_shape[:2]
        total = len(detections)

        # Calculate per-zone density
        zone_stats = []
        for zone in ZONES:
            zx1 = int(zone["coords"][0] * w)
            zy1 = int(zone["coords"][1] * h)
            zx2 = int(zone["coords"][2] * w)
            zy2 = int(zone["coords"][3] * h)

            zone_count = 0
            for det in detections:
                bx1, by1, bx2, by2 = det["bbox"]
                cx = (bx1 + bx2) / 2
                cy = (by1 + by2) / 2
                if zx1 <= cx <= zx2 and zy1 <= cy <= zy2:
                    zone_count += 1

            zone_area = max((zx2 - zx1) * (zy2 - zy1), 1) / (w * h)
            zone_density = zone_count / max(zone_area, 0.01)

            if zone_count >= 12:
                zone_level = "critical"
            elif zone_count >= 6:
                zone_level = "warning"
            else:
                zone_level = "safe"

            zone_stats.append({
                "id": zone["id"],
                "name": zone["name"],
                "count": zone_count,
                "density": round(zone_density, 2),
                "density_level": zone_level,
            })

        # Overall density level
        from config import DENSITY_WARNING_THRESHOLD, DENSITY_CRITICAL_THRESHOLD
        if total >= DENSITY_CRITICAL_THRESHOLD:
            level = "critical"
        elif total >= DENSITY_WARNING_THRESHOLD:
            level = "warning"
        else:
            level = "safe"

        # Rolling average
        self.density_history.append(total)
        if len(self.density_history) > self.max_history:
            self.density_history.pop(0)
        avg = sum(self.density_history) / len(self.density_history)

        return {
            "total_count": total,
            "density_level": level,
            "zones": zone_stats,
            "avg_density": round(avg, 1),
            "peak_count": max(self.density_history),
        }

    def generate_heatmap(
        self,
        detections: list[dict],
        frame: np.ndarray,
        hotspots: list[dict] | None = None,
    ) -> str:
        """
        Generate a heatmap overlay from detection positions.
        Optionally draws red zone rectangles for detected hotspots.
        Returns base64-encoded JPEG image.
        """
        h, w = frame.shape[:2]
        heatmap = np.zeros((h, w), dtype=np.float32)

        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cx = int((x1 + x2) / 2)
            cy = int((y1 + y2) / 2)
            # Add Gaussian-like contribution at each person's position
            radius = int(max(x2 - x1, y2 - y1) * 0.8)
            cv2.circle(heatmap, (cx, cy), radius, 1.0, -1)

        # Apply Gaussian blur for smooth heatmap
        if np.max(heatmap) > 0:
            heatmap = cv2.GaussianBlur(heatmap, (HEATMAP_BLUR_KERNEL, HEATMAP_BLUR_KERNEL), 0)
            heatmap = heatmap / np.max(heatmap)  # normalize to 0-1

        # Convert to color heatmap
        heatmap_color = cv2.applyColorMap(
            (heatmap * 255).astype(np.uint8), cv2.COLORMAP_JET
        )

        # Create overlay
        overlay = cv2.addWeighted(frame, 1 - HEATMAP_ALPHA, heatmap_color, HEATMAP_ALPHA, 0)

        # Draw red zone rectangles for hotspots
        if hotspots:
            for hs in hotspots:
                x1, y1, x2, y2 = hs["coords"]
                severity = hs.get("severity", "warning")
                persistent = hs.get("persistent", False)

                if severity == "critical":
                    color = (0, 0, 255)     # red (BGR)
                    thickness = 3
                else:
                    color = (0, 140, 255)   # orange (BGR)
                    thickness = 2

                # Draw border rectangle
                cv2.rectangle(overlay, (x1, y1), (x2, y2), color, thickness)

                # Semi-transparent fill for critical/persistent hotspots
                if persistent or severity == "critical":
                    fill_overlay = overlay.copy()
                    cv2.rectangle(fill_overlay, (x1, y1), (x2, y2), color, -1)
                    overlay = cv2.addWeighted(overlay, 0.85, fill_overlay, 0.15, 0)

                # Label
                label = "RED ZONE" if severity == "critical" else "ALERT ZONE"
                if persistent:
                    label = "🚨 " + label
                label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(
                    overlay,
                    (x1, y1 - label_size[1] - 8),
                    (x1 + label_size[0] + 8, y1),
                    color, -1
                )
                cv2.putText(
                    overlay, label, (x1 + 4, y1 - 4),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1,
                )

        # Encode as base64 JPEG
        _, buffer = cv2.imencode(".jpg", overlay, [cv2.IMWRITE_JPEG_QUALITY, 75])
        return base64.b64encode(buffer).decode("utf-8")
