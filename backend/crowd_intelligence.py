"""
Crowd Intelligence Module for CrowdWatch
- HotspotDetector: spatial clustering to identify red zones
- MovementAnalyzer: velocity tracking to predict crowd flow
"""

import time
import math
from collections import defaultdict, deque
from config import (
    HOTSPOT_GRID_COLS, HOTSPOT_GRID_ROWS,
    HOTSPOT_THRESHOLD, HOTSPOT_ESCALATION_FRAMES,
    HOTSPOT_HISTORY_FRAMES, MOVEMENT_HISTORY_FRAMES,
    CONVERGENCE_THRESHOLD, MOVEMENT_SPEED_MIN,
)


class HotspotDetector:
    """
    Divides the frame into a grid and detects cells where crowd density
    exceeds safe thresholds. Tracks persistence to escalate hotspots
    into security dispatch events.
    """

    def __init__(self):
        self.cols = HOTSPOT_GRID_COLS
        self.rows = HOTSPOT_GRID_ROWS
        self.threshold = HOTSPOT_THRESHOLD
        self.escalation_frames = HOTSPOT_ESCALATION_FRAMES

        # Rolling count history per cell: (row, col) -> deque of counts
        self.cell_history: dict[tuple[int, int], deque] = defaultdict(
            lambda: deque(maxlen=HOTSPOT_HISTORY_FRAMES)
        )
        # Consecutive frames each cell has been a hotspot
        self.persistence: dict[tuple[int, int], int] = defaultdict(int)
        # Track which cells have already triggered dispatch
        self.dispatched: set[tuple[int, int]] = set()

    def analyze(
        self, detections: list[dict], frame_shape: tuple
    ) -> dict:
        """
        Analyze detections and return hotspot data.

        Returns:
        {
            "hotspots": [
                {
                    "cell": [row, col],
                    "coords": [x1, y1, x2, y2],            # pixel coords
                    "norm_coords": [nx1, ny1, nx2, ny2],    # normalized 0-1
                    "count": int,
                    "avg_count": float,
                    "severity": "warning" | "critical",
                    "persistent": bool,
                    "frames_active": int,
                }
            ],
            "dispatch_events": [
                {
                    "cell": [row, col],
                    "coords": [x1, y1, x2, y2],
                    "count": int,
                    "frames_active": int,
                    "timestamp": float,
                }
            ],
            "grid_density": [[int]]   # 2D array of counts per cell
        }
        """
        h, w = frame_shape[:2]
        cell_w = w / self.cols
        cell_h = h / self.rows

        # Count detections per cell
        grid = [[0] * self.cols for _ in range(self.rows)]
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            col = min(int(cx / cell_w), self.cols - 1)
            row = min(int(cy / cell_h), self.rows - 1)
            grid[row][col] += 1

        # Update history
        for r in range(self.rows):
            for c in range(self.cols):
                self.cell_history[(r, c)].append(grid[r][c])

        # Detect hotspots
        hotspots = []
        dispatch_events = []
        now = time.time()

        active_cells = set()

        for r in range(self.rows):
            for c in range(self.cols):
                history = self.cell_history[(r, c)]
                avg_count = sum(history) / len(history) if history else 0
                current_count = grid[r][c]

                if avg_count >= self.threshold:
                    active_cells.add((r, c))
                    self.persistence[(r, c)] += 1
                    frames_active = self.persistence[(r, c)]

                    # Pixel coords of this cell
                    px1 = int(c * cell_w)
                    py1 = int(r * cell_h)
                    px2 = int((c + 1) * cell_w)
                    py2 = int((r + 1) * cell_h)

                    severity = "critical" if avg_count >= self.threshold * 2 else "warning"

                    hotspot = {
                        "cell": [r, c],
                        "coords": [px1, py1, px2, py2],
                        "norm_coords": [
                            round(c / self.cols, 3),
                            round(r / self.rows, 3),
                            round((c + 1) / self.cols, 3),
                            round((r + 1) / self.rows, 3),
                        ],
                        "count": current_count,
                        "avg_count": round(avg_count, 1),
                        "severity": severity,
                        "persistent": frames_active >= self.escalation_frames,
                        "frames_active": frames_active,
                    }
                    hotspots.append(hotspot)

                    # Dispatch event if persistent and not already dispatched
                    if frames_active >= self.escalation_frames and (r, c) not in self.dispatched:
                        self.dispatched.add((r, c))
                        dispatch_events.append({
                            "cell": [r, c],
                            "coords": [px1, py1, px2, py2],
                            "count": current_count,
                            "frames_active": frames_active,
                            "timestamp": now,
                        })
                else:
                    # Reset persistence if cell drops below threshold
                    if self.persistence[(r, c)] > 0:
                        self.persistence[(r, c)] = max(0, self.persistence[(r, c)] - 2)
                    # Remove from dispatched if fully resolved
                    if self.persistence[(r, c)] == 0 and (r, c) in self.dispatched:
                        self.dispatched.discard((r, c))

        return {
            "hotspots": hotspots,
            "dispatch_events": dispatch_events,
            "grid_density": grid,
        }


class MovementAnalyzer:
    """
    Tracks per-person positions over time using track IDs to compute
    velocity vectors. Aggregates flow direction per grid cell and
    identifies convergence zones.
    """

    def __init__(self):
        # track_id -> deque of (cx, cy, timestamp)
        self.track_history: dict[int, deque] = defaultdict(
            lambda: deque(maxlen=MOVEMENT_HISTORY_FRAMES)
        )
        self.cols = HOTSPOT_GRID_COLS
        self.rows = HOTSPOT_GRID_ROWS

    def analyze(
        self, detections: list[dict], frame_shape: tuple
    ) -> dict:
        """
        Analyze movement trends from tracked detections.

        Returns:
        {
            "trends": [
                {
                    "zone_id": str,         # "cell-R-C"
                    "direction": str,       # "N", "NE", "E", "SE", "S", "SW", "W", "NW", "STATIC"
                    "avg_speed": float,     # pixels per frame
                    "people_moving": int,
                    "inflow": int,          # people moving INTO this cell
                }
            ],
            "convergence_zones": [
                {
                    "cell": [row, col],
                    "norm_coords": [nx1, ny1, nx2, ny2],
                    "inflow_count": int,
                    "directions_from": [str],
                }
            ],
            "overall_direction": str,       # dominant crowd movement direction
            "avg_speed": float,
        }
        """
        h, w = frame_shape[:2]
        cell_w = w / self.cols
        cell_h = h / self.rows
        now = time.time()

        # Update position history for each tracked person
        velocities = []  # (cx, cy, vx, vy) for each person with enough history
        for det in detections:
            track_id = det.get("track_id")
            if track_id is None:
                continue
            x1, y1, x2, y2 = det["bbox"]
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            self.track_history[track_id].append((cx, cy, now))

            # Compute velocity if we have at least 2 positions
            history = self.track_history[track_id]
            if len(history) >= 2:
                prev_cx, prev_cy, _ = history[-2]
                vx = cx - prev_cx
                vy = cy - prev_cy
                speed = math.sqrt(vx ** 2 + vy ** 2)
                if speed >= MOVEMENT_SPEED_MIN:
                    velocities.append((cx, cy, vx, vy, speed))

        # Clean up stale tracks (not seen in recent frames)
        active_ids = {det.get("track_id") for det in detections if det.get("track_id") is not None}
        stale_ids = [tid for tid in self.track_history if tid not in active_ids]
        for tid in stale_ids:
            # Keep for a few frames in case of occlusion
            if len(self.track_history[tid]) > 0:
                last_time = self.track_history[tid][-1][2]
                if now - last_time > 2.0:
                    del self.track_history[tid]

        # Aggregate velocities per cell
        cell_velocities: dict[tuple[int, int], list] = defaultdict(list)
        for cx, cy, vx, vy, speed in velocities:
            col = min(int(cx / cell_w), self.cols - 1)
            row = min(int(cy / cell_h), self.rows - 1)
            cell_velocities[(row, col)].append((vx, vy, speed))

        # Compute flow per cell and detect inflows to neighboring cells
        inflow_count: dict[tuple[int, int], int] = defaultdict(int)
        inflow_from: dict[tuple[int, int], list] = defaultdict(list)
        trends = []

        for (r, c), vels in cell_velocities.items():
            if not vels:
                continue

            avg_vx = sum(v[0] for v in vels) / len(vels)
            avg_vy = sum(v[1] for v in vels) / len(vels)
            avg_speed = sum(v[2] for v in vels) / len(vels)
            direction = self._velocity_to_direction(avg_vx, avg_vy)

            trends.append({
                "zone_id": f"cell-{r}-{c}",
                "cell": [r, c],
                "direction": direction,
                "avg_speed": round(avg_speed, 1),
                "people_moving": len(vels),
            })

            # Determine which neighboring cell people are flowing toward
            target = self._get_target_cell(r, c, direction)
            if target:
                tr, tc = target
                if 0 <= tr < self.rows and 0 <= tc < self.cols:
                    inflow_count[(tr, tc)] += len(vels)
                    inflow_from[(tr, tc)].append(direction)

        # Detect convergence zones
        convergence_zones = []
        for (r, c), count in inflow_count.items():
            if count >= CONVERGENCE_THRESHOLD:
                convergence_zones.append({
                    "cell": [r, c],
                    "norm_coords": [
                        round(c / self.cols, 3),
                        round(r / self.rows, 3),
                        round((c + 1) / self.cols, 3),
                        round((r + 1) / self.rows, 3),
                    ],
                    "inflow_count": count,
                    "directions_from": list(set(inflow_from[(r, c)])),
                })

        # Overall dominant direction
        if velocities:
            total_vx = sum(v[2] for v in velocities)
            total_vy = sum(v[3] for v in velocities)
            overall_dir = self._velocity_to_direction(total_vx, total_vy)
            overall_speed = sum(v[4] for v in velocities) / len(velocities)
        else:
            overall_dir = "STATIC"
            overall_speed = 0.0

        return {
            "trends": trends,
            "convergence_zones": convergence_zones,
            "overall_direction": overall_dir,
            "avg_speed": round(overall_speed, 1),
        }

    def _velocity_to_direction(self, vx: float, vy: float) -> str:
        """Convert velocity vector to compass direction."""
        speed = math.sqrt(vx ** 2 + vy ** 2)
        if speed < MOVEMENT_SPEED_MIN:
            return "STATIC"

        angle = math.degrees(math.atan2(-vy, vx))  # -vy because y increases downward
        if angle < 0:
            angle += 360

        directions = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"]
        index = int((angle + 22.5) / 45) % 8
        return directions[index]

    def _get_target_cell(
        self, row: int, col: int, direction: str
    ) -> tuple[int, int] | None:
        """Get the neighboring cell in the given direction."""
        offsets = {
            "N": (-1, 0), "NE": (-1, 1), "E": (0, 1), "SE": (1, 1),
            "S": (1, 0), "SW": (1, -1), "W": (0, -1), "NW": (-1, -1),
        }
        offset = offsets.get(direction)
        if offset is None:
            return None
        return (row + offset[0], col + offset[1])
