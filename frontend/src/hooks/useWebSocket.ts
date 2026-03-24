"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  alert?: {
    id: string;
    type: string;
    severity: string;
    message: string;
    count: number;
    time_str: string;
    timestamp: number;
  };
}

interface UseWebSocketReturn {
  frameData: FrameData | null;
  alerts: Array<FrameData["alert"]>;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

export function useWebSocket(url: string): UseWebSocketReturn {
  const [frameData, setFrameData] = useState<FrameData | null>(null);
  const [alerts, setAlerts] = useState<Array<FrameData["alert"]>>([]);
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

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data: FrameData = JSON.parse(event.data);
          setFrameData(data);

          if (data.alert) {
            setAlerts((prev) => {
              const newAlerts = [data.alert, ...prev].slice(0, 20);
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
