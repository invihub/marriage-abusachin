/**
 * Pearl City Superfast Express - 11-Year Journey Horizontal Scroll Engine
 * Translates vertical page scrolling into horizontal train coach movement
 * Milestone Coaches:
 * 1. 2015 - KCG College of Technology (Chennai)
 * 2. 2015 - First Movie Date (OK Kanmani)
 * 3. 2017-2020 - Chennai Romance & Growing Dreams
 * 4. 2021-2025 - The Canada Chapter
 * 5. 2026 - Marriage: 11 Years & Forever
 */

class TrainTimelineEngine {
  constructor() {
    this.section = document.getElementById('timeline-journey');
    this.stickyContainer = document.querySelector('.timeline-sticky-wrapper');
    this.track = document.querySelector('.train-coaches-track');
    this.progressBar = document.querySelector('.timeline-progress-fill');
    this.coachPills = document.querySelectorAll('.coach-nav-btn');
    this.prevBtn = document.getElementById('train-prev-btn');
    this.nextBtn = document.getElementById('train-next-btn');
    this.activeCoachIndex = 0;

    this.init();
  }

  init() {
    if (!this.section || !this.track) return;

    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    window.addEventListener('resize', () => this.handleScroll(), { passive: true });

    // Coach navigation clicks
    if (this.coachPills) {
      this.coachPills.forEach((btn, index) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.scrollToCoach(index);
        });
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.scrollToCoach(Math.max(0, this.activeCoachIndex - 1));
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.scrollToCoach(Math.min(4, this.activeCoachIndex + 1));
      });
    }

    this.handleScroll();
  }

  handleScroll() {
    if (!this.section || !this.track) return;

    const rect = this.section.getBoundingClientRect();
    const sectionHeight = this.section.offsetHeight;
    const viewportHeight = window.innerHeight;

    // Total scrollable vertical distance inside this section
    const totalScrollable = sectionHeight - viewportHeight;
    if (totalScrollable <= 0) return;

    // How far we have scrolled past section top
    const scrolled = -rect.top;
    const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));

    // Calculate maximum horizontal travel distance
    const trackWidth = this.track.scrollWidth;
    const viewportWidth = window.innerWidth;
    const maxTranslate = Math.max(0, trackWidth - viewportWidth + 80);

    const currentX = progress * maxTranslate;
    this.track.style.transform = `translateX(-${currentX}px)`;

    if (this.progressBar) {
      this.progressBar.style.width = `${progress * 100}%`;
    }

    // Determine current active coach (5 coaches: 0 to 4)
    const coachIndex = Math.min(4, Math.floor(progress * 5));
    if (coachIndex !== this.activeCoachIndex) {
      this.activeCoachIndex = coachIndex;
      this.updateActiveCoachState(coachIndex);
    }
  }

  updateActiveCoachState(index) {
    // Update navigation buttons
    if (this.coachPills) {
      this.coachPills.forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
      });
    }

    // Update coach cards
    const coaches = document.querySelectorAll('.train-coach-item');
    coaches.forEach((coach, i) => {
      coach.classList.toggle('coach-focused', i === index);
    });

    // Update station signboard indicator
    const stations = ['Chennai Egmore', 'Satyam Cinemas', 'OMR Corridor', 'Toronto Union', 'Thoothukudi Terminus'];
    const stationLabel = document.getElementById('current-train-station');
    if (stationLabel && stations[index]) {
      stationLabel.textContent = stations[index];
    }
  }

  scrollToCoach(index) {
    if (!this.section) return;
    const sectionTop = this.section.offsetTop;
    const sectionHeight = this.section.offsetHeight;
    const viewportHeight = window.innerHeight;
    const totalScrollable = sectionHeight - viewportHeight;

    const targetFraction = index / 4.2; // slight offset so coach is centered
    const targetScrollY = sectionTop + (targetFraction * totalScrollable);

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth'
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.trainTimeline = new TrainTimelineEngine();
});
