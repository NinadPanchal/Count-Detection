"""
Device Manager for CrowdWatch
Manages multiple external camera device connections with token-based auth.
"""

import hashlib
import hmac
import time
import uuid
import threading
from typing import Any

import numpy as np
from config import CAMERA_SECRET_KEY, CAMERA_MAX_DEVICES


class DeviceManager:
    """
    Thread-safe manager for external camera device connections.
    Tracks connected devices, stores latest frames, and handles auth tokens.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._devices: dict[str, dict[str, Any]] = {}
        # Pre-generate a session token on startup
        self._session_token = self._generate_session_token()

    # ---- Token Auth ----

    def _generate_session_token(self) -> str:
        """Generate a session token for QR code URLs."""
        raw = f"{CAMERA_SECRET_KEY}-{uuid.uuid4().hex[:8]}-{int(time.time())}"
        return hmac.new(
            CAMERA_SECRET_KEY.encode(),
            raw.encode(),
            hashlib.sha256,
        ).hexdigest()[:24]

    @property
    def session_token(self) -> str:
        return self._session_token

    def validate_token(self, token: str) -> bool:
        """Validate a connection token."""
        return hmac.compare_digest(token, self._session_token)

    # ---- Device Management ----

    def register(self, device_id: str, name: str = "") -> bool:
        """
        Register a new device. Returns True if successful, False if at capacity.
        """
        with self._lock:
            if len(self._devices) >= CAMERA_MAX_DEVICES and device_id not in self._devices:
                return False

            self._devices[device_id] = {
                "id": device_id,
                "name": name or f"Camera-{device_id[:6]}",
                "connected_at": time.time(),
                "last_frame_at": 0.0,
                "frame_count": 0,
                "latest_frame": None,          # np.ndarray (decoded OpenCV frame)
                "latest_frame_b64": None,      # base64 JPEG for quick relay
                "is_active": True,
            }
            print(f"[DeviceManager] Registered: {device_id} ({self._devices[device_id]['name']})")
            return True

    def unregister(self, device_id: str):
        """Remove a device from the active list."""
        with self._lock:
            if device_id in self._devices:
                name = self._devices[device_id]["name"]
                del self._devices[device_id]
                print(f"[DeviceManager] Unregistered: {device_id} ({name})")

    def update_frame(self, device_id: str, frame: np.ndarray, frame_b64: str | None = None):
        """Store the latest decoded frame for a device."""
        with self._lock:
            if device_id in self._devices:
                self._devices[device_id]["latest_frame"] = frame
                self._devices[device_id]["latest_frame_b64"] = frame_b64
                self._devices[device_id]["last_frame_at"] = time.time()
                self._devices[device_id]["frame_count"] += 1

    def get_device(self, device_id: str) -> dict | None:
        """Get device info (without the frame to avoid large copies)."""
        with self._lock:
            dev = self._devices.get(device_id)
            if dev is None:
                return None
            return {
                "id": dev["id"],
                "name": dev["name"],
                "connected_at": dev["connected_at"],
                "last_frame_at": dev["last_frame_at"],
                "frame_count": dev["frame_count"],
                "is_active": dev["is_active"],
            }

    def get_latest_frame(self, device_id: str) -> np.ndarray | None:
        """Get the latest decoded frame for a device."""
        with self._lock:
            dev = self._devices.get(device_id)
            if dev and dev["latest_frame"] is not None:
                return dev["latest_frame"]
            return None

    def list_devices(self) -> list[dict]:
        """List all connected devices (without frames)."""
        with self._lock:
            return [
                {
                    "id": dev["id"],
                    "name": dev["name"],
                    "connected_at": dev["connected_at"],
                    "last_frame_at": dev["last_frame_at"],
                    "frame_count": dev["frame_count"],
                    "is_active": dev["is_active"],
                    "uptime": round(time.time() - dev["connected_at"], 1),
                }
                for dev in self._devices.values()
            ]

    @property
    def device_count(self) -> int:
        with self._lock:
            return len(self._devices)
