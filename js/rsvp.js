/**
 * Personalized South Indian Wedding RSVP Engine
 * Handles:
 * - Multi-event selection (Haldi, Sangeet, Wedding 1, Wedding 2, Reception)
 * - Guest & Family name recording (e.g. 'Sai and his family')
 * - Headcount & Feast preferences
 * - Personalized greeting confirmation card with exact requested phrase:
 *   "We look forward to celebrating with you."
 * - Persistent storage in localStorage
 * - Organizer View Drawer / Table with CSV Export
 */

class RsvpSystem {
  constructor() {
    this.storageKey = 'abu_sachin_wedding_rsvps_v1';
    this.form = document.getElementById('wedding-rsvp-form');
    this.confirmationModal = document.getElementById('rsvp-confirmation-modal');
    this.organizerModal = document.getElementById('organizer-modal');
    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Preload sample RSVPs if empty so the organizer view has immediate demonstration data
    if (!localStorage.getItem(this.storageKey)) {
      this.seedInitialData();
    }

    this.bindOrganizerControls();
  }

  seedInitialData() {
    const samples = [
      {
        id: 'rsvp_sample_1',
        guestName: 'Sai and his family',
        phone: '+91 98401 23456',
        email: 'sai.family@example.com',
        events: ['haldi', 'sangeet', 'wedding_thoothukudi', 'wedding_chennai', 'reception_chennai'],
        adults: 4,
        children: 1,
        diet: 'traditional_veg',
        message: 'Heartiest congratulations Abu & Sachin! 11 years of love, can\'t wait for the grand celebration!',
        timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
      },
      {
        id: 'rsvp_sample_2',
        guestName: 'Karthik & Ananya (Toronto Gang)',
        phone: '+1 416 555 0192',
        email: 'karthik.toronto@example.com',
        events: ['wedding_chennai', 'reception_chennai'],
        adults: 2,
        children: 0,
        diet: 'traditional_nonveg',
        message: 'Flying down from Canada! The snowy Toronto chapter was legendary, now time for Chennai vibes!',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: 'rsvp_sample_3',
        guestName: 'Dr. Meenakshi & Family (Tuticorin)',
        phone: '+91 94431 87654',
        email: 'meenakshi.doc@example.com',
        events: ['haldi', 'sangeet', 'wedding_thoothukudi'],
        adults: 3,
        children: 0,
        diet: 'traditional_veg',
        message: 'So proud of Abu! Looking forward to welcoming the Chennai groom Sachin to our Pearl City!',
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
      }
    ];
    localStorage.setItem(this.storageKey, JSON.stringify(samples));
  }

  getAllRsvps() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading RSVPs', e);
      return [];
    }
  }

  saveRsvps(list) {
    localStorage.setItem(this.storageKey, JSON.stringify(list));
  }

  handleSubmit(e) {
    e.preventDefault();

    const guestNameInput = document.getElementById('rsvp-guest-name');
    const guestName = guestNameInput ? guestNameInput.value.trim() : '';

    if (!guestName) {
      alert('Please enter your name or family name (e.g. Sai and his family).');
      if (guestNameInput) guestNameInput.focus();
      return;
    }

    // Checked events
    const checkedEvents = [];
    const eventCheckboxes = document.querySelectorAll('input[name="rsvp_events"]:checked');
    eventCheckboxes.forEach(cb => checkedEvents.push(cb.value));

    if (checkedEvents.length === 0) {
      alert('Please select at least one ceremony you will be gracing with your presence.');
      return;
    }

    const adults = parseInt(document.getElementById('rsvp-adults')?.value || '1', 10);
    const children = parseInt(document.getElementById('rsvp-children')?.value || '0', 10);
    const diet = document.getElementById('rsvp-diet')?.value || 'traditional_veg';
    const message = document.getElementById('rsvp-wishes')?.value || '';
    const phone = document.getElementById('rsvp-phone')?.value || '';
    const email = document.getElementById('rsvp-email')?.value || '';

    const newRsvp = {
      id: 'rsvp_' + Date.now(),
      guestName,
      phone,
      email,
      events: checkedEvents,
      adults,
      children,
      diet,
      message,
      timestamp: new Date().toISOString()
    };

    const currentList = this.getAllRsvps();
    currentList.unshift(newRsvp);
    this.saveRsvps(currentList);

    // Trigger marigold petal shower celebrating the RSVP
    if (window.petalShower) {
      window.petalShower.triggerBurst(80, 5000);
    }
    if (window.weddingAudio) {
      window.weddingAudio.playTempleBell();
    }

    // Show personalized confirmation modal
    this.showConfirmation(newRsvp);

    // Reset form
    this.form.reset();
  }

  getEventNamesMap() {
    return {
      'haldi': 'Haldi Ceremony (Dec 5 · Thoothukudi)',
      'sangeet': 'Sangeet & Musical Night (Dec 5 · Thoothukudi)',
      'wedding_thoothukudi': 'Wedding Tradition 1 (Dec 6 · Thoothukudi)',
      'wedding_chennai': 'Wedding Tradition 2 (Dec 10 · Chennai)',
      'reception_chennai': 'Grand Reception at The Leela Palace (Dec 11 · Chennai)'
    };
  }

  showConfirmation(rsvp) {
    const modal = document.getElementById('rsvp-confirmation-modal');
    if (!modal) return;

    const nameEl = document.getElementById('confirm-guest-name');
    const eventsListEl = document.getElementById('confirm-events-list');
    const headcountEl = document.getElementById('confirm-headcount');
    const phraseEl = document.getElementById('confirm-exact-phrase');

    if (nameEl) nameEl.textContent = rsvp.guestName;

    // Exact requested wording: "We look forward to celebrating with you."
    if (phraseEl) {
      phraseEl.innerHTML = `<strong>"We look forward to celebrating with you."</strong>`;
    }

    if (eventsListEl) {
      const map = this.getEventNamesMap();
      eventsListEl.innerHTML = rsvp.events.map(evKey => `
        <li class="confirm-event-badge">
          <span class="badge-icon">🪔</span>
          <span>${map[evKey] || evKey}</span>
        </li>
      `).join('');
    }

    if (headcountEl) {
      const totalGuests = rsvp.adults + rsvp.children;
      headcountEl.textContent = `${totalGuests} Guest${totalGuests > 1 ? 's' : ''} (${rsvp.adults} Adults${rsvp.children > 0 ? `, ${rsvp.children} Children` : ''})`;
    }

    modal.classList.add('active');
  }

  bindOrganizerControls() {
    const openBtn = document.getElementById('open-organizer-view-btn');
    const closeBtn = document.getElementById('close-organizer-modal-btn');
    const exportBtn = document.getElementById('export-csv-btn');
    const addSampleBtn = document.getElementById('add-sample-rsvp-btn');
    const clearBtn = document.getElementById('clear-all-rsvps-btn');

    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openOrganizerModal();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('organizer-modal');
        if (modal) modal.classList.remove('active');
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportCsv());
    }

    if (addSampleBtn) {
      addSampleBtn.addEventListener('click', () => {
        this.addRandomSample();
        this.renderOrganizerTable();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all RSVPs?')) {
          localStorage.removeItem(this.storageKey);
          this.renderOrganizerTable();
        }
      });
    }

    // Close confirmation modal
    const closeConfirmBtn = document.getElementById('close-confirm-modal-btn');
    if (closeConfirmBtn) {
      closeConfirmBtn.addEventListener('click', () => {
        const modal = document.getElementById('rsvp-confirmation-modal');
        if (modal) modal.classList.remove('active');
      });
    }
  }

  openOrganizerModal() {
    const modal = document.getElementById('organizer-modal');
    if (!modal) return;
    this.renderOrganizerTable();
    modal.classList.add('active');
  }

  renderOrganizerTable() {
    const list = this.getAllRsvps();
    const tableBody = document.getElementById('organizer-table-body');
    const countTotalEl = document.getElementById('org-count-total');
    const countGuestsEl = document.getElementById('org-count-guests');
    const countTuticorinEl = document.getElementById('org-count-tuticorin');
    const countChennaiEl = document.getElementById('org-count-chennai');

    let totalGuests = 0;
    let tuticorinAttendees = 0;
    let chennaiAttendees = 0;

    list.forEach(r => {
      const gCount = (r.adults || 1) + (r.children || 0);
      totalGuests += gCount;
      if (r.events.includes('haldi') || r.events.includes('sangeet') || r.events.includes('wedding_thoothukudi')) {
        tuticorinAttendees += gCount;
      }
      if (r.events.includes('wedding_chennai') || r.events.includes('reception_chennai')) {
        chennaiAttendees += gCount;
      }
    });

    if (countTotalEl) countTotalEl.textContent = list.length;
    if (countGuestsEl) countGuestsEl.textContent = totalGuests;
    if (countTuticorinEl) countTuticorinEl.textContent = tuticorinAttendees;
    if (countChennaiEl) countChennaiEl.textContent = chennaiAttendees;

    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="empty-table-msg">No RSVPs recorded yet. Guest submissions will appear here automatically.</td></tr>`;
      return;
    }

    const eventShortNames = {
      'haldi': 'Haldi',
      'sangeet': 'Sangeet',
      'wedding_thoothukudi': 'Wedding (Tuticorin)',
      'wedding_chennai': 'Wedding (Chennai)',
      'reception_chennai': 'Reception (Leela)'
    };

    tableBody.innerHTML = list.map((r, index) => {
      const dateStr = new Date(r.timestamp).toLocaleDateString('en-IN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const eventsStr = r.events.map(k => `<span class="table-event-tag">${eventShortNames[k] || k}</span>`).join(' ');

      return `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${this.escapeHtml(r.guestName)}</strong><br><small class="text-muted">${this.escapeHtml(r.phone || r.email || '')}</small></td>
          <td>${eventsStr}</td>
          <td>${r.adults} Adults${r.children > 0 ? `, ${r.children} Kids` : ''}</td>
          <td><span class="diet-pill">${r.diet === 'traditional_veg' ? 'Traditional Veg' : 'Coastal Virundhu'}</span></td>
          <td><span class="guest-wishes-cell" title="${this.escapeHtml(r.message)}">${this.escapeHtml(r.message || '—')}</span></td>
          <td><small>${dateStr}</small></td>
        </tr>
      `;
    }).join('');
  }

  addRandomSample() {
    const sampleNames = [
      'Gokul & Deepa',
      'Arun, Priya and Family (KCG Alumni)',
      'Uncle Sundaram & Family (Chennai)',
      'Ravi Kumar (Tuticorin Cashew Trade Friends)',
      'Sneha & Vikram (Toronto Maple Clan)'
    ];
    const pickedName = sampleNames[Math.floor(Math.random() * sampleNames.length)] + ' #' + Math.floor(Math.random() * 90 + 10);
    const newSample = {
      id: 'rsvp_' + Date.now(),
      guestName: pickedName,
      phone: '+91 99' + Math.floor(10000000 + Math.random() * 90000000),
      email: 'guest@example.com',
      events: ['haldi', 'wedding_thoothukudi', 'reception_chennai'],
      adults: 2,
      children: 1,
      diet: 'traditional_veg',
      message: 'So excited to be a part of Abu & Sachin’s big day!',
      timestamp: new Date().toISOString()
    };
    const current = this.getAllRsvps();
    current.unshift(newSample);
    this.saveRsvps(current);
  }

  exportCsv() {
    const list = this.getAllRsvps();
    if (list.length === 0) {
      alert('No RSVPs to export.');
      return;
    }

    const headers = ['S.No', 'Guest / Family Name', 'Contact', 'Attending Events', 'Adults', 'Children', 'Total Guests', 'Feast Preference', 'Wishes / Message', 'RSVP Timestamp'];
    const rows = list.map((r, i) => [
      i + 1,
      `"${(r.guestName || '').replace(/"/g, '""')}"`,
      `"${((r.phone || '') + ' ' + (r.email || '')).trim().replace(/"/g, '""')}"`,
      `"${r.events.join('; ')}"`,
      r.adults || 1,
      r.children || 0,
      (r.adults || 1) + (r.children || 0),
      `"${r.diet}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${r.timestamp}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Abu_and_Sachin_Wedding_RSVP_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.weddingRsvp = new RsvpSystem();
});
