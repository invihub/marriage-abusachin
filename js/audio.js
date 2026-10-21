/**
 * Auspicious South Indian & OK Kanmani Synthesizer Audio System
 * Plays authentic melodic chiptune/lounge synthesizers:
 * - Mental Manadhil (O Kadhal Kanmani)
 * - Aye Sinamika (O Kadhal Kanmani)
 * - Parandhu Sella Vaa (O Kadhal Kanmani)
 * - Mangala Vaathiyam (Temple Nadaswaram & Chimes)
 * - Auspicious Temple Bell Chime
 */

class WeddingAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentTrackIndex = 0;
    this.musicVolume = 0.7;
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
        title: 'Mental Manadhil (Acoustic Soul)',
        film: 'O Kadhal Kanmani',
        tempo: 124,
        scale: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25],
        notes: [
          { pitch: 523.25, dur: 0.25 }, { pitch: 493.88, dur: 0.25 }, { pitch: 523.25, dur: 0.25 }, { pitch: 392.00, dur: 0.5 },
          { pitch: 329.63, dur: 0.25 }, { pitch: 349.23, dur: 0.25 }, { pitch: 392.00, dur: 0.5 }, { pitch: 0, dur: 0.25 },
          { pitch: 440.00, dur: 0.25 }, { pitch: 493.88, dur: 0.25 }, { pitch: 523.25, dur: 0.5 }, { pitch: 440.00, dur: 0.25 },
          { pitch: 392.00, dur: 0.5 }, { pitch: 349.23, dur: 0.25 }, { pitch: 329.63, dur: 0.5 }, { pitch: 261.63, dur: 0.5 }
        ]
      },
      {
        id: 'aye-sinamika',
        title: 'Aye Sinamika (Gentle Sunset)',
        film: 'O Kadhal Kanmani',
        tempo: 88,
        notes: [
          { pitch: 440.00, dur: 0.5 }, { pitch: 493.88, dur: 0.5 }, { pitch: 554.37, dur: 0.75 }, { pitch: 493.88, dur: 0.25 },
          { pitch: 440.00, dur: 0.5 }, { pitch: 369.99, dur: 0.5 }, { pitch: 392.00, dur: 0.75 }, { pitch: 329.63, dur: 0.25 },
          { pitch: 293.66, dur: 0.75 }, { pitch: 369.99, dur: 0.5 }, { pitch: 440.00, dur: 1.0 }, { pitch: 0, dur: 0.5 }
        ]
      },
      {
        id: 'parandhu-sella-vaa',
        title: 'Parandhu Sella Vaa (Dreamy)',
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
        title: 'Mangala Vaathiyam (Temple Nadaswaram)',
        film: 'Sacred Wedding Ragas',
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

    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  playTempleBell(frequency = 587.33) {
    this.ensureContext();
    const now = this.ctx.currentTime;
    const partials = [
      { ratio: 1.0, gain: 0.55, decay: 3.2 },
      { ratio: 1.503, gain: 0.32, decay: 2.8 },
      { ratio: 2.0, gain: 0.22, decay: 2.2 },
      { ratio: 2.76, gain: 0.16, decay: 1.8 }
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
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 1.004, now);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 2.2, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
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
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.03);
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
}

window.weddingAudio = new WeddingAudioEngine();

// Background tabs throttle timers, which would make the melody stutter;
// pause while hidden (e.g. switching apps on a phone) and resume on return.
document.addEventListener('visibilitychange', () => {
  const audio = window.weddingAudio;
  if (document.hidden) {
    audio.resumeOnVisible = audio.isPlaying;
    if (audio.isPlaying) audio.pause();
  } else if (audio.resumeOnVisible) {
    audio.resumeOnVisible = false;
    audio.play();
  }
});
