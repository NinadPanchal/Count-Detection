"""
Alert Engine for CrowdWatch
Generates and manages crowd density alerts, hotspot warnings,
convergence predictions, and security dispatch events.
"""

import time
from config import ALERT_COOLDOWN, DENSITY_WARNING_THRESHOLD, DENSITY_CRITICAL_THRESHOLD


class AlertEngine:
    def __init__(self):
        self.alerts: list[dict] = []
        self.last_alert_time: float = 0
        self.last_alert_level: str = "safe"
        self.last_hotspot_alert_time: float = 0
        self.last_convergence_alert_time: float = 0
        self.max_alerts = 50  # keep last 50 alerts

    def check_and_generate(self, density_data: dict) -> dict | None:
        """
        Check density data and generate alert if needed.
        Returns alert dict or None.
        """
        level = density_data["density_level"]
        count = density_data["total_count"]
        now = time.time()

        # Only alert on level changes or after cooldown
        should_alert = False
        if level != "safe":
            if level != self.last_alert_level:
                should_alert = True
            elif now - self.last_alert_time >= ALERT_COOLDOWN:
                should_alert = True

        # Clear alert when returning to safe
        if level == "safe" and self.last_alert_level != "safe":
            alert = {
                "id": f"alert-{int(now * 1000)}",
                "type": "resolved",
                "severity": "info",
                "message": "Crowd density returned to safe levels",
                "count": count,
                "timestamp": now,
                "time_str": time.strftime("%H:%M:%S"),
            }
            self._add_alert(alert)
            self.last_alert_level = "safe"
            return alert

        if not should_alert:
            return None

        # Generate alert
        if level == "critical":
            alert = {
                "id": f"alert-{int(now * 1000)}",
                "type": "critical",
                "severity": "critical",
                "message": f"CRITICAL: {count} people detected — overcrowding risk!",
                "count": count,
                "threshold": DENSITY_CRITICAL_THRESHOLD,
                "timestamp": now,
                "time_str": time.strftime("%H:%M:%S"),
            }
        elif level == "warning":
            alert = {
                "id": f"alert-{int(now * 1000)}",
                "type": "warning",
                "severity": "warning",
                "message": f"WARNING: {count} people detected — approaching capacity",
                "count": count,
                "threshold": DENSITY_WARNING_THRESHOLD,
                "timestamp": now,
                "time_str": time.strftime("%H:%M:%S"),
            }
        else:
            return None

        self._add_alert(alert)
        self.last_alert_time = now
        self.last_alert_level = level
        return alert

    def check_hotspots(self, hotspot_data: dict) -> list[dict]:
        """
        Generate alerts for hotspot / red zone events.
        Returns list of alert dicts.
        """
        now = time.time()
        alerts = []

        # Hotspot alerts (with cooldown)
        if hotspot_data["hotspots"] and now - self.last_hotspot_alert_time >= ALERT_COOLDOWN:
            critical_hotspots = [h for h in hotspot_data["hotspots"] if h["severity"] == "critical"]
            warning_hotspots = [h for h in hotspot_data["hotspots"] if h["severity"] == "warning"]

            if critical_hotspots:
                cells = ", ".join(
                    f"({h['cell'][0]},{h['cell'][1]})"
                    for h in critical_hotspots[:3]
                )
                alert = {
                    "id": f"hotspot-{int(now * 1000)}",
                    "type": "hotspot",
                    "severity": "critical",
                    "message": f"RED ZONE: {len(critical_hotspots)} critical hotspot(s) detected at grid {cells}",
                    "count": len(critical_hotspots),
                    "timestamp": now,
                    "time_str": time.strftime("%H:%M:%S"),
                }
                self._add_alert(alert)
                alerts.append(alert)
                self.last_hotspot_alert_time = now

            elif warning_hotspots:
                alert = {
                    "id": f"hotspot-{int(now * 1000)}",
                    "type": "hotspot",
                    "severity": "warning",
                    "message": f"HOTSPOT: {len(warning_hotspots)} area(s) with crowd clustering detected",
                    "count": len(warning_hotspots),
                    "timestamp": now,
                    "time_str": time.strftime("%H:%M:%S"),
                }
                self._add_alert(alert)
                alerts.append(alert)
                self.last_hotspot_alert_time = now

        # Dispatch alerts (always fire — these are critical one-time events)
        for event in hotspot_data.get("dispatch_events", []):
            cell = event["cell"]
            alert = {
                "id": f"dispatch-{int(now * 1000)}-{cell[0]}-{cell[1]}",
                "type": "dispatch",
                "severity": "critical",
                "message": (
                    f"🚨 SECURITY DISPATCH: Persistent crowd gathering at grid "
                    f"({cell[0]},{cell[1]}) — {event['count']} people for "
                    f"{event['frames_active']} frames. Security team notified."
                ),
                "count": event["count"],
                "cell": cell,
                "timestamp": now,
                "time_str": time.strftime("%H:%M:%S"),
            }
            self._add_alert(alert)
            alerts.append(alert)

        return alerts

    def check_convergence(self, movement_data: dict) -> list[dict]:
        """
        Generate alerts for crowd convergence predictions.
        Returns list of alert dicts.
        """
        now = time.time()
        alerts = []

        convergence_zones = movement_data.get("convergence_zones", [])
        if convergence_zones and now - self.last_convergence_alert_time >= ALERT_COOLDOWN:
            for zone in convergence_zones[:2]:  # max 2 convergence alerts at once
                cell = zone["cell"]
                directions = ", ".join(zone["directions_from"])
                alert = {
                    "id": f"converge-{int(now * 1000)}-{cell[0]}-{cell[1]}",
                    "type": "convergence",
                    "severity": "warning",
                    "message": (
                        f"TREND: {zone['inflow_count']} people converging toward "
                        f"grid ({cell[0]},{cell[1]}) from {directions}"
                    ),
                    "count": zone["inflow_count"],
                    "cell": cell,
                    "timestamp": now,
                    "time_str": time.strftime("%H:%M:%S"),
                }
                self._add_alert(alert)
                alerts.append(alert)
            self.last_convergence_alert_time = now

        return alerts

    def _add_alert(self, alert: dict):
        self.alerts.append(alert)
        if len(self.alerts) > self.max_alerts:
            self.alerts.pop(0)

    def get_recent_alerts(self, limit: int = 10) -> list[dict]:
        return list(reversed(self.alerts[-limit:]))
