// Synthesized sound: no audio files. Muted by default; the context is
// only created inside a user gesture (the mute toggle), as browsers require.
// Music is a tiny 3-channel tracker scheduled ahead on the audio clock.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function freq(n) {
  const m = /^([A-G]#?)(\d)$/.exec(n);
  if (!m) return 0;
  return 440 * Math.pow(2, (NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
}
const steps = (s) => s.replace(/\|/g, ' ').trim().split(/\s+/);

// original loops, 8 steps per bar
const SONGS = {
  map: {
    bpm: 132,
    lead: steps('E5 . G5 C6 . B5 G5 . | A5 . E5 . C5 . E5 . | F5 . A5 C6 . A5 F5 . | G5 . B5 . D6 . B5 .'),
    bass: steps('C3 . G3 . C3 . G3 . | A2 . E3 . A2 . E3 . | F2 . C3 . F2 . C3 . | G2 . D3 . G2 . B2 .'),
    drums: steps('k . h . s . h . | k . h . s . h h | k . h . s . h . | k . h k s . s s'),
  },
  lab: {
    bpm: 108,
    lead: steps('A4 C5 E5 A5 E5 C5 A4 C5 | F4 A4 C5 F5 C5 A4 F4 A4 | D4 F4 A4 D5 A4 F4 D4 F4 | E4 G#4 B4 E5 B4 G#4 E4 G#4'),
    bass: steps('A2 . . . A2 . E3 . | F2 . . . F2 . C3 . | D3 . . . D3 . A2 . | E2 . . . E2 . G#2 .'),
    drums: steps('k . h h s . h . | k . h h s . h k | k . h h s . h . | k k h h s . s h'),
  },
};

export function createAudio() {
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = true, song = null, songName = null, step = 0, nextTime = 0, timer = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      master = ctx.createGain(); master.gain.value = 0.55;
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7;
      musicBus = ctx.createGain(); musicBus.gain.value = 0.22;
      sfxBus.connect(master); musicBus.connect(master);
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(bus, type, f0, f1, dur, vol, at) {
    const t = at || ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(bus, dur, vol, cutoff, at) {
    const t = at || ctx.currentTime;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const seq = (notes, type, gap, dur, vol) => notes.forEach((n, i) =>
    tone(sfxBus, type, n, n, dur, vol, ctx.currentTime + i * gap));

  const SFX = {
    jump: () => tone(sfxBus, 'square', 220, 640, 0.1, 0.12),
    bit: () => seq([988, 1319], 'triangle', 0.05, 0.12, 0.22),
    bump: () => { noise(sfxBus, 0.06, 0.25, 700); tone(sfxBus, 'square', 120, 80, 0.08, 0.12); },
    fact: () => seq([523, 659, 784, 1047, 1319], 'square', 0.06, 0.1, 0.1),
    stomp: () => { noise(sfxBus, 0.08, 0.3, 1200); tone(sfxBus, 'square', 400, 90, 0.12, 0.12); },
    hurt: () => tone(sfxBus, 'sawtooth', 520, 160, 0.25, 0.1),
    die: () => seq([660, 520, 415, 330, 262, 196], 'square', 0.09, 0.12, 0.11),
    oneup: () => seq([659, 784, 1319, 1047, 1175, 1568], 'triangle', 0.07, 0.12, 0.2),
    coffee: () => seq([392, 523, 659, 784], 'triangle', 0.05, 0.1, 0.2),
    portIn: () => tone(sfxBus, 'square', 600, 120, 0.35, 0.09),
    portOut: () => tone(sfxBus, 'square', 120, 600, 0.3, 0.09),
    checkpoint: () => seq([784, 1175], 'square', 0.08, 0.14, 0.1),
    clear: () => seq([523, 659, 784, 1047, 784, 1047, 1319, 1568], 'square', 0.09, 0.16, 0.1),
    tick: () => tone(sfxBus, 'square', 880, 880, 0.03, 0.06),
    lock: () => tone(sfxBus, 'square', 160, 110, 0.12, 0.12),
    break: () => noise(sfxBus, 0.18, 0.35, 2400),
    build: () => tone(sfxBus, 'triangle', 330, 990, 0.25, 0.12),
  };

  function schedule() {
    if (!song || !ctx) return;
    const spb = 60 / song.bpm / 2;              // eighth notes
    while (nextTime < ctx.currentTime + 0.12) {
      const n = song.lead.length;
      const i = step % n;
      const l = song.lead[i], b = song.bass[i % song.bass.length], d = song.drums[i % song.drums.length];
      if (l !== '.') tone(musicBus, 'square', freq(l), freq(l), spb * 0.9, 0.09, nextTime);
      if (b !== '.') tone(musicBus, 'triangle', freq(b), freq(b), spb * 1.6, 0.2, nextTime);
      if (d === 'k') { tone(musicBus, 'sine', 150, 45, 0.12, 0.35, nextTime); }
      else if (d === 's') noise(musicBus, 0.1, 0.18, 3000, nextTime);
      else if (d === 'h') noise(musicBus, 0.03, 0.07, 9000, nextTime);
      nextTime += spb;
      step++;
    }
  }

  function startSong() {
    clearInterval(timer);
    if (muted || !songName || !ensure()) return;
    song = SONGS[songName];
    step = 0;
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(schedule, 25);
  }

  return {
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      if (!m) { if (ensure()) startSong(); }
      else { clearInterval(timer); song = null; }
    },
    play(name) {
      if (muted || !ctx) return;
      const f = SFX[name];
      if (f) f();
    },
    music(name) {
      if (name === songName) return;
      songName = name;
      startSong();
    },
    // call from a user gesture: wakes the context if sound is on
    unlock() { if (!muted && ensure() && !song && songName) startSong(); },
    duck(on) { if (musicBus) musicBus.gain.value = on ? 0.07 : 0.22; },
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && !muted && ctx.state === 'suspended') ctx.resume(); },
  };
}
