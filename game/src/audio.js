// Bayang di Galeri — synthesized sound only (WebAudio, no audio files).
// Footsteps pan and fade with the nearest guard, so the player hears where
// the patrol is; alarm sting, pickup chime, win jingle and caught sting are
// short oscillator phrases.
export function createAudioEngine() {
  let ctx = null;
  let master = null;
  let muted = false;
  let ambient = null;

  function ensure() {
    if (ctx) return ctx;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone(freq, seconds, type, volume, when = 0, slideTo = null) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + seconds);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noiseBurst(seconds, volume, pan, lowpass) {
    if (!ensure() || muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(master);
    } else {
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
    }
    source.start();
  }

  return {
    resume() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },

    // A guard's step: louder and panned by how near and which side it is.
    playFootstep(player, guard) {
      const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
      if (dist > 320) return;
      const volume = 0.22 * (1 - dist / 320);
      const pan = Math.max(-1, Math.min(1, (guard.x - player.x) / 320));
      noiseBurst(0.07, volume, pan, 900);
    },

    playAlertSting() {
      tone(392, 0.22, 'sawtooth', 0.16, 0);
      tone(587, 0.4, 'sawtooth', 0.18, 0.18, 740);
    },

    playPickupChime() {
      tone(880, 0.14, 'sine', 0.2, 0);
      tone(1318, 0.24, 'sine', 0.18, 0.09);
    },

    playWinJingle() {
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.3, 'triangle', 0.2, i * 0.13));
    },

    playCaughtSting() {
      tone(220, 0.5, 'sawtooth', 0.2, 0, 110);
      tone(165, 0.6, 'sawtooth', 0.16, 0.1, 82);
    },

    playPebbleTing() {
      tone(1567, 0.18, 'sine', 0.16, 0);
      tone(2093, 0.22, 'sine', 0.1, 0.05);
    },

    startAmbient() {
      if (!ensure() || ambient || muted) return;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55;
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.015;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      lfo.start();
      ambient = { osc, lfo };
    },

    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },

    isMuted() {
      return muted;
    },
  };
}
