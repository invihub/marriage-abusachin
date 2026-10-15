/**
 * OK Kanmani & South Indian Wedding Auspicious Audio System
 * Uses Web Audio API for rich procedural synthesis:
 * - Auspicious Temple Bell Chimes
 * - Chennai Monsoon Rain & Thunder Generator
 * - Synthesized Romantic Melodies (Mental Manadhil, Aye Sinamika, Parandhu Sella Vaa, Mangala Vaathiyam)
 */

class WeddingAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isRainPlaying = false;
    this.currentTrackIndex = 0;
    this.rainVolume = 0.45;
    this.musicVolume = 0.65;
    this.rainNode = null;
    this.rainGain = null;
    this.masterGain = null;
    this.musicGain = null;
    this.analyser = null;
    this.melodyTimer = null;
    this.currentMelodyStep = 0;
    this.onTrackChange = null;
    this.onPlayStateChange = null;

    this.tracks = [
      {
        id: 'mental-manadhil',
        title: 'Mental Manadhil (Acoustic Synth)',
        film: 'O Kadhal Kanmani',
        tempo: 124,
        scale: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25], // C major
        // Catchy melodic phrase
        notes: [
          { pitch: 523.25, dur: 0.25 }, { pitch: 493.88, dur: 0.25 }, { pitch: 523.25, dur: 0.25 }, { pitch: 392.00, dur: 0.5 },
          { pitch: 329.63, dur: 0.25 }, { pitch: 349.23, dur: 0.25 }, { pitch: 392.00, dur: 0.5 }, { pitch: 0, dur: 0.25 },
          { pitch: 440.00, dur: 0.25 }, { pitch: 493.88, dur: 0.25 }, { pitch: 523.25, dur: 0.5 }, { pitch: 440.00, dur: 0.25 },
          { pitch: 392.00, dur: 0.5 }, { pitch: 349.23, dur: 0.25 }, { pitch: 329.63, dur: 0.5 }, { pitch: 261.63, dur: 0.5 }
        ]
      },
      {
        id: 'aye-sinamika',
        title: 'Aye Sinamika (Gentle Romance)',
        film: 'O Kadhal Kanmani',
        tempo: 88,
        scale: [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33], // D major
        notes: [
          { pitch: 440.00, dur: 0.5 }, { pitch: 493.88, dur: 0.5 }, { pitch: 554.37, dur: 0.75 }, { pitch: 493.88, dur: 0.25 },
          { pitch: 440.00, dur: 0.5 }, { pitch: 369.99, dur: 0.5 }, { pitch: 392.00, dur: 0.75 }, { pitch: 329.63, dur: 0.25 },
          { pitch: 293.66, dur: 0.75 }, { pitch: 369.99, dur: 0.5 }, { pitch: 440.00, dur: 1.0 }, { pitch: 0, dur: 0.5 }
        ]
      },
      {
        id: 'parandhu-sella-vaa',
        title: 'Parandhu Sella Vaa (Dreamy Ambient)',
        film: 'O Kadhal Kanmani',
        tempo: 96,
        notes: [
          { pitch: 523.25, dur: 0.75 }, { pitch: 587.33, dur: 0.5 }, { pitch: 659.25, dur: 0.75 }, { pitch: 523.25, dur: 0.5 },
          { pitch: 440.00, dur: 0.75 }, { pitch: 493.88, dur: 0.5 }, { pitch: 523.25, dur: 1.0 }, { pitch: 392.00, dur: 0.5 },
          { pitch: 329.63, dur: 0.75 }, { pitch: 392.00, dur: 0.5 }, { pitch: 440.00, dur: 1.2 }, { pitch: 0, dur: 0.5 }
        ]
      },
      {
        id: 'mangala-vaathiyam',
        title: 'Mangala Vaathiyam (Nadaswaram & Bells)',
        film: 'Auspicious South Indian Temple Vows',
        tempo: 104,
        notes: [
          { pitch: 587.33, dur: 0.35, isNadaswaram: true }, { pitch: 659.25, dur: 0.35, isNadaswaram: true }, { pitch: 739.99, dur: 0.5, isNadaswaram: true },
          { pitch: 880.00, dur: 0.6, isNadaswaram: true }, { pitch: 739.99, dur: 0.3, isNadaswaram: true }, { pitch: 659.25, dur: 0.4, isNadaswaram: true },
          { pitch: 587.33, dur: 0.8, isNadaswaram: true }, { pitch: 440.00, dur: 0.4, isNadaswaram: true }, { pitch: 587.33, dur: 1.0, isNadaswaram: true }
        ]
      }
    ];
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.setValueAtTime(this.rainVolume, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;

    this.musicGain.connect(this.masterGain);
    this.rainGain.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Authentic auspicious South Indian Temple Bell Chime
   * Generates a multi-harmonic brass bell strike with resonance
   */
  playTempleBell(frequency = 587.33) { // D5 base
    this.ensureContext();
    const now = this.ctx.currentTime;

    // Harmonic ratios for authentic bell resonance
    const partials = [
      { ratio: 1.0, gain: 0.6, decay: 3.2 },
      { ratio: 1.503, gain: 0.35, decay: 2.8 },
      { ratio: 2.0, gain: 0.25, decay: 2.2 },
      { ratio: 2.76, gain: 0.18, decay: 1.8 },
      { ratio: 3.48, gain: 0.12, decay: 1.4 },
      { ratio: 4.82, gain: 0.08, decay: 0.9 }
    ];

    partials.forEach(p => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency * p.ratio, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(p.gain, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + p.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });

    // Play a secondary lighter chime 180ms later for ceremonial double-gong
    setTimeout(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const highBell = this.ctx.createOscillator();
      const hGain = this.ctx.createGain();
      highBell.type = 'triangle';
      highBell.frequency.setValueAtTime(frequency * 2.02, t);
      hGain.gain.setValueAtTime(0.18, t);
      hGain.gain.exponentialRampToValueAtTime(0.00001, t + 2.4);
      highBell.connect(hGain);
      hGain.connect(this.masterGain);
      highBell.start(t);
      highBell.stop(t + 2.5);
    }, 180);
  }

  /**
   * Procedural Chennai Monsoon Rain Generator
   * Creates soothing rain on window sound with brown noise and modulated filtering
   */
  toggleRain() {
    this.ensureContext();
    if (this.isRainPlaying) {
      this.stopRain();
      return false;
    } else {
      this.startRain();
      return true;
    }
  }

  startRain() {
    this.ensureContext();
    if (this.isRainPlaying) return;

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    // Generate brown/pink noise suitable for rain
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain boost
    }

    this.rainNode = this.ctx.createBufferSource();
    this.rainNode.buffer = noiseBuffer;
    this.rainNode.loop = true;

    // Filters to simulate raindrops hitting window glass
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.rainNode.connect(highpass);
    highpass.connect(filter);
    filter.connect(this.rainGain);

    this.rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.rainGain.gain.linearRampToValueAtTime(this.rainVolume, this.ctx.currentTime + 1.2);

    this.rainNode.start();
    this.isRainPlaying = true;
  }

  stopRain() {
    if (!this.isRainPlaying || !this.rainNode) return;
    const now = this.ctx.currentTime;
    this.rainGain.gain.setValueAtTime(this.rainGain.gain.value, now);
    this.rainGain.gain.linearRampToValueAtTime(0.0001, now + 0.8);
    setTimeout(() => {
      if (this.rainNode) {
        try { this.rainNode.stop(); } catch(e){}
        this.rainNode.disconnect();
        this.rainNode = null;
      }
      this.isRainPlaying = false;
    }, 850);
  }

  setRainVolume(val) {
    this.rainVolume = Math.max(0, Math.min(1, val));
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setValueAtTime(this.rainVolume, this.ctx.currentTime);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = Math.max(0, Math.min(1, val));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  toggleMusic() {
    this.ensureContext();
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.ensureContext();
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playCurrentTrackNote();
    if (this.onPlayStateChange) this.onPlayStateChange(true);
  }

  pause() {
    this.isPlaying = false;
    if (this.melodyTimer) {
      clearTimeout(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.currentMelodyStep = 0;
    if (this.onTrackChange) this.onTrackChange(this.getCurrentTrack());
    if (this.isPlaying) {
      if (this.melodyTimer) clearTimeout(this.melodyTimer);
      this.playCurrentTrackNote();
    }
  }

  prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.currentMelodyStep = 0;
    if (this.onTrackChange) this.onTrackChange(this.getCurrentTrack());
    if (this.isPlaying) {
      if (this.melodyTimer) clearTimeout(this.melodyTimer);
      this.playCurrentTrackNote();
    }
  }

  getCurrentTrack() {
    return this.tracks[this.currentTrackIndex];
  }

  playCurrentTrackNote() {
    if (!this.isPlaying) return;
    const track = this.getCurrentTrack();
    const noteData = track.notes[this.currentMelodyStep % track.notes.length];

    if (noteData.pitch > 0) {
      this.synthesizeNote(noteData.pitch, noteData.dur * 0.9, noteData.isNadaswaram);
    }

    const durationMs = noteData.dur * (60000 / track.tempo);
    this.currentMelodyStep++;

    this.melodyTimer = setTimeout(() => {
      this.playCurrentTrackNote();
    }, durationMs);
  }

  synthesizeNote(freq, duration, isNadaswaram = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (isNadaswaram) {
      // Nadaswaram characteristic reed timbre (rich in odd harmonics with vibrato)
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc2.type = 'triangle';

      osc.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.004, now); // slight chorus warmth

      // Subtly glide frequency for gamaka
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.25);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 2.2, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);

    } else {
      // Warm romantic melodic synth (Rhodes / Flute hybrid)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now); // Octave overtone

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.26, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.musicGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration + 0.05);
      osc2.stop(now + duration + 0.05);
    }
  }

  getEqualizerData() {
    if (!this.analyser) return [0, 0, 0, 0, 0];
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return [
      data[1] || 0,
      data[4] || 0,
      data[8] || 0,
      data[14] || 0,
      data[20] || 0
    ];
  }
}

window.weddingAudio = new WeddingAudioEngine();
