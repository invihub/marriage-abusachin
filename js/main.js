/**
 * Main Application Script for Abu & Sachin's Wedding Invitation
 * Handles:
 * - Temple Door split-open ceremonial entrance with bell chime & petal shower
 * - Wedding Muhurtham Countdown Timer
 * - OK Kanmani Floating Cassette Player & Rain Controls
 * - Add to Google Calendar & Downloadable .ICS Calendar generator
 * - Smooth scroll, navigation indicators, and UI micro-interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initTempleDoors();
  initCountdownTimer();
  initCassettePlayer();
  initCalendarActions();
  initMobileNav();
});

/**
 * 1. Festive Temple Entrance & Auspicious Split Doors
 */
function initTempleDoors() {
  const openDoorsBtn = document.getElementById('open-doors-btn');
  const doorOverlay = document.getElementById('temple-door-curtain');
  const reOpenDoorsBtn = document.getElementById('revisit-doors-btn');

  if (openDoorsBtn && doorOverlay) {
    openDoorsBtn.addEventListener('click', () => {
      // 1. Play Auspicious South Indian Temple Bell Chime
      if (window.weddingAudio) {
        window.weddingAudio.playTempleBell();
      }

      // 2. Shower golden marigold petals and white jasmine
      if (window.petalShower) {
        window.petalShower.triggerBurst(150, 9000);
      }

      // 3. Split open the grand carved wooden doors
      doorOverlay.classList.add('doors-opened');

      // 4. Start gentle ambient rain or OK Kanmani melody after doors part
      setTimeout(() => {
        if (window.weddingAudio && !window.weddingAudio.isPlaying) {
          window.weddingAudio.play();
        }
      }, 1600);
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
  // Target date: Dec 6, 2026 09:45:00 IST
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
 * 3. OK Kanmani Jukebox & Rain Atmosphere Player
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

  // Chennai Rain Atmosphere Toggle
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

  // Toggle cassette player drawer
  if (cassetteToggleBtn && cassetteDeck) {
    cassetteToggleBtn.addEventListener('click', () => {
      cassetteDeck.classList.toggle('widget-minimized');
    });
  }

  // Real-time equalizer visualizer animation loop
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

  // Initial display
  updateTrackDisplay(window.weddingAudio.getCurrentTrack());
}

/**
 * 4. Calendar Integration: Direct Google Calendar Links & Dynamic .ICS Download
 */
function initCalendarActions() {
  const eventsData = {
    'haldi': {
      title: 'Abu & Sachin Wedding: Haldi Ceremony',
      start: '20261205T093000',
      end: '20261205T123000',
      location: 'Pearl Beach Greens, Harbour Road, Thoothukudi, Tamil Nadu',
      description: 'Festive turmeric ceremony, traditional music, and joyful blessings for Abu & Sachin.'
    },
    'sangeet': {
      title: 'Abu & Sachin Wedding: Sangeet & Musical Night',
      start: '20261205T183000',
      end: '20261205T223000',
      location: 'Grand Ballroom, Regency Tuticorin by GRT Hotels, Thoothukudi',
      description: 'OK Kanmani retro hits, dhol, dance, dinner, and celebration under the stars.'
    },
    'wedding_thoothukudi': {
      title: 'Abu & Sachin Wedding: Tradition 1 (Thoothukudi)',
      start: '20261206T090000',
      end: '20261206T130000',
      location: 'Sea-Breeze Thirumana Mandapam, Beach Road, Thoothukudi, Tamil Nadu',
      description: 'Auspicious Muhurtham: 09:45 AM. Two coastal families uniting in sacred tradition.'
    },
    'wedding_chennai': {
      title: 'Abu & Sachin Wedding: Tradition 2 (Chennai)',
      start: '20261210T073000',
      end: '20261210T120000',
      location: 'Sri Kapaleeshwarar Heritage Hall, Mylapore, Chennai, Tamil Nadu',
      description: 'Auspicious Muhurtham: 08:15 AM. Vedic rites, nadaswaram, and traditional breakfast feast.'
    },
    'reception_chennai': {
      title: 'Abu & Sachin Grand Wedding Reception',
      start: '20261211T183000',
      end: '20261211T230000',
      location: 'The Leela Palace Chennai, Adyar Seaface, MRC Nagar, Chennai',
      description: 'Grand Wedding Reception celebrating Abu & Sachin 11-Year Journey. Dinner and live orchestra.'
    }
  };

  // Google Calendar Buttons
  document.querySelectorAll('.btn-add-gcal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const eventKey = btn.dataset.eventKey;
      const ev = eventsData[eventKey];
      if (!ev) return;

      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${ev.start}/${ev.end}&details=${encodeURIComponent(ev.description)}&location=${encodeURIComponent(ev.location)}`;
      window.open(gcalUrl, '_blank', 'noopener,noreferrer');
    });
  });

  // Download .ICS Buttons
  document.querySelectorAll('.btn-download-ics').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const eventKey = btn.dataset.eventKey;
      const ev = eventsData[eventKey];
      if (!ev) return;

      downloadIcsFile(ev);
    });
  });
}

function downloadIcsFile(ev) {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Abu and Sachin Wedding//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@abu-sachin-wedding.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Asia/Kolkata:${ev.start}`,
    `DTEND;TZID=Asia/Kolkata:${ev.end}`,
    `SUMMARY:${ev.title}`,
    `DESCRIPTION:${ev.description}`,
    `LOCATION:${ev.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ev.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 5. Mobile Navigation & Smooth Scroll
 */
function initMobileNav() {
  const menuToggle = document.getElementById('mobile-nav-toggle');
  const navMenu = document.querySelector('.site-nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('nav-open');
    });

    // Close when clicking nav links
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('nav-open');
      });
    });
  }

  // Petal shower burst on clicking gold badge
  const festiveBadge = document.querySelector('.festive-shubh-badge');
  if (festiveBadge && window.petalShower) {
    festiveBadge.addEventListener('click', () => {
      window.petalShower.triggerBurst(60, 4000);
      if (window.weddingAudio) window.weddingAudio.playTempleBell(659.25);
    });
  }
}
