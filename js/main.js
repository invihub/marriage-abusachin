/**
 * Main Application Script for Abu & Sachin's Wedding Invitation
 * Snow-Themed Romantic Marriage Experience
 * Handles:
 * - Tamil Architecture Gopuram Split Doors opening
 * - Wedding Muhurtham Countdown Timer
 * - Spinning Celebration Schedule Wheel interaction
 * - OK Kanmani Floating Cassette Player & Rain Controls
 * - Clean mobile navigation & smooth interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initTempleDoors();
  initCountdownTimer();
  initCassettePlayer();
  initSpinWheel();
  initMobileNav();
});

/**
 * 1. Tamil Architecture Gopuram Split Doors Opening
 */
function initTempleDoors() {
  const openDoorsBtn = document.getElementById('open-doors-btn');
  const doorOverlay = document.getElementById('temple-door-curtain');
  const reOpenDoorsBtn = document.getElementById('revisit-doors-btn');

  if (openDoorsBtn && doorOverlay) {
    openDoorsBtn.addEventListener('click', () => {
      // 1. Play Auspicious Temple Bell Chime
      if (window.weddingAudio) {
        window.weddingAudio.playTempleBell();
      }

      // 2. Split open the two halves of the Tamil Gopuram
      doorOverlay.classList.add('doors-opened');

      // 3. Start gentle romantic melody after doors open
      setTimeout(() => {
        if (window.weddingAudio && !window.weddingAudio.isPlaying) {
          window.weddingAudio.play();
        }
      }, 1400);
    });
  }

  // Re-enter / close doors button
  if (reOpenDoorsBtn && doorOverlay) {
    reOpenDoorsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      doorOverlay.classList.remove('doors-opened');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/**
 * 2. Wedding Countdown Timer
 * Auspicious Muhurtham: Dec 6, 2026, 09:45 AM (Thoothukudi Tradition 1)
 */
function initCountdownTimer() {
  const targetDate = new Date('2026-12-06T09:45:00+05:30').getTime();

  const daysEl = document.getElementById('timer-days');
  const hoursEl = document.getElementById('timer-hours');
  const minsEl = document.getElementById('timer-minutes');
  const secsEl = document.getElementById('timer-seconds');

  function update() {
    const now = new Date().getTime();
    const diff = targetDate - now;

    if (diff <= 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minsEl) minsEl.textContent = '00';
      if (secsEl) secsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
    if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

/**
 * 3. Celebration Schedule 5-Section Rotating Spin Wheel
 */
function initSpinWheel() {
  const wheel = document.getElementById('celebration-wheel');
  const hubInfo = document.getElementById('wheel-hub-active-title');
  const hubVenue = document.getElementById('wheel-hub-active-venue');

  if (!wheel) return;

  const segments = document.querySelectorAll('.wheel-segment');

  segments.forEach(seg => {
    seg.addEventListener('mouseenter', () => {
      const title = seg.dataset.title;
      const venue = seg.dataset.venue;
      if (hubInfo && title) hubInfo.textContent = title;
      if (hubVenue && venue) hubVenue.textContent = venue;
      wheel.classList.add('wheel-paused');
    });

    seg.addEventListener('mouseleave', () => {
      if (hubInfo) hubInfo.textContent = 'Abu & Sachin';
      if (hubVenue) hubVenue.textContent = 'Click segment for Google Maps';
      wheel.classList.remove('wheel-paused');
    });

    seg.addEventListener('click', () => {
      const mapUrl = seg.dataset.map;
      if (mapUrl) {
        window.open(mapUrl, '_blank', 'noopener,noreferrer');
      }
    });
  });
}

/**
 * 4. OK Kanmani Jukebox & Rain Atmosphere Player
 */
function initCassettePlayer() {
  const playBtn = document.getElementById('cassette-play-toggle');
  const playIcon = document.getElementById('cassette-play-icon');
  const prevBtn = document.getElementById('cassette-prev');
  const nextBtn = document.getElementById('cassette-next');
  const trackTitleEl = document.getElementById('cassette-track-title');
  const trackFilmEl = document.getElementById('cassette-track-film');
  const cassetteDeck = document.querySelector('.floating-cassette-widget');
  const cassetteToggleBtn = document.getElementById('cassette-toggle-widget');
  const rainToggleBtn = document.getElementById('rain-atmosphere-toggle');
  const rainSlider = document.getElementById('rain-volume-slider');
  const musicSlider = document.getElementById('music-volume-slider');
  const eqBars = document.querySelectorAll('.eq-bar');

  if (!window.weddingAudio) return;

  function updateTrackDisplay(track) {
    if (trackTitleEl) trackTitleEl.textContent = track.title;
    if (trackFilmEl) trackFilmEl.textContent = track.film;
  }

  window.weddingAudio.onTrackChange = (track) => {
    updateTrackDisplay(track);
  };

  window.weddingAudio.onPlayStateChange = (isPlaying) => {
    if (playIcon) {
      playIcon.textContent = isPlaying ? '⏸' : '▶';
    }
    if (cassetteDeck) {
      cassetteDeck.classList.toggle('is-playing', isPlaying);
    }
  };

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      window.weddingAudio.toggleMusic();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      window.weddingAudio.prevTrack();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      window.weddingAudio.nextTrack();
    });
  }

  if (rainToggleBtn) {
    rainToggleBtn.addEventListener('click', () => {
      const isRainOn = window.weddingAudio.toggleRain();
      rainToggleBtn.classList.toggle('rain-active', isRainOn);
      const rainStatusText = document.getElementById('rain-toggle-status');
      if (rainStatusText) {
        rainStatusText.textContent = isRainOn ? 'Rain ON (Chennai Monsoon)' : 'Rain OFF';
      }
    });
  }

  if (rainSlider) {
    rainSlider.addEventListener('input', (e) => {
      window.weddingAudio.setRainVolume(parseFloat(e.target.value));
    });
  }

  if (musicSlider) {
    musicSlider.addEventListener('input', (e) => {
      window.weddingAudio.setMusicVolume(parseFloat(e.target.value));
    });
  }

  if (cassetteToggleBtn && cassetteDeck) {
    cassetteToggleBtn.addEventListener('click', () => {
      cassetteDeck.classList.toggle('widget-minimized');
    });
  }

  function animateEqualizer() {
    if (window.weddingAudio && window.weddingAudio.isPlaying && eqBars.length > 0) {
      const data = window.weddingAudio.getEqualizerData();
      eqBars.forEach((bar, idx) => {
        const val = data[idx] || 0;
        const heightPct = Math.max(15, Math.min(100, (val / 255) * 100));
        bar.style.height = `${heightPct}%`;
      });
    } else {
      eqBars.forEach(bar => bar.style.height = '15%');
    }
    requestAnimationFrame(animateEqualizer);
  }
  animateEqualizer();

  updateTrackDisplay(window.weddingAudio.getCurrentTrack());
}

/**
 * 5. Mobile Navigation
 */
function initMobileNav() {
  const menuToggle = document.getElementById('mobile-nav-toggle');
  const navMenu = document.querySelector('.site-nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('nav-open');
    });

    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('nav-open');
      });
    });
  }
}
