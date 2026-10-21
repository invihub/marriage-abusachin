/**
 * Pearl City Superfast Express - 11-Year Journey Horizontal Scroll Engine
 * Translates vertical page scrolling into horizontal train coach movement
 * Milestone Coaches:
 * 1. 2015 - KCG College of Technology (Chennai)
 * 2. 2015 - First Movie Date (OK Kanmani)
 * 3. 2017-2020 - Chennai Romance & Growing Dreams
 * 4. 2021-2025 - The Canada Chapter
 * 5. 2026 - Marriage: 11 Years & Forever
 *
 * Layout is measured once (and again on resize), so scrolling only reads
 * window.scrollY and writes a transform, at most once per animation frame.
 */

class TrainTimelineEngine {
  constructor() {
    this.section = document.getElementById('timeline-journey');
    this.stickyContainer = document.querySelector('.timeline-sticky-wrapper');
    this.viewport = document.querySelector('.train-coaches-viewport');
    this.track = document.querySelector('.train-coaches-track');
    this.progressBar = document.querySelector('.timeline-progress-fill');
    this.coaches = document.querySelectorAll('.train-coach-item');
    this.coachPills = document.querySelectorAll('.coach-nav-btn');
    this.prevBtn = document.getElementById('train-prev-btn');
    this.nextBtn = document.getElementById('train-next-btn');
    this.stationLabel = document.getElementById('current-train-station');
    this.stations = ['Chennai Egmore', 'Satyam Cinemas', 'OMR Corridor', 'Toronto Union', 'Thoothukudi Terminus'];
    this.activeCoachIndex = -1;
    this.lastX = -1;
    this.frameQueued = false;
    this.layout = null;

    this.init();
  }

  init() {
    if (!this.section || !this.track || !this.stickyContainer) return;

    window.addEventListener('scroll', () => this.queueUpdate(), { passive: true });
    window.addEventListener('resize', () => this.queueUpdate(true), { passive: true });
    window.addEventListener('load', () => this.queueUpdate(true));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.queueUpdate(true));
    }
    // Content above the timeline can change height (fonts, images, uploads)
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.queueUpdate(true)).observe(document.body);
    }

    // Coach navigation clicks
    this.coachPills.forEach((btn, index) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollToCoach(index);
      });
    });

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.scrollToCoach(Math.max(0, this.activeCoachIndex - 1));
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.scrollToCoach(Math.min(this.coaches.length - 1, this.activeCoachIndex + 1));
      });
    }

    this.measure();
    this.update();
  }

  queueUpdate(remeasure = false) {
    if (remeasure) this.needsMeasure = true;
    if (this.frameQueued) return;
    this.frameQueued = true;
    requestAnimationFrame(() => {
      this.frameQueued = false;
      if (this.needsMeasure) {
        this.needsMeasure = false;
        this.measure();
      }
      this.update();
    });
  }

  measure() {
    const viewportWidth = this.viewport ? this.viewport.clientWidth : window.innerWidth;
    const maxTranslate = Math.max(0, this.track.scrollWidth - viewportWidth);
    const sectionTop = this.section.getBoundingClientRect().top + window.scrollY;
    const totalScrollable = this.section.offsetHeight - this.stickyContainer.offsetHeight;

    // Translate needed to centre each coach in the viewport; a coach wider
    // than the screen (phones) is shown from its start, photo first
    const centers = [];
    const targets = [];
    this.coaches.forEach(coach => {
      const center = coach.offsetLeft + coach.offsetWidth / 2;
      centers.push(center);
      const target = coach.offsetWidth > viewportWidth
        ? coach.offsetLeft - (viewportWidth - Math.min(coach.offsetWidth, viewportWidth * 0.86)) / 2
        : center - viewportWidth / 2;
      targets.push(Math.min(maxTranslate, Math.max(0, target)));
    });

    this.layout = { viewportWidth, maxTranslate, sectionTop, totalScrollable, centers, targets };
    this.lastX = -1; // force a repaint with the new geometry
  }

  update() {
    const l = this.layout;
    if (!l || l.totalScrollable <= 0) return;

    const scrolled = window.scrollY - l.sectionTop;
    const progress = Math.max(0, Math.min(1, scrolled / l.totalScrollable));
    const x = Math.round(progress * l.maxTranslate);
    if (x === this.lastX) return;
    this.lastX = x;

    this.track.style.transform = `translate3d(${-x}px, 0, 0)`;
    if (this.progressBar) {
      this.progressBar.style.transform = `scaleX(${progress})`;
    }

    // Active coach = the one whose centre is closest to the viewport centre
    const viewCenter = x + l.viewportWidth / 2;
    let coachIndex = 0;
    let best = Infinity;
    l.centers.forEach((c, i) => {
      const dist = Math.abs(c - viewCenter);
      if (dist < best) {
        best = dist;
        coachIndex = i;
      }
    });

    if (coachIndex !== this.activeCoachIndex) {
      this.activeCoachIndex = coachIndex;
      this.updateActiveCoachState(coachIndex);
    }
  }

  updateActiveCoachState(index) {
    // Update navigation buttons
    this.coachPills.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });

    // Update coach cards
    this.coaches.forEach((coach, i) => {
      coach.classList.toggle('coach-focused', i === index);
    });

    // Update station signboard indicator
    if (this.stationLabel && this.stations[index]) {
      this.stationLabel.textContent = this.stations[index];
    }
  }

  scrollToCoach(index) {
    if (!this.layout) this.measure();
    const l = this.layout;
    const fraction = l.maxTranslate > 0 ? l.targets[index] / l.maxTranslate : 0;

    window.scrollTo({
      top: l.sectionTop + fraction * l.totalScrollable,
      behavior: 'smooth'
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.trainTimeline = new TrainTimelineEngine();
});
