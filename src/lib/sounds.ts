// Simple sound effects using Web Audio API — no external files needed
const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.15) {
  try {
    const ac = ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Audio not available
  }
}

/** Success chime — two rising notes */
export function playSuccess() {
  playTone(523, 0.15, "sine", 0.12);
  setTimeout(() => playTone(659, 0.2, "sine", 0.12), 120);
}

/** Send / submit whoosh */
export function playSend() {
  playTone(440, 0.1, "triangle", 0.1);
  setTimeout(() => playTone(587, 0.12, "triangle", 0.1), 80);
  setTimeout(() => playTone(784, 0.15, "triangle", 0.08), 160);
}

/** Notification pop */
export function playNotification() {
  playTone(880, 0.08, "sine", 0.1);
  setTimeout(() => playTone(1047, 0.12, "sine", 0.1), 60);
}

/** Error buzz */
export function playError() {
  playTone(200, 0.2, "sawtooth", 0.08);
}
