import time
import math
import collections
from datetime import datetime

class AnalyticsTracker:
    """
    In-memory time-series tracking engine for crowd analytics.
    Replaces static mock data by accumulating real streamed data.
    """
    def __init__(self):
        # Store data points as (timestamp, total_count, zone_counts, risk)
        self.history = collections.deque(maxlen=100000)
        self.start_time = time.time()
        
    def add_frame_data(self, total_count: int, zone_counts: list, risk_score: int):
        now = time.time()
        # To avoid blowing up memory and CPU doing rollups, we'll store max 1 sample per second.
        if len(self.history) == 0 or now - self.history[-1][0] >= 1.0:
            self.history.append((now, total_count, zone_counts, risk_score))

    def get_summary_stats(self):
        """Returns aggregated analytics data for the frontend."""
        if not self.history:
            return self._empty_stats()
            
        current = self.history[-1]
        peak_count = max(point[1] for point in self.history)
        avg_count = sum(point[1] for point in self.history) / len(self.history)
        
        # 1. Historical Array (last N samples downsampled for Sparkline)
        history_points = []
        step = max(1, len(self.history) // 50) # Target ~50 data points for the graph
        for i in range(0, len(self.history), step):
            pt = self.history[i]
            history_points.append({
                "time": datetime.fromtimestamp(pt[0]).strftime("%H:%M:%S"),
                "count": pt[1]
            })
            
        # 2. Zone Comparison (Avg over recorded time)
        num_points = len(self.history)
        zone_sums = [0]*len(current[2]) if current[2] else []
        for point in self.history:
            for z_idx, z_count in enumerate(point[2]):
                if z_idx < len(zone_sums):
                    zone_sums[z_idx] += z_count
                    
        zone_averages = [
            {"id": f"zone-{i+1}", "average": z_sum / num_points}
            for i, z_sum in enumerate(zone_sums)
        ]
        
        return {
            "uptime_seconds": time.time() - self.start_time,
            "peak_count": peak_count,
            "average_count": round(avg_count, 1),
            "history": history_points,
            "zone_averages": zone_averages,
        }
        
    def _empty_stats(self):
        return {
            "uptime_seconds": 0,
            "peak_count": 0,
            "average_count": 0,
            "history": [],
            "zone_averages": [],
        }
