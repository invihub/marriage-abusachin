/**
 * Main Application Script for Abu & Sachin's Wedding Invitation
 * Mobile-First Snow & Heritage Experience
 */

document.addEventListener('DOMContentLoaded', () => {
  initTempleDoors();
  initCountdownTimer();
  initCassettePlayer();
  initSpinWheel();
  initMobileNav();
});

/**
 * 1. Straight-Facing Gopuram Split Doors Opening
 */
function initTempleDoors() {
  const openDoorsBtn = document.getElementById('open-doors-btn');
  const doorOverlay = document.getElementById('temple-door-curtain');
  const reOpenDoorsBtn = document.getElementById('revisit-doors-btn');

  // The page behind the gate stays scroll-locked (html.gate-closed) and the
  // snow stays paused until the doors open, so nothing animates unseen.
  const setGateClosed = (closed) => {
    document.documentElement.classList.toggle('gate-closed', closed);
    if (window.snowfallEngine) {
      closed ? window.snowfallEngine.stop() : window.snowfallEngine.start();
    }
  };

  if (!doorOverlay) {
    setGateClosed(false);
    return;
  }

  if (openDoorsBtn) {
    openDoorsBtn.addEventListener('click', () => {
      // 1. Play Auspicious Temple Bell Chime
      if (window.weddingAudio) {
        window.weddingAudio.playTempleBell();
      }

      // 2. Split open both halves
      doorOverlay.classList.add('doors-opened');
      setGateClosed(false);
    });
  }

  // Re-enter / close doors button
  if (reOpenDoorsBtn) {
    reOpenDoorsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'instant' });
      doorOverlay.classList.remove('doors-opened');
      setGateClosed(true);
    });
  }
}

/**
 * 2. Wedding Countdown Timer
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
  const hubTitle = document.getElementById('wheel-hub-active-title');
  const hubVenue = document.getElementById('wheel-hub-active-venue');

  if (!wheel) return;

  const segments = document.querySelectorAll('.wheel-segment');

  segments.forEach(seg => {
    seg.addEventListener('mouseenter', () => {
      const title = seg.dataset.title;
      const venue = seg.dataset.venue;
      if (hubTitle && title) hubTitle.textContent = title;
      if (hubVenue && venue) hubVenue.textContent = venue;
      wheel.classList.add('wheel-paused');
    });

    seg.addEventListener('mouseleave', () => {
      if (hubTitle) hubTitle.textContent = 'Abu & Sachin';
      if (hubVenue) hubVenue.textContent = 'Tap segment for Google Maps';
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
 * 4. Redesigned Tape Recorder Player (with 2 Rotating Reel Circles)
 */
function initCassettePlayer() {
  const playBtn = document.getElementById('cassette-play-toggle');
  const playIcon = document.getElementById('cassette-play-icon');
  const nextBtn = document.getElementById('cassette-next');
  const trackTitleEl = document.getElementById('cassette-track-title');
  const statusEl = document.getElementById('cassette-status-badge');
  const cassetteDeck = document.querySelector('.floating-cassette-widget');
  const cassetteToggleBtn = document.getElementById('cassette-toggle-widget');
  const quickSoundtrackBtn = document.getElementById('quick-soundtrack-toggle');
  const quickSoundtrackIcon = document.getElementById('quick-soundtrack-icon');
  const quickSoundtrackLabel = document.getElementById('quick-soundtrack-label');
  const minimizeBtn = document.getElementById('cassette-minimize-btn');
  const musicSlider = document.getElementById('music-volume-slider');

  if (!window.weddingAudio) return;

  function updateTrackDisplay(track) {
    if (trackTitleEl) trackTitleEl.textContent = track.title;
  }

  window.weddingAudio.onTrackChange = (track) => {
    updateTrackDisplay(track);
  };

  window.weddingAudio.onPlayStateChange = (isPlaying) => {
    if (playIcon) {
      // Icon only: the play button is a small circle
      playIcon.textContent = isPlaying ? '❚❚' : '▶';
    }
    if (statusEl) {
      statusEl.textContent = isPlaying ? 'PLAYING' : 'PAUSED';
    }
    if (cassetteDeck) {
      cassetteDeck.classList.toggle('is-playing', isPlaying);
    }
    if (quickSoundtrackIcon) {
      quickSoundtrackIcon.textContent = isPlaying ? '❚❚' : '▶';
    }
    if (quickSoundtrackLabel) {
      quickSoundtrackLabel.textContent = isPlaying ? 'Pause' : 'Play';
    }
    if (quickSoundtrackBtn) {
      quickSoundtrackBtn.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
    }
  };

  const toggleMusic = () => window.weddingAudio.toggleMusic();

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      toggleMusic();
    });
  }

  if (quickSoundtrackBtn) {
    quickSoundtrackBtn.addEventListener('click', () => {
      toggleMusic();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      window.weddingAudio.nextTrack();
    });
  }

  const prevBtn = document.getElementById('cassette-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      window.weddingAudio.prevTrack();
    });
  }

  if (musicSlider) {
    musicSlider.addEventListener('input', (e) => {
      window.weddingAudio.setMusicVolume(parseFloat(e.target.value));
    });
  }

  if (cassetteToggleBtn && cassetteDeck) {
    cassetteToggleBtn.addEventListener('click', () => {
      const minimized = cassetteDeck.classList.toggle('widget-minimized');
      cassetteToggleBtn.setAttribute('aria-expanded', String(!minimized));
    });
  }

  if (minimizeBtn && cassetteDeck) {
    minimizeBtn.addEventListener('click', () => {
      cassetteDeck.classList.add('widget-minimized');
    });
  }

  updateTrackDisplay(window.weddingAudio.getCurrentTrack());
}

/**
 * 5. Mobile Navigation
 */
function initMobileNav() {
  const menuToggle = document.getElementById('mobile-nav-toggle');
  const navMenu = document.querySelector('.site-nav-menu');

  if (menuToggle && navMenu) {
    const setOpen = (open) => {
      navMenu.classList.toggle('nav-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.textContent = open ? '✕' : '☰';
    };

    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!navMenu.classList.contains('nav-open'));
    });

    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => setOpen(false));
    });

    // Close when tapping anywhere outside the menu, or on Escape
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('nav-open') && !navMenu.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });
  }
}
