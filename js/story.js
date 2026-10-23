/**
 * Our Story (story.html): the invitation film, played by scrolling
 *
 * How it works:
 * - Scrolling: the video is cut into still frames (story/frames/*.webp,
 *   12 per second, made by scripts/build-story-frames.py). The page is a tall
 *   empty spacer under a fixed <canvas>; the scroll position picks a moment in
 *   the film and that frame is drawn. Scrubbing a real <video> by scroll is
 *   jerky on iPhones; still frames are not.
 * - The picture eases toward the scroll position (smoothing), so a jumpy
 *   mouse wheel or a fast flick still plays as continuous motion.
 * - Between two frames it cross-fades (blend), so 12 frames a second look
 *   smooth even when scrolling slowly.
 * - Frames download in order of need: first one frame every 2 seconds of the
 *   whole film (so any scroll position shows a picture at once), then every
 *   frame around where the guest is, ahead of them first.
 * - Playing: "Play with music" plays the real video (story/film.mp4, full
 *   30 frames a second, with its sound) over the canvas, from wherever the
 *   guest is. The page scrolls along with it, so the progress line and
 *   chapters follow. Scrolling or tapping the film pauses it and hands back
 *   to the frames at the same moment.
 * - story.html#play (the film card in the gallery) starts playing at once.
 */

const STORY_SETTINGS = {
  // Seconds of film per screen-height of scrolling. Lower = the film moves
  // slower for the same swipe (and the page gets longer).
  secondsPerScreen: 2,
  // How long the picture takes to catch up with the scroll, in seconds
  // (0 = jumps straight there).
  smoothing: 0.12,
  // Cross-fade between neighbouring frames (false = whole frames only).
  blend: true,
  // Frames downloading at the same time (fewer while the video plays, so
  // the video gets the bandwidth).
  parallelLoads: 6,
  parallelLoadsWhilePlaying: 2,
  // "Open the invitation" appears this many seconds before the end.
  endCardSeconds: 2.6
};

// Chapter names under the film; t = the second of the film where each begins.
// Tapping near a dot on the progress line jumps to that chapter.
const STORY_CHAPTERS = [
  { t: 0, title: 'Story of Abu & Sachin' },
  { t: 2.5, title: 'Chennai & Thoothukudi' },
  { t: 12.5, title: 'KCG College · 2014' },
  { t: 24, title: 'Fell in love with a city boy' },
  { t: 32.5, title: 'A new country, a thousand dreams' },
  { t: 42.5, title: 'Countless video calls' },
  { t: 50, title: 'Together in Canada' },
  { t: 67, title: 'Building our forever' },
  { t: 80.5, title: 'Save the date' },
  { t: 90.5, title: 'Wedding · 6 December 2026' },
  { t: 107, title: 'Reception · 11 December 2026' },
  { t: 111.5, title: 'With your blessings' }
];

const FRAME_IDLE = 0;
const FRAME_LOADING = 1;
const FRAME_READY = 2;
const FRAME_FAILED = 3;

class StoryFilm {
  constructor(film) {
    this.film = film;
    this.fps = film.fps;
    this.frameCount = film.filmFrames;
    this.duration = film.filmFrames / film.fps;
    this.files = film.starts.length;

    this.stage = document.querySelector('.story-stage');
    this.screen = document.getElementById('story-screen');
    this.canvas = document.getElementById('story-frame');
    this.video = document.getElementById('story-video');
    this.backdrop = document.getElementById('story-backdrop');
    this.playBtn = document.getElementById('story-play');
    this.soundBtn = document.getElementById('story-sound');
    this.status = document.getElementById('story-status');
    this.statusText = this.status.querySelector('.story-status-text');
    this.statusArrow = this.status.querySelector('.story-arrow');
    this.chapterEl = document.getElementById('story-chapter');
    this.rail = document.getElementById('story-rail');
    this.railTrack = this.rail.querySelector('.story-rail-track');
    this.railFill = document.getElementById('story-rail-fill');
    this.endCard = document.getElementById('story-end');
    this.replayBtn = document.getElementById('story-replay');

    // film frame -> stored file (a still moment shares one file)
    this.fileOf = new Uint16Array(this.frameCount);
    film.starts.forEach((start, k) => {
      const end = k + 1 < this.files ? film.starts[k + 1] : this.frameCount;
      this.fileOf.fill(k, start, end);
    });

    // Download order: frames on a 2 s grid first (level 0), then 1 s,
    // 0.5 s, every 2nd frame, and the rest (level 4)
    const grid = [2 * this.fps, this.fps, Math.round(this.fps / 2), 2];
    this.level = film.starts.map(start => {
      const i = grid.findIndex(step => start % step === 0);
      return i < 0 ? grid.length : i;
    });
    this.gridCount = this.level.filter(l => l === 0).length;
    this.gridDone = 0;

    this.images = new Array(this.files).fill(null);
    this.state = new Uint8Array(this.files);
    this.retries = new Uint8Array(this.files);
    this.active = 0;
    // Data Saver on: skip every other frame (about half the download)
    this.saveData = !!(navigator.connection && navigator.connection.saveData);

    this.smoothing = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0 : STORY_SETTINGS.smoothing;
    this.shown = 0;      // film time on screen
    this.target = 0;     // film time the scroll position asks for
    this.scrollable = 1;
    this.raf = 0;
    this.lastTick = 0;
    this.drawnKey = '';
    this.backdropFile = -1;
    this.backdropAt = 0;
    this.fallback = false;

    this.playing = false;
    this.playFrom = 0;
    this.playY = 0;
    this.videoLoaded = false;
    this.videoVisible = false;
    this.videoWaiting = false;

    this.chapter = -1;
    this.lastProgress = -1;
    this.lastSecond = -1;
    this.atEnd = false;
    this.started = false;

    this.init();
  }

  init() {
    document.documentElement.style.setProperty('--story-screens',
      (this.duration / STORY_SETTINGS.secondsPerScreen).toFixed(2));
    this.rail.setAttribute('aria-valuemax', Math.round(this.duration));

    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.bctx = this.backdrop.getContext('2d', { alpha: false });

    this.buildTicks();
    this.initRail();

    window.addEventListener('scroll', () => this.queueFrame(), { passive: true });
    window.addEventListener('resize', () => {
      this.resize();
      this.queueFrame();
    }, { passive: true });

    // Scrolling hands control back from the video to the frames
    const interrupt = (e) => {
      if (e.target.closest && e.target.closest('.story-top, .story-bar')) return;
      this.stop();
    };
    window.addEventListener('wheel', interrupt, { passive: true });
    window.addEventListener('touchmove', interrupt, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) interrupt(e);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
    });

    // Tapping the playing film: sound on if it's muted, otherwise pause
    this.stage.addEventListener('click', () => {
      if (!this.playing) return;
      if (this.video.muted) this.soundOn();
      else this.stop();
    });

    this.playBtn.addEventListener('click', () => (this.playing ? this.stop() : this.play()));
    this.soundBtn.addEventListener('click', () => this.soundOn());
    this.replayBtn.addEventListener('click', () => {
      this.stop();
      this.seek(0);
    });

    this.resize();
    // a reload keeps its place in the film
    this.target = this.shown = this.scrollTime();
    this.updateStatus();
    this.pump();
    this.queueFrame();

    // Opened from the gallery's film card: start playing straight away
    if (location.hash === '#play') {
      history.replaceState(null, '', location.pathname + location.search);
      this.play();
    }
  }

  /* ---------------------------------------------------------------- layout */

  resize() {
    const aspect = this.film.width / this.film.height;
    const w = Math.floor(Math.min(this.stage.clientWidth, this.stage.clientHeight * aspect));
    const h = Math.floor(w / aspect);
    this.screen.style.width = `${w}px`;
    this.screen.style.height = `${h}px`;

    // 2x is plenty: the frames themselves are 540 px wide
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
    }
    this.drawnKey = '';
    this.scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  scrollTime() {
    return Math.max(0, Math.min(1, window.scrollY / this.scrollable)) * this.duration;
  }

  timeToY(t) {
    return (t / this.duration) * this.scrollable;
  }

  seek(t) {
    window.scrollTo(0, Math.round(this.timeToY(Math.max(0, Math.min(this.duration, t)))));
    this.queueFrame();
  }

  /* --------------------------------------------------------------- loading */

  pickNext() {
    const now = this.target;
    const here = this.fileOf[this.frameAt(now)];
    let best = -1;
    let bestScore = Infinity;

    for (let k = 0; k < this.files; k++) {
      if (this.state[k] !== FRAME_IDLE) continue;
      const level = this.level[k];
      if (this.saveData && level === 4) continue;

      const dt = this.film.starts[k] / this.fps - now;
      const dist = dt >= 0 ? dt : -dt * 2.5; // what's ahead matters more
      const score = k === here ? -1
        : level === 0 ? dist / 1000          // the 2 s grid over the whole film
          : 1000 + dist + level * 1.5;       // then detail, nearest first
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    return best;
  }

  pump() {
    const limit = this.playing ? STORY_SETTINGS.parallelLoadsWhilePlaying : STORY_SETTINGS.parallelLoads;
    while (this.active < limit) {
      const k = this.pickNext();
      if (k < 0) return;
      this.load(k);
    }
  }

  load(k) {
    this.state[k] = FRAME_LOADING;
    this.active++;
    const img = new Image();
    img.decoding = 'async';
    img.src = `story/frames/${String(k).padStart(4, '0')}.webp?v=${this.film.version}`;
    // decode() finishes the (slow) decoding off the main thread, so drawing
    // the frame later doesn't stall the scroll
    img.decode().then(() => this.loaded(k, img), () => {
      if (img.complete && img.naturalWidth) this.loaded(k, img);
      else this.failed(k);
    });
  }

  loaded(k, img) {
    this.images[k] = img;
    this.state[k] = FRAME_READY;
    this.active--;
    if (this.level[k] === 0) this.gridDone++;
    if (this.gridDone <= this.gridCount) this.updateStatus();
    // a stand-in frame is on screen: this one may be closer
    if (this.fallback) {
      this.drawnKey = '';
      this.queueFrame();
    }
    this.pump();
  }

  failed(k) {
    this.active--;
    if (++this.retries[k] < 3) {
      setTimeout(() => {
        this.state[k] = FRAME_IDLE;
        this.pump();
      }, 2000 * this.retries[k]);
    } else {
      this.state[k] = FRAME_FAILED;
      if (this.level[k] === 0) this.gridDone++;
    }
    this.pump();
  }

  /* --------------------------------------------------------------- drawing */

  frameAt(t) {
    return Math.max(0, Math.min(this.frameCount - 1, Math.floor(t * this.fps)));
  }

  nearestReady(k) {
    for (let d = 1; d < this.files; d++) {
      if (k - d >= 0 && this.state[k - d] === FRAME_READY) return k - d;
      if (k + d < this.files && this.state[k + d] === FRAME_READY) return k + d;
    }
    return -1;
  }

  render(t) {
    const p = Math.max(0, Math.min(this.frameCount - 1, t * this.fps));
    const f = Math.floor(p);
    let a = this.fileOf[f];
    let b = this.fileOf[Math.min(this.frameCount - 1, f + 1)];
    let mix = STORY_SETTINGS.blend ? p - f : 0;

    // not downloaded yet: show the nearest frame that is
    this.fallback = this.state[a] !== FRAME_READY || this.state[b] !== FRAME_READY;
    if (this.state[a] !== FRAME_READY) {
      a = this.nearestReady(a);
      if (a < 0) return;
      b = a;
    } else if (this.state[b] !== FRAME_READY) {
      b = a;
    }
    if (a === b) mix = 0;
    mix = Math.round(mix * 20) / 20;

    const key = `${a}|${b}|${mix}`;
    if (key === this.drawnKey) return;
    this.drawnKey = key;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.images[a], 0, 0, w, h);
    if (mix > 0) {
      ctx.globalAlpha = mix;
      ctx.drawImage(this.images[b], 0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // the blurred surround only needs whole frames
    if (a !== this.backdropFile) {
      this.backdropFile = a;
      this.bctx.drawImage(this.images[a], 0, 0, this.backdrop.width, this.backdrop.height);
    }
  }

  queueFrame() {
    if (!this.raf) this.raf = requestAnimationFrame(now => this.tick(now));
  }

  tick(now) {
    this.raf = 0;
    const dt = this.lastTick ? Math.min(0.1, (now - this.lastTick) / 1000) : 1 / 60;
    this.lastTick = now;

    // the guest dragged the scrollbar while playing: hand control back
    if (this.playing && Math.abs(window.scrollY - this.playY) > 3) this.stop();

    if (this.playing) {
      // the video is the clock; the page scrolls along with it
      const t = this.videoVisible ? Math.min(this.duration, this.video.currentTime) : this.playFrom;
      this.shown = this.target = t;
      this.playY = Math.round(this.timeToY(t));
      if (Math.abs(window.scrollY - this.playY) >= 1) window.scrollTo(0, this.playY);
      if (this.videoVisible && now - this.backdropAt > 150) {
        this.backdropAt = now;
        this.backdropFile = -1;
        this.bctx.drawImage(this.video, 0, 0, this.backdrop.width, this.backdrop.height);
      }
    } else {
      this.target = this.scrollTime();
      const ease = this.smoothing > 0 ? 1 - Math.exp(-dt / this.smoothing) : 1;
      this.shown += (this.target - this.shown) * ease;
      if (Math.abs(this.target - this.shown) < 0.004) this.shown = this.target;
    }

    if (!this.videoVisible) this.render(this.shown);
    this.updateUi();

    if (this.playing || this.shown !== this.target) this.queueFrame();
    else this.lastTick = 0;
  }

  /* ------------------------------------------------- play: the real video */

  loadVideo() {
    if (this.videoLoaded) return;
    this.videoLoaded = true;
    const v = this.video;
    v.src = `story/film.mp4?v=${this.film.version}`;
    const reveal = () => this.revealVideo();
    v.addEventListener('playing', () => {
      this.videoWaiting = false;
      this.updateStatus();
      reveal();
    });
    v.addEventListener('seeked', reveal);
    v.addEventListener('timeupdate', reveal);
    v.addEventListener('waiting', () => {
      this.videoWaiting = true;
      this.updateStatus();
    });
    v.addEventListener('ended', () => this.stop());
  }

  // Show the video over the frames once it is playing at the right moment
  // (until then the frame for that moment stays on screen)
  revealVideo() {
    const v = this.video;
    if (!this.playing || this.videoVisible || v.paused || v.seeking) return;
    if (Math.abs(v.currentTime - this.playFrom) > 1) return;
    this.videoVisible = true;
    this.video.classList.add('is-visible');
    this.updateStatus();
  }

  play() {
    if (this.playing) return;
    if (this.shown >= this.duration - 0.3) this.shown = this.target = 0; // from the start again

    this.playing = true;
    this.playFrom = this.shown;
    this.playY = Math.round(this.timeToY(this.shown));
    window.scrollTo(0, this.playY);

    this.loadVideo();
    const v = this.video;
    v.muted = false;
    if (v.readyState >= 1) v.currentTime = this.playFrom;
    else v.addEventListener('loadedmetadata', () => { v.currentTime = this.playFrom; }, { once: true });

    const started = v.play();
    if (started) {
      started.catch((err) => {
        if (!this.playing) return;
        if (err && err.name === 'NotAllowedError' && !v.muted) {
          // phones only allow sound after a tap on this page: play muted,
          // with a "Tap for sound" button
          v.muted = true;
          this.soundBtn.hidden = false;
          v.play().catch(() => this.stop());
        } else {
          this.stop();
        }
      });
    }

    this.setPlayButton(true);
    this.updateStatus();
    this.queueFrame();
  }

  soundOn() {
    this.video.muted = false;
    this.soundBtn.hidden = true;
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    this.videoWaiting = false;
    this.soundBtn.hidden = true;
    const v = this.video;
    v.pause();

    if (this.videoVisible) {
      // the frames take over at the moment the video reached
      this.shown = this.target = Math.min(this.duration, v.currentTime);
      this.drawnKey = '';
      this.render(this.shown);
      this.videoVisible = false;
      v.classList.remove('is-visible');
    }
    this.setPlayButton(false);
    this.updateStatus();
    this.pump();
    this.queueFrame();
  }

  setPlayButton(playing) {
    this.playBtn.setAttribute('aria-pressed', String(playing));
    this.playBtn.querySelector('.story-play-icon').textContent = playing ? '❚❚' : '▶';
    this.playBtn.querySelector('.story-play-label').textContent = playing ? 'Pause' : 'Play with music';
  }

  /* ----------------------------------------------------- progress + chapters */

  // a dot for each chapter (the first starts at the left end, so no dot)
  buildTicks() {
    this.ticks = STORY_CHAPTERS.map((c) => {
      const dot = document.createElement('span');
      dot.className = 'story-tick';
      dot.style.left = `${(c.t / this.duration) * 100}%`;
      if (c.t > 0) this.railTrack.appendChild(dot);
      return dot;
    });
  }

  initRail() {
    const rail = this.rail;
    const timeAt = (e) => {
      const r = this.railTrack.getBoundingClientRect();
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * this.duration;
    };
    let dragging = false;
    let moved = false;
    let downX = 0;

    rail.addEventListener('pointerdown', (e) => {
      this.stop();
      dragging = true;
      moved = false;
      downX = e.clientX;
      rail.setPointerCapture(e.pointerId);
      this.seek(timeAt(e));
      e.preventDefault();
    });
    rail.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - downX) > 4) moved = true;
      this.seek(timeAt(e));
    });
    rail.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved) return;
      // a tap close to a chapter dot starts that chapter
      const r = this.railTrack.getBoundingClientRect();
      let best = null;
      let bestDist = 14;
      STORY_CHAPTERS.forEach((c) => {
        const d = Math.abs(r.left + (c.t / this.duration) * r.width - e.clientX);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      });
      if (best) this.seek(best.t);
    });
    rail.addEventListener('pointercancel', () => { dragging = false; });

    rail.addEventListener('keydown', (e) => {
      const steps = { ArrowRight: 5, ArrowUp: 5, PageUp: 15, ArrowLeft: -5, ArrowDown: -5, PageDown: -15 };
      let t = null;
      if (e.key in steps) t = this.target + steps[e.key];
      else if (e.key === 'Home') t = 0;
      else if (e.key === 'End') t = this.duration;
      if (t === null) return;
      e.preventDefault();
      this.stop();
      this.seek(t);
    });
  }

  updateUi() {
    const t = this.shown;

    const progress = t / this.duration;
    if (Math.abs(progress - this.lastProgress) > 0.0004) {
      this.lastProgress = progress;
      this.railFill.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    let c = 0;
    while (c + 1 < STORY_CHAPTERS.length && STORY_CHAPTERS[c + 1].t <= t + 0.01) c++;
    if (c !== this.chapter) {
      this.chapter = c;
      this.chapterEl.textContent = STORY_CHAPTERS[c].title;
      this.ticks.forEach((dot, i) => {
        dot.classList.toggle('is-passed', i <= c);
        dot.classList.toggle('is-current', i === c);
      });
    }

    const second = Math.round(t);
    if (second !== this.lastSecond) {
      this.lastSecond = second;
      const clock = `${Math.floor(second / 60)}:${String(second % 60).padStart(2, '0')}`;
      this.rail.setAttribute('aria-valuenow', second);
      this.rail.setAttribute('aria-valuetext', `${clock}, ${STORY_CHAPTERS[c].title}`);
    }

    const atEnd = t >= this.duration - STORY_SETTINGS.endCardSeconds;
    if (atEnd !== this.atEnd) {
      this.atEnd = atEnd;
      this.endCard.hidden = !atEnd;
      this.updateStatus();
    }

    if (!this.started && t > 1) {
      this.started = true;
      this.updateStatus();
    }
  }

  // One line above the chapter name: what's loading, or a scroll hint
  updateStatus() {
    let text = '';
    let arrow = false;
    if (this.playing && (!this.videoVisible || this.videoWaiting)) {
      text = 'Loading the video…';
    } else if (!this.playing && this.gridDone < this.gridCount) {
      text = `Loading our story… ${Math.floor((this.gridDone / this.gridCount) * 100)}%`;
    } else if (!this.started && !this.playing) {
      text = 'Scroll to play our story';
      arrow = true;
    }
    this.status.hidden = this.atEnd;
    this.status.classList.toggle('is-hidden', !text);
    if (text) this.statusText.textContent = text;
    this.statusArrow.hidden = !arrow;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.STORY_FILM) {
    const text = document.querySelector('.story-status-text');
    if (text) text.textContent = 'The story frames are missing: run scripts/build-story-frames.py';
    return;
  }
  window.storyFilm = new StoryFilm(window.STORY_FILM);
});
