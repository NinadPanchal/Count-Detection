import time
import collections
from datetime import datetime


class AnalyticsTracker:
    """
    In-memory time-series tracking engine for crowd analytics.
    Uses pre-computed running aggregates for O(1) reads instead of O(N) iteration.
    """
    def __init__(self):
        # Store data points as (timestamp, total_count, zone_counts, risk)
        self.history = collections.deque(maxlen=100000)
        self.start_time = time.time()
        
        # Pre-computed running aggregates (O(1) reads)
        self._total_sum = 0
        self._peak_count = 0
        self._sample_count = 0
        self._zone_sums: list[float] = []
        
    def add_frame_data(self, total_count: int, zone_counts: list, risk_score: int):
        now = time.time()
        # To avoid blowing up memory and CPU doing rollups, store max 1 sample per second.
        if len(self.history) == 0 or now - self.history[-1][0] >= 1.0:
            self.history.append((now, total_count, zone_counts, risk_score))
            
            # Update running aggregates in O(1)
            self._total_sum += total_count
            self._sample_count += 1
            if total_count > self._peak_count:
                self._peak_count = total_count
            
            # Grow zone_sums if needed
            while len(self._zone_sums) < len(zone_counts):
                self._zone_sums.append(0.0)
            for i, zc in enumerate(zone_counts):
                self._zone_sums[i] += zc

    def get_summary_stats(self):
        """Returns aggregated analytics data — O(1) for aggregates, O(50) for sparkline."""
        if self._sample_count == 0:
            return self._empty_stats()
        
        avg_count = self._total_sum / self._sample_count
        
        # Sparkline: downsample to ~50 points (only this part iterates)
        history_points = []
        step = max(1, len(self.history) // 50)
        for i in range(0, len(self.history), step):
            pt = self.history[i]
            history_points.append({
                "time": datetime.fromtimestamp(pt[0]).strftime("%H:%M:%S"),
                "count": pt[1]
            })
            
        # Zone averages from pre-computed sums
        zone_averages = [
            {"id": f"zone-{i+1}", "average": z_sum / self._sample_count}
            for i, z_sum in enumerate(self._zone_sums)
        ]
        
        return {
            "uptime_seconds": time.time() - self.start_time,
            "peak_count": self._peak_count,
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
