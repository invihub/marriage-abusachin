/**
 * Marigold & Jasmine Petal Shower Canvas Animation
 * Renders fluttering South Indian auspicious floral petals:
 * - Golden Orange & Bright Yellow Marigold (Samandhi) petals
 * - Fragrant White Jasmine (Malli) blossoms
 * - Shimmering golden confetti sparkles
 */

class PetalShower {
  constructor(canvasId = 'petal-canvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animationFrame = null;
    this.isActive = false;
    this.burstTimer = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  triggerBurst(count = 120, durationMs = 8000) {
    this.isActive = true;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(true));
    }

    if (!this.animationFrame) {
      this.loop();
    }

    if (this.burstTimer) clearTimeout(this.burstTimer);
    this.burstTimer = setTimeout(() => {
      // Allow existing petals to fall off-screen gracefully
      this.isActive = false;
    }, durationMs);
  }

  createParticle(isBurst = false) {
    const types = ['marigold-orange', 'marigold-yellow', 'jasmine-white', 'gold-sparkle'];
    const type = types[Math.floor(Math.random() * types.length)];
    const w = this.canvas ? this.canvas.width : window.innerWidth;
    const h = this.canvas ? this.canvas.height : window.innerHeight;

    return {
      x: isBurst ? Math.random() * w : Math.random() * w,
      y: isBurst ? -20 - Math.random() * (h * 0.5) : -20,
      size: type === 'gold-sparkle' ? 2 + Math.random() * 3 : 8 + Math.random() * 10,
      speedY: 1.2 + Math.random() * 2.8,
      speedX: (Math.random() - 0.5) * 1.5,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() - 0.5) * 0.08,
      oscillation: Math.random() * Math.PI * 2,
      oscillationSpeed: 0.02 + Math.random() * 0.03,
      opacity: 0.8 + Math.random() * 0.2,
      type: type
    };
  }

  loop() {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.oscillation += p.oscillationSpeed;
      p.x += Math.sin(p.oscillation) * 1.8 + p.speedX;
      p.y += p.speedY;
      p.angle += p.spinSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.angle);
      this.ctx.globalAlpha = p.opacity;

      if (p.type === 'marigold-orange') {
        this.drawMarigoldPetal(p.size, '#E65100', '#FF9800');
      } else if (p.type === 'marigold-yellow') {
        this.drawMarigoldPetal(p.size, '#F57F17', '#FFD54F');
      } else if (p.type === 'jasmine-white') {
        this.drawJasmine(p.size);
      } else {
        this.drawSparkle(p.size);
      }

      this.ctx.restore();

      // Remove particles that go below screen
      if (p.y > this.canvas.height + 40) {
        if (this.isActive) {
          // Recycle
          this.particles[i] = this.createParticle(false);
        } else {
          this.particles.splice(i, 1);
        }
      }
    }

    if (this.particles.length > 0) {
      this.animationFrame = requestAnimationFrame(() => this.loop());
    } else {
      this.animationFrame = null;
    }
  }

  drawMarigoldPetal(size, colorDark, colorLight) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(-size / 2, -size, size / 2, size);
    grad.addColorStop(0, colorLight);
    grad.addColorStop(1, colorDark);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(size * 0.7, -size * 0.5, size * 0.8, size * 0.4, 0, size);
    ctx.bezierCurveTo(-size * 0.8, size * 0.4, -size * 0.7, -size * 0.5, 0, -size);
    ctx.fill();

    // Center subtle vein
    ctx.strokeStyle = colorDark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.7);
    ctx.lineTo(0, size * 0.7);
    ctx.stroke();
  }

  drawJasmine(size) {
    const ctx = this.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255, 235, 180, 0.5)';
    ctx.shadowBlur = 4;

    // 5 tiny delicate petals of mallipoo
    for (let i = 0; i < 5; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.45, size * 0.22, size * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Yellow center pistil
    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSparkle(size) {
    const ctx = this.ctx;
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFF176';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

window.petalShower = new PetalShower();
