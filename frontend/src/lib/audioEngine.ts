// Audio Engine for CrowdSense AI
// Web Audio API based alert sound system

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.15) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* ignore audio errors */ }
}

export function playCriticalAlert() {
  playTone(880, 0.15, "square", 0.12);
  setTimeout(() => playTone(660, 0.15, "square", 0.12), 200);
  setTimeout(() => playTone(880, 0.15, "square", 0.12), 400);
}

export function playWarningChime() {
  playTone(523, 0.3, "sine", 0.1);
  setTimeout(() => playTone(659, 0.3, "sine", 0.1), 150);
}

export function playInfoClick() {
  playTone(1200, 0.05, "sine", 0.05);
}

export function playSuccessSound() {
  playTone(523, 0.1, "sine", 0.08);
  setTimeout(() => playTone(659, 0.1, "sine", 0.08), 100);
  setTimeout(() => playTone(784, 0.2, "sine", 0.08), 200);
}

export function playEmergencySiren() {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.5);
  osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 1);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.2);
}

export function playSonarPing() {
  playTone(1500, 0.3, "sine", 0.06);
}

// Preview alarm sounds for settings page
export const ALARM_PRESETS = [
  { id: "classic", name: "Classic Siren", play: playCriticalAlert },
  { id: "chime", name: "Soft Chime", play: playWarningChime },
  { id: "emergency", name: "Emergency", play: playEmergencySiren },
  { id: "sonar", name: "Sonar Ping", play: playSonarPing },
  { id: "click", name: "Subtle Click", play: playInfoClick },
];
