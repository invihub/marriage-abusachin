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
  initSectionMemory();
});

/**
 * 1. Temple gate: ring the bell, then the gate opens onto the invitation
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

  // Back from Our Story / the Guest List: the <head> script already skipped
  // the gate; land on the section again once images above it have loaded
  const html = document.documentElement;
  if (html.classList.contains('gate-skip')) {
    doorOverlay.classList.add('doors-opened', 'bell-rung');
    setGateClosed(false);
    const target = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
    if (target) {
      window.addEventListener('load', () => target.scrollIntoView({ behavior: 'instant', block: 'start' }), { once: true });
    }
  }

  if (openDoorsBtn) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    openDoorsBtn.addEventListener('click', () => {
      if (doorOverlay.classList.contains('bell-rung')) return;

      // 1. Ring the temple bell: it swings and lamplight floods the doorway
      if (window.weddingAudio) {
        window.weddingAudio.playTempleBell();
        // this tap also lets the soundtrack start by itself just after
        window.weddingAudio.unlock();
      }
      doorOverlay.classList.add('bell-rung');
      // coming back to the invitation later in this tab skips the gate
      try { sessionStorage.setItem('as-gate-open', '1'); } catch (e) { /* storage blocked */ }

      // 2. Then split open both halves of the gopuram
      setTimeout(() => {
        doorOverlay.classList.add('doors-opened');
        setGateClosed(false);
      }, reducedMotion ? 0 : 700);

      // 3. The soundtrack begins as the guest walks in, once the bell has
      //    mostly faded (only the first time, and not if they used the player)
      setTimeout(() => {
        if (window.weddingAudio) window.weddingAudio.autoStart();
      }, 1500);
    });
  }

  // Re-enter / close doors button
  if (reOpenDoorsBtn) {
    reOpenDoorsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'instant' });
      html.classList.remove('gate-skip');
      doorOverlay.classList.remove('doors-opened', 'bell-rung');
      setGateClosed(true);
    });
  }
}

/**
 * 2. Wedding Countdown Timer
 */
function initCountdownTimer() {
  const targetDate = new Date('2026-12-06T07:45:00+05:30').getTime();

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
  const defaultTitle = 'Abu & Sachin';
  const defaultVenue = 'Tap segment for Google Maps';

  const resetHub = () => {
    if (hubTitle) hubTitle.textContent = defaultTitle;
    if (hubVenue) hubVenue.textContent = defaultVenue;
    wheel.classList.remove('wheel-paused');
  };

  // Hover details are for mouse users only. On a touch screen a tap fires a
  // fake "mouseenter" that never gets a "mouseleave", which left the centre
  // text enlarged and the wheel frozen after returning from Google Maps.
  const canHover = window.matchMedia('(hover: hover)').matches;

  segments.forEach(seg => {
    if (canHover) {
      seg.addEventListener('mouseenter', () => {
        const title = seg.dataset.title;
        const venue = seg.dataset.venue;
        if (hubTitle && title) hubTitle.textContent = title;
        if (hubVenue && venue) hubVenue.textContent = venue;
        wheel.classList.add('wheel-paused');
      });

      seg.addEventListener('mouseleave', resetHub);
    }

    seg.addEventListener('click', () => {
      const mapUrl = seg.dataset.map;
      if (mapUrl) {
        window.open(mapUrl, '_blank', 'noopener,noreferrer');
      }
    });
  });

  // Coming back from the map (tab switch or browser back-forward cache)
  window.addEventListener('pageshow', resetHub);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resetHub();
  });
}

/**
 * 4. Cassette music player (with 2 rotating reels)
 */
function initCassettePlayer() {
  const playBtn = document.getElementById('cassette-play-toggle');
  const playIcon = document.getElementById('cassette-play-icon');
  const nextBtn = document.getElementById('cassette-next');
  const trackTitleEl = document.getElementById('cassette-track-title');
  const cassetteDeck = document.querySelector('.floating-cassette-widget');
  const cassetteToggleBtn = document.getElementById('cassette-toggle-widget');
  const quickSoundtrackBtn = document.getElementById('quick-soundtrack-toggle');
  const quickSoundtrackIcon = document.getElementById('quick-soundtrack-icon');
  const quickSoundtrackLabel = document.getElementById('quick-soundtrack-label');
  const musicSlider = document.getElementById('music-volume-slider');

  if (!window.weddingAudio) return;

  function updateTrackDisplay(track) {
    if (trackTitleEl && track) trackTitleEl.textContent = track.title;
  }

  window.weddingAudio.onTrackChange = (track) => {
    updateTrackDisplay(track);
  };

  window.weddingAudio.onPlayStateChange = (isPlaying) => {
    if (playIcon) {
      // Icon only: the play button is a small circle
      playIcon.textContent = isPlaying ? '❚❚' : '▶';
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

  // once the guest uses the player, the soundtrack no longer starts by itself
  const byGuest = (action) => () => {
    window.weddingAudio.userControlled = true;
    action();
  };
  const toggleMusic = byGuest(() => window.weddingAudio.toggleMusic());

  if (playBtn) playBtn.addEventListener('click', toggleMusic);
  if (quickSoundtrackBtn) quickSoundtrackBtn.addEventListener('click', toggleMusic);
  if (nextBtn) nextBtn.addEventListener('click', byGuest(() => window.weddingAudio.nextTrack()));

  const prevBtn = document.getElementById('cassette-prev');
  if (prevBtn) prevBtn.addEventListener('click', byGuest(() => window.weddingAudio.prevTrack()));

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

  updateTrackDisplay(window.weddingAudio.getCurrentTrack());
}

/**
 * 5. Mobile Navigation
 */
/**
 * Remember which section the guest was looking at, so "Back" on Our Story
 * and the Guest List (js/back-link.js) returns there
 */
function initSectionMemory() {
  // the invitation only (other pages share this script for the menu)
  if (!document.getElementById('temple-door-curtain')) return;
  const sections = document.querySelectorAll('main > section[id]');
  if (!sections.length) return;

  const remember = () => {
    timer = 0;
    if (document.documentElement.classList.contains('gate-closed')) return;
    const line = window.innerHeight * 0.4;
    for (const section of sections) {
      const r = section.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) {
        try { sessionStorage.setItem('as-last-section', section.id); } catch (e) { /* storage blocked */ }
        return;
      }
    }
  };

  let timer = 0;
  window.addEventListener('scroll', () => {
    if (!timer) timer = setTimeout(remember, 250);
  }, { passive: true });
  window.addEventListener('pagehide', remember);
}

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
