let audioCtx = null;
let soundEnabled = true;
const playedEvents = new Set();

const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
};

const beep = (frequency, duration, gain = 0.3, type = 'sine') => {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // silently ignore if audio context fails
  }
};

const playPattern = (pattern) => {
  if (!soundEnabled) return;
  let time = 0;
  for (const [freq, dur, gain, type] of pattern) {
    setTimeout(() => beep(freq, dur, gain, type), time * 1000);
    time += dur + 0.05;
  }
};

export const setSoundEnabled = (val) => { soundEnabled = val; };

export const isSoundEnabled = () => soundEnabled;

export const unlockAudio = () => {
  try {
    getCtx().resume();
  } catch {
    // ignore
  }
};

const SOUNDS = {
  WALKIN_SOUND: () => playPattern([[880, 0.12, 0.3], [1100, 0.12, 0.3]]),
  TAKEAWAY_SOUND: () => playPattern([[660, 0.12, 0.3], [880, 0.12, 0.3]]),
  QR_SOUND: () => playPattern([[1000, 0.1, 0.3], [1200, 0.1, 0.3], [1400, 0.15, 0.35]]),
  PICKUP_SOUND: () => playPattern([[800, 0.15, 0.3, 'square'], [1000, 0.15, 0.3, 'square']]),
  DELIVERY_SOUND: () => playPattern([[600, 0.1, 0.4, 'square'], [800, 0.1, 0.4, 'square'], [1000, 0.1, 0.4, 'square'], [1200, 0.2, 0.45, 'square']]),
  PAYMENT_SOUND: () => playPattern([[440, 0.15, 0.35, 'sawtooth'], [550, 0.15, 0.35, 'sawtooth'], [660, 0.2, 0.4, 'sawtooth']]),
  WAITER_SOUND: () => playPattern([[1200, 0.07, 0.4], [1200, 0.07, 0.4], [1200, 0.07, 0.4]]),
  NOTIFY_SOUND: () => playPattern([[880, 0.1, 0.25]])
};

export const playSound = (soundType, eventKey = null) => {
  if (!soundEnabled) return;
  if (eventKey) {
    if (playedEvents.has(eventKey)) return;
    playedEvents.add(eventKey);
    setTimeout(() => playedEvents.delete(eventKey), 30000);
  }
  const fn = SOUNDS[soundType];
  if (fn) fn();
};

export const playOrderSound = (order) => {
  const soundMap = {
    WALKIN_TABLE: 'WALKIN_SOUND',
    TAKEAWAY_COUNTER: 'TAKEAWAY_SOUND',
    QR_TABLE: 'QR_SOUND',
    ONLINE_PICKUP: 'PICKUP_SOUND',
    ONLINE_DELIVERY: 'DELIVERY_SOUND'
  };
  const key = `${order.orderNo}-${order.status}`;
  playSound(soundMap[order.source] || 'WALKIN_SOUND', key);
};
