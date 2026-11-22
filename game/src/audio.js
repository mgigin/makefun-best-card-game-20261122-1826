// Tiny synthesized sound effects with WebAudio: no files, nothing downloaded.
// The context is created on the first user gesture (browsers require it), and every
// sound is a short oscillator blip so the duel stays quiet in a screenshot run.

export function createAudio() {
  let ctx = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, seconds, type = 'sine', gainValue = 0.08, slideTo = null) {
    if (!ensure()) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + seconds);
  }

  return {
    unlock() {
      ensure();
    },
    play() {
      blip(520, 0.12, 'triangle', 0.07, 780);
    },
    spell() {
      blip(880, 0.22, 'sine', 0.07, 440);
    },
    attack() {
      blip(180, 0.16, 'square', 0.05, 90);
    },
    turn() {
      blip(660, 0.1, 'sine', 0.05);
    },
    win() {
      blip(523, 0.16, 'triangle', 0.08);
      setTimeout(() => blip(659, 0.16, 'triangle', 0.08), 140);
      setTimeout(() => blip(784, 0.3, 'triangle', 0.08), 280);
    },
    lose() {
      blip(392, 0.2, 'triangle', 0.08, 330);
      setTimeout(() => blip(262, 0.35, 'triangle', 0.08, 196), 180);
    },
  };
}
