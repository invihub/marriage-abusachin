/**
 * Romantic Winter Snowfall Canvas Animation
 * Renders gentle falling snowflakes and frosty crystal sparkles
 * Celebrating the Canadian winter chapter & winter wedding romance
 */

class SnowfallEngine {
  constructor(canvasId = 'snow-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.flakes = [];
    this.animationFrame = null;
    this.maxFlakes = 75;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initFlakes();
    this.start();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initFlakes() {
    this.flakes = [];
    const w = this.canvas ? this.canvas.width : window.innerWidth;
    const h = this.canvas ? this.canvas.height : window.innerHeight;

    for (let i = 0; i < this.maxFlakes; i++) {
      this.flakes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: 1.5 + Math.random() * 3.5,
        density: Math.random() * this.maxFlakes,
        speedY: 0.6 + Math.random() * 1.4,
        speedX: (Math.random() - 0.5) * 0.8,
        opacity: 0.4 + Math.random() * 0.5,
        swing: Math.random() * Math.PI * 2,
        swingSpeed: 0.01 + Math.random() * 0.02
      });
    }
  }

  start() {
    if (!this.animationFrame) {
      this.loop();
    }
  }

  loop() {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const w = this.canvas.width;
    const h = this.canvas.height;

    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      f.swing += f.swingSpeed;
      f.y += f.speedY;
      f.x += Math.sin(f.swing) * 0.7 + f.speedX;

      // Wrap around edges
      if (f.y > h + 10) {
        f.y = -10;
        f.x = Math.random() * w;
      }
      if (f.x > w + 10) f.x = -10;
      if (f.x < -10) f.x = w + 10;

      // Draw soft snowflake
      this.ctx.beginPath();
      const grad = this.ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
      grad.addColorStop(0, `rgba(255, 255, 255, ${f.opacity})`);
      grad.addColorStop(0.7, `rgba(235, 245, 255, ${f.opacity * 0.7})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = grad;
      this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2, false);
      this.ctx.fill();
    }

    this.animationFrame = requestAnimationFrame(() => this.loop());
  }
}

window.snowfallEngine = new SnowfallEngine();
