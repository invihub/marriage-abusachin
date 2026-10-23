/**
 * Romantic Winter Snowfall Canvas Animation
 * Renders gentle falling snowflakes and frosty crystal sparkles
 * Celebrating the Canadian winter chapter & winter wedding romance
 *
 * Performance notes:
 * - Each flake is drawn from one pre-rendered sprite (no per-frame gradients)
 * - Flake count scales with screen area (fewer on phones)
 * - Paused while the temple gate is closed and while the tab is hidden
 * - Sparser and slower for users who prefer reduced motion
 * - Moves by time, not by frame, and draws at most 60 times a second, so a
 *   120 Hz phone neither speeds the snow up nor does twice the work
 */

class SnowfallEngine {
  constructor(canvasId = 'snow-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.flakes = [];
    this.animationFrame = null;
    this.running = false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.sprite = this.createSprite();

    this.resize();
    this.initFlakes();

    let resizeQueued = false;
    window.addEventListener('resize', () => {
      if (resizeQueued) return;
      resizeQueued = true;
      requestAnimationFrame(() => {
        resizeQueued = false;
        this.resize();
      });
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseFrame();
      } else if (this.running) {
        this.loop();
      }
    });
  }

  createSprite() {
    const size = 32;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const c = sprite.getContext('2d');
    const r = size / 2;
    const grad = c.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.7, 'rgba(235, 245, 255, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);
    return sprite;
  }

  resize() {
    if (!this.canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Mobile browsers fire resize when the URL bar shows/hides; only
    // reallocate the canvas when the size actually changed.
    if (this.canvas.width === w && this.canvas.height === h) return;
    const widthChanged = this.canvas.width !== w;
    this.canvas.width = w;
    this.canvas.height = h;
    // only a new width (turning the phone) needs a fresh snowfall; the URL bar
    // changing the height must not reshuffle every flake mid-scroll
    if (this.flakes.length && widthChanged) this.initFlakes();
  }

  initFlakes() {
    this.flakes = [];
    const w = this.canvas.width;
    const h = this.canvas.height;
    // ~40 flakes on a phone, up to 75 on large screens;
    // "reduce motion" users get a sparser, slower, calmer snowfall
    const calm = this.reducedMotion ? 0.5 : 1;
    const count = Math.round(Math.min(75, Math.max(35, (w * h) / 14000)) * calm);

    for (let i = 0; i < count; i++) {
      this.flakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 1.5 + Math.random() * 3.5,
        speedY: (0.6 + Math.random() * 1.4) * calm,
        speedX: (Math.random() - 0.5) * 0.8 * calm,
        opacity: 0.4 + Math.random() * 0.5,
        swing: Math.random() * Math.PI * 2,
        swingSpeed: (0.01 + Math.random() * 0.02) * calm
      });
    }
  }

  start() {
    if (!this.canvas) return;
    this.running = true;
    if (!this.animationFrame && !document.hidden) this.loop();
  }

  // the next frame; the time since the last drawn one decides how far flakes move
  queueFrame() {
    this.animationFrame = requestAnimationFrame((now) => this.loop(now));
  }

  stop() {
    this.running = false;
    this.pauseFrame();
  }

  pauseFrame() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.lastTime = 0;
  }

  loop(now = performance.now()) {
    if (!this.canvas || !this.ctx) return;
    // at most 60 drawings a second (a 120 Hz screen skips every other frame)
    const elapsed = this.lastTime ? now - this.lastTime : 1000 / 60;
    if (elapsed < 1000 / 60 - 2) {
      this.queueFrame();
      return;
    }
    this.lastTime = now;
    // speeds are per 1/60 s; a long gap (tab switch, gate reopened) doesn't jump
    const step = Math.min(elapsed / (1000 / 60), 3);

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      f.swing += f.swingSpeed * step;
      f.y += f.speedY * step;
      f.x += (Math.sin(f.swing) * 0.7 + f.speedX) * step;

      // Wrap around edges
      if (f.y > h + 10) {
        f.y = -10;
        f.x = Math.random() * w;
      }
      if (f.x > w + 10) f.x = -10;
      if (f.x < -10) f.x = w + 10;

      // Draw soft snowflake
      const d = f.radius * 2;
      ctx.globalAlpha = f.opacity;
      ctx.drawImage(this.sprite, f.x - f.radius, f.y - f.radius, d, d);
    }
    ctx.globalAlpha = 1;

    this.queueFrame();
  }
}

// Started by main.js once the temple gate opens
window.snowfallEngine = new SnowfallEngine();
