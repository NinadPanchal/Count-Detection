"use client";
import { useState, useCallback } from "react";
import { playCriticalAlert, playWarningChime, playInfoClick } from "@/lib/audioEngine";

export function useAlertSound() {
  const [muted, setMuted] = useState(false);

  const playAlert = useCallback((severity: string) => {
    if (muted) return;
    if (severity === "critical" || severity === "dispatch") playCriticalAlert();
    else if (severity === "warning") playWarningChime();
    else playInfoClick();
  }, [muted]);

  return { muted, setMuted, playAlert };
}
