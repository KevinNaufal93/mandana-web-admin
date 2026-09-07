"use client";

/**
 * Synthesized notification chime -- no audio asset needed, so there is
 * nothing to license or ship as a static file. Two short sine-wave tones
 * through the Web Audio API.
 *
 * Autoplay policy: browsers block audio until the page has seen at least
 * one real user gesture (click/keydown/etc). `unlockNotificationSound()`
 * should be called from any such gesture handler already firing in the app
 * (see notification-bell-dropdown.tsx) -- one gesture unlocks audio for the
 * rest of the tab's lifetime, it is not required per play call.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

export function unlockNotificationSound() {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") void ctx.resume();
}

export function playNotificationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const now = ctx.currentTime;
  for (const [i, freq] of [880, 1320].entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;

    const start = now + i * 0.09;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.25);
  }
}
