// Web Audio API realistic page flip sound generator
let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Load user preference for sound
try {
  const saved = localStorage.getItem('vatsagulma_epaper_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
} catch {
  // ignore
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem('vatsagulma_epaper_sound_enabled', enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

/**
 * Play authentic physical newspaper / book page turn audio
 */
export function playPageFlipSound(): void {
  if (!soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // 1. Noise buffer for the paper rustle / swoosh
    const bufferSize = audioCtx.sampleRate * 0.15; // 150ms
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      // Pink / shaped random noise
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;

    // 2. Bandpass Filter simulating paper acoustic frequency sweep
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800, now);
    bandpass.frequency.exponentialRampToValueAtTime(2400, now + 0.06);
    bandpass.frequency.exponentialRampToValueAtTime(600, now + 0.14);
    bandpass.Q.setValueAtTime(1.8, now);

    // 3. Gain Envelope
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.28, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noiseSource.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.15);

    // 4. Subtle low-frequency paper slap / landing
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now + 0.04);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.setValueAtTime(0.12, now + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);

    osc.start(now + 0.03);
    osc.stop(now + 0.13);
  } catch (err) {
    // Audio contexts might be blocked until first user interaction
    console.debug('Page flip audio skipped:', err);
  }
}
