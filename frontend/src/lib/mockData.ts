// Mock data generators for CrowdSense AI
// Provides realistic simulated data for Analytics, Predictions, and other pages

export function generateCrowdHistory(hours: number = 24): { time: string; count: number; density: number }[] {
  const data: { time: string; count: number; density: number }[] = [];
  const now = new Date();
  for (let i = hours * 60; i >= 0; i -= 5) {
    const t = new Date(now.getTime() - i * 60000);
    const hour = t.getHours();
    const base = hour >= 8 && hour <= 20 ? 20 + Math.sin((hour - 8) * Math.PI / 12) * 25 : 5;
    const noise = Math.random() * 10 - 5;
    const count = Math.max(0, Math.round(base + noise));
    data.push({
      time: t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      count,
      density: Math.round((count / 50) * 100),
    });
  }
  return data;
}

export function generateZoneComparison(): { zone: string; current: number; previous: number; capacity: number }[] {
  return [
    { zone: "Main Entrance", current: 28, previous: 22, capacity: 40 },
    { zone: "Center Area", current: 35, previous: 30, capacity: 50 },
    { zone: "Exit Area", current: 12, previous: 18, capacity: 30 },
    { zone: "Stage Area", current: 45, previous: 38, capacity: 60 },
    { zone: "Food Court", current: 20, previous: 25, capacity: 35 },
    { zone: "VIP Section", current: 8, previous: 10, capacity: 15 },
  ];
}

export function generateAlertBreakdown(): { label: string; value: number; color: string }[] {
  return [
    { label: "Critical", value: 12, color: "#FF4D4D" },
    { label: "Warning", value: 34, color: "#FFC857" },
    { label: "Info", value: 58, color: "#00FF9C" },
    { label: "Resolved", value: 45, color: "#7B61FF" },
  ];
}

export function generatePeakHours(): { hour: string; predicted: number; confidence: number }[] {
  return [
    { hour: "10:00", predicted: 25, confidence: 72 },
    { hour: "12:00", predicted: 42, confidence: 88 },
    { hour: "14:30", predicted: 48, confidence: 91 },
    { hour: "16:00", predicted: 38, confidence: 85 },
    { hour: "18:00", predicted: 52, confidence: 94 },
    { hour: "20:00", predicted: 30, confidence: 78 },
  ];
}

export function generateIncidents(): {
  id: string; time: string; severity: string; type: string;
  message: string; zone: string; resolved: boolean; timestamp: number;
}[] {
  const now = Date.now();
  return [
    { id: "INC-001", time: "09:15", severity: "critical", type: "overcrowding", message: "Critical density at Main Entrance — 48 people in Zone 1", zone: "Main Entrance", resolved: false, timestamp: now - 3600000 },
    { id: "INC-002", time: "09:32", severity: "warning", type: "convergence", message: "Crowd convergence detected near Stage Area", zone: "Stage Area", resolved: false, timestamp: now - 2700000 },
    { id: "INC-003", time: "10:05", severity: "critical", type: "hotspot", message: "Persistent hotspot at Grid (2,4) — dispatch recommended", zone: "Center Area", resolved: true, timestamp: now - 1800000 },
    { id: "INC-004", time: "10:22", severity: "warning", type: "speed", message: "Unusual crowd speed detected in Exit corridor", zone: "Exit Area", resolved: false, timestamp: now - 900000 },
    { id: "INC-005", time: "10:45", severity: "info", type: "density_change", message: "Density dropped below warning threshold at VIP Section", zone: "VIP Section", resolved: true, timestamp: now - 600000 },
    { id: "INC-006", time: "11:00", severity: "critical", type: "stampede_risk", message: "Elevated stampede risk score (72) at Food Court", zone: "Food Court", resolved: false, timestamp: now - 300000 },
    { id: "INC-007", time: "11:15", severity: "warning", type: "convergence", message: "Multiple crowd flows converging at Gate B", zone: "Main Entrance", resolved: false, timestamp: now - 120000 },
    { id: "INC-008", time: "11:28", severity: "info", type: "dispatch", message: "Security Unit 3 dispatched to Center Area", zone: "Center Area", resolved: true, timestamp: now - 60000 },
  ];
}

export function generateGuardPositions(): { id: string; name: string; zone: string; status: string; x: number; y: number }[] {
  return [
    { id: "G1", name: "Unit Alpha", zone: "Main Entrance", status: "active", x: 15, y: 25 },
    { id: "G2", name: "Unit Beta", zone: "Center Area", status: "active", x: 50, y: 50 },
    { id: "G3", name: "Unit Gamma", zone: "Exit Area", status: "dispatched", x: 80, y: 75 },
    { id: "G4", name: "Unit Delta", zone: "Stage Area", status: "active", x: 35, y: 80 },
    { id: "G5", name: "Unit Echo", zone: "Food Court", status: "break", x: 65, y: 30 },
  ];
}

export function generateFlowPredictions(): { from: string; to: string; volume: number; direction: string }[] {
  return [
    { from: "Main Entrance", to: "Center Area", volume: 15, direction: "SE" },
    { from: "Center Area", to: "Stage Area", volume: 20, direction: "S" },
    { from: "Food Court", to: "Exit Area", volume: 8, direction: "E" },
    { from: "Stage Area", to: "Exit Area", volume: 12, direction: "NE" },
    { from: "VIP Section", to: "Center Area", volume: 5, direction: "W" },
  ];
}

export function generateSparklineData(count: number = 30): number[] {
  const data: number[] = [];
  let val = 20 + Math.random() * 10;
  for (let i = 0; i < count; i++) {
    val += (Math.random() - 0.48) * 5;
    val = Math.max(0, Math.min(50, val));
    data.push(Math.round(val));
  }
  return data;
}

export const AI_SUGGESTIONS = [
  { priority: "high", text: "Redirect crowd from Gate A to Gate B — projected relief in 12 min", icon: "🔄" },
  { priority: "medium", text: "Deploy 2 additional officers to Center Zone", icon: "👮" },
  { priority: "high", text: "Open auxiliary exit near Food Court to ease pressure", icon: "🚪" },
  { priority: "low", text: "Schedule PA announcement for crowd spacing", icon: "📢" },
  { priority: "medium", text: "Activate overflow parking to reduce incoming flow", icon: "🅿️" },
];

export const EVACUATION_ROUTES = [
  { id: "R1", name: "Primary Exit Route", zones: ["Center Area", "Exit Area"], estimatedTime: "4 min", capacity: 200, status: "clear" },
  { id: "R2", name: "Emergency Side Exit", zones: ["Stage Area", "Side Gate"], estimatedTime: "6 min", capacity: 100, status: "clear" },
  { id: "R3", name: "North Corridor", zones: ["VIP Section", "North Gate"], estimatedTime: "3 min", capacity: 80, status: "congested" },
  { id: "R4", name: "Service Tunnel", zones: ["Food Court", "Rear Exit"], estimatedTime: "8 min", capacity: 50, status: "clear" },
];
