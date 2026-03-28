"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Hotspot {
  cell: [number, number];
  coords: [number, number, number, number];
  norm_coords: [number, number, number, number];
  count: number;
  avg_count: number;
  severity: "warning" | "critical";
  persistent: boolean;
  frames_active: number;
}

interface Detection {
  bbox: [number, number, number, number];
  confidence: number;
  track_id: number;
}

interface MovementTrend {
  zone_id: string;
  cell: [number, number];
  direction: string;
  avg_speed: number;
  people_moving: number;
}

interface ConvergenceZone {
  cell: [number, number];
  norm_coords: [number, number, number, number];
  inflow_count: number;
  directions_from: string[];
}

interface MovementData {
  trends: MovementTrend[];
  convergence_zones: ConvergenceZone[];
  overall_direction: string;
  avg_speed: number;
}

interface AlertData {
  id: string;
  type: string;
  severity: string;
  message: string;
  count?: number;
  time_str: string;
  timestamp: number;
}

interface FrameData {
  type: string;
  frame: string;
  heatmap: string;
  stats: {
    total_count: number;
    density_level: "safe" | "warning" | "critical";
    zones: Array<{
      id: string;
      name: string;
      count: number;
      density: number;
      density_level: string;
    }>;
    avg_density: number;
    peak_count: number;
    fps: number;
    timestamp: number;
    time_str: string;
  };
  hotspots?: Hotspot[];
  detections?: Detection[];
  grid_density?: number[][];
  movement?: MovementData;
  alert?: AlertData;
  extra_alerts?: AlertData[];
}

interface UseWebSocketReturn {
  frameData: FrameData | null;
  alerts: Array<AlertData | undefined>;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export type { Hotspot, Detection, MovementTrend, ConvergenceZone, MovementData, AlertData, FrameData };

export function useWebSocket(url: string): UseWebSocketReturn {
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [alerts, setAlerts] = useState<Array<AlertData | undefined>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        setError(null);
        console.log("[WebSocket] Connected");
      };

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return;
        try {
          // If the backend sends binary data (via send_bytes + orjson), it arrives as a Blob
          const textData = typeof event.data === "string" ? event.data : await (event.data as Blob).text();
          const data: FrameData = JSON.parse(textData);
          
          setFrameData((prevData) => {
            // Because we throttled metadata to save 60% bandwidth on intermediate frames,
            // we must merge the incoming lightweight frame with the last known metadata.
            const mergedData = {
              ...data,
              heatmap: data.heatmap ?? prevData?.heatmap,
              hotspots: data.hotspots ?? prevData?.hotspots,
              detections: data.detections ?? prevData?.detections,
              grid_density: data.grid_density ?? prevData?.grid_density,
              movement: data.movement ?? prevData?.movement,
            };

            // CRITICAL OPTIMIZATION: Bypassing React's render loop for video streaming
            // Dispatch raw payload via DOM so VideoFeed.tsx can draw canvas + image natively
            window.dispatchEvent(new CustomEvent("crowdFrame", { detail: mergedData }));

            // Now strip out the 100KB+ base64 blobs before sending to React State tree
            // This entirely prevents React from diffing massive UI updates 10 times a second
            const slicedData = { ...mergedData, frame: "", heatmap: "" };
            return slicedData as FrameData;
          });

          // Collect all alerts from this frame
          const frameAlerts: AlertData[] = [];
          if (data.alert) frameAlerts.push(data.alert);
          if (data.extra_alerts) frameAlerts.push(...data.extra_alerts);

          if (frameAlerts.length > 0) {
            setAlerts((prev) => {
              const newAlerts = [...frameAlerts, ...prev].slice(0, 50);
              return newAlerts;
            });
          }
        } catch (e) {
          console.error("[WebSocket] Parse error:", e);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        console.log("[WebSocket] Disconnected — reconnecting in 3s...");
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError("Connection error");
        ws.close();
      };
    } catch (e) {
      setError("Failed to connect");
    }
  }, [url]);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    connect();
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { frameData, alerts, isConnected, error, reconnect };
}
