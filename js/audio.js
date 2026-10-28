/**
 * Wedding sound: the "Our Soundtrack" cassette player and the temple bell
 * - Plays every song in songs/, in file-name order (01-..., 02-...). The
 *   list is written to js/songs.js by scripts/build-songs.mjs.
 * - The first song starts by itself as the guest walks through the temple
 *   gate. A song plays for at most SOUNDTRACK.maxPlaySeconds, fades out and
 *   stops; the next one waits in the player for the guest to press play.
 * - Songs stream only when played, so the page doesn't download them all.
 * - The temple bell (gate, RSVP) and the mixtape's chime are synthesised.
 */

// ===== EDIT HERE ============================================================
const SOUNDTRACK = {
  // Music volume when the page opens: 0 = silent, 1 = full (0.4 = 40%).
  // The player's volume slider starts here too. (The temple bell isn't affected.)
  volume: 0.25,
  // How long a song plays before it fades out and stops, in seconds.
  // 0 = play the whole song.
  maxPlaySeconds: 60,
  // How long that fade-out lasts, in seconds.
  fadeSeconds: 3
};
// ============================================================================

// "03-Mental-Manadhil-(Female).mp3" -> "Mental Manadhil (Female)"
const songTitle = (file) => file
  .replace(/\.[^.]+$/, '')
  .replace(/^\d+[\s._-]*/, '')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

// a moment of silence, played on the gate tap to unlock sound on phones
const SILENCE = 'data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YaAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

class WeddingAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentTrackIndex = 0;
    this.musicVolume = SOUNDTRACK.volume;
    this.masterGain = null;
    this.musicGain = null;
    this.onTrackChange = null;
    this.onPlayStateChange = null;
    this.resumeOnVisible = false;
    this.unlocked = false;
    this.autoStarted = false;
    this.userControlled = false;   // set by the player's buttons (js/main.js)
    this.tracks = (window.SONG_FILES || []).map((file) => ({
      title: songTitle(file),
      src: 'songs/' + encodeURIComponent(file)
    }));

    // one audio element plays the whole playlist
    this.player = new Audio();
    this.player.preload = 'none';
    this.loadedIndex = -1;
    this.trackGain = null;     // fade-out stage when routed through Web Audio
    this.fading = false;
    this.fadeTimer = null;
    this.failures = 0;

    this.player.addEventListener('timeupdate', () => this.checkPlayLimit());
    this.player.addEventListener('ended', () => { if (this.isPlaying) this.finishTrack(); });
    this.player.addEventListener('playing', () => { this.failures = 0; });
    this.player.addEventListener('error', () => {
      // a missing or broken file: skip it, but stop if every song fails
      if (!this.isPlaying) return;
      this.failures++;
      if (this.failures >= this.tracks.length) this.pause();
      else this.nextTrack();
    });
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

    // Route the songs through the volume control, so the slider and the fade
    // also work on iPhones (which ignore an audio element's own volume).
    // Not when opened straight from a file: browsers would play silence.
    if (location.protocol !== 'file:') {
      try {
        this.trackGain = this.ctx.createGain();
        this.ctx.createMediaElementSource(this.player).connect(this.trackGain);
        this.trackGain.connect(this.musicGain);
      } catch (e) {
        this.trackGain = null;
      }
    }
    this.applyVolume(1);
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
    if (!this.trackGain) this.player.volume = this.musicVolume;
  }

  // level of the current song (1 = full, 0 = faded out); `over` = seconds to get there
  applyVolume(level, over = 0) {
    if (this.trackGain) {
      const g = this.trackGain.gain, now = this.ctx.currentTime;
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      if (over > 0) g.linearRampToValueAtTime(level, now + over);
      else g.setValueAtTime(level, now);
      return;
    }
    // without Web Audio: step the element's own volume
    clearInterval(this.volumeTimer);
    const target = level * this.musicVolume;
    if (!(over > 0)) { this.player.volume = target; return; }
    const from = this.player.volume, started = performance.now();
    this.volumeTimer = setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / (over * 1000));
      this.player.volume = Math.max(0, Math.min(1, from + (target - from) * t));
      if (t >= 1) clearInterval(this.volumeTimer);
    }, 50);
  }

  toggleMusic() {
    this.ensureContext();
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  loadTrack() {
    this.cancelFade();
    this.applyVolume(1);
    this.player.src = this.getCurrentTrack().src;
    this.loadedIndex = this.currentTrackIndex;
  }

  // Called from the gate's bell tap. Phones only let a page start sound from
  // a tap, so a moment of silence is played now; the soundtrack can then
  // start by itself a moment later.
  unlock() {
    this.ensureContext();
    if (this.unlocked || this.isPlaying) return;
    this.unlocked = true;
    this.player.src = SILENCE;
    this.loadedIndex = -1;        // the next play() loads the real song
    const started = this.player.play();
    if (started && started.then) {
      started.then(() => { if (!this.isPlaying) this.player.pause(); }, () => { });
    }
  }

  // The first song starts by itself once, as the guest enters through the gate,
  // unless they have already used the player themselves.
  autoStart() {
    if (this.autoStarted || this.userControlled || this.isPlaying || !this.tracks.length) return;
    this.autoStarted = true;
    this.currentTrackIndex = 0;
    if (this.onTrackChange) this.onTrackChange(this.getCurrentTrack());
    this.play();
  }

  play() {
    this.ensureContext();
    if (this.isPlaying || !this.tracks.length) return;
    if (this.loadedIndex !== this.currentTrackIndex) this.loadTrack();
    this.isPlaying = true;
    const started = this.player.play();
    if (started && started.catch) {
      started.catch(() => {
        // refused (e.g. no tap yet) or the file is missing
        if (this.player.error) return;    // the error handler moves on
        this.isPlaying = false;
        if (this.onPlayStateChange) this.onPlayStateChange(false);
      });
    }
    if (this.onPlayStateChange) this.onPlayStateChange(true);
  }

  pause() {
    this.isPlaying = false;
    this.player.pause();
    this.cancelFade();
    if (this.onPlayStateChange) this.onPlayStateChange(false);
  }

  changeTrack(step) {
    if (!this.tracks.length) return;
    this.currentTrackIndex = (this.currentTrackIndex + step + this.tracks.length) % this.tracks.length;
    this.loadTrack();
    if (this.onTrackChange) this.onTrackChange(this.getCurrentTrack());
    if (this.isPlaying) {
      this.isPlaying = false;
      this.play();
    }
  }

  nextTrack() {
    this.changeTrack(1);
  }

  prevTrack() {
    this.changeTrack(-1);
  }

  getCurrentTrack() {
    return this.tracks[this.currentTrackIndex];
  }

  // Each song plays for SOUNDTRACK.maxPlaySeconds, fading out over the last
  // SOUNDTRACK.fadeSeconds, then stops.
  checkPlayLimit() {
    const max = SOUNDTRACK.maxPlaySeconds;
    if (!max || !this.isPlaying || this.fading) return;
    const left = max - this.player.currentTime;
    const fade = Math.min(SOUNDTRACK.fadeSeconds, max);
    if (left > fade) return;
    this.fading = true;
    const wait = Math.max(0, left);
    this.applyVolume(0, wait);
    this.fadeTimer = setTimeout(() => this.finishTrack(), wait * 1000);
  }

  // Time's up (or the song ended): stop, and have the next song waiting in
  // the player for when the guest presses play.
  finishTrack() {
    this.pause();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.loadTrack();
    if (this.onTrackChange) this.onTrackChange(this.getCurrentTrack());
  }

  // a pause or a track change mid-fade brings the volume back
  cancelFade() {
    clearTimeout(this.fadeTimer);
    if (this.fading) this.applyVolume(1);
    this.fading = false;
  }

  // a short soft note (used by the Sangeet Mixtape's "recorded" chime)
  synthesizeNote(freq, duration) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
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

window.weddingAudio = new WeddingAudioEngine();

// Pause while the page is hidden (e.g. switching apps on a phone) and resume on return.
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
