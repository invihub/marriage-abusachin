/**
 * Personalized South Indian Wedding RSVP Engine (Updated Clean Schema)
 * - Guest / Family Name recording (e.g. 'Sai and his family')
 * - Event attendance multi-select
 * - Number of people (approx)
 * - Personalized greeting confirmation card with exact phrase:
 *   "We look forward to celebrating with you."
 * - Organizer View with CSV Export
 */

class RsvpSystem {
  constructor() {
    this.storageKey = 'abu_sachin_wedding_rsvps_v2';
    this.form = document.getElementById('wedding-rsvp-form');
    this.confirmationModal = document.getElementById('rsvp-confirmation-modal');
    this.organizerModal = document.getElementById('organizer-modal');
    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

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
        events: ['haldi', 'sangeet', 'wedding_thoothukudi', 'wedding_chennai', 'reception_chennai'],
        peopleCount: 4,
        message: 'Heartiest congratulations Abu & Sachin! 11 years of love, can\'t wait for the grand celebration!',
        timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
      },
      {
        id: 'rsvp_sample_2',
        guestName: 'Karthik & Ananya (Toronto)',
        events: ['wedding_chennai', 'reception_chennai'],
        peopleCount: 2,
        message: 'Flying down from Canada! The snowy chapter was magical, now time for Chennai vibes!',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString()
      },
      {
        id: 'rsvp_sample_3',
        guestName: 'Dr. Meenakshi & Family (Tuticorin)',
        events: ['haldi', 'sangeet', 'wedding_thoothukudi'],
        peopleCount: 3,
        message: 'Looking forward to welcoming the groom to our Pearl City!',
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

    const checkedEvents = [];
    const eventCheckboxes = document.querySelectorAll('input[name="rsvp_events"]:checked');
    eventCheckboxes.forEach(cb => checkedEvents.push(cb.value));

    if (checkedEvents.length === 0) {
      alert('Please select at least one ceremony you will be attending.');
      return;
    }

    const peopleCount = parseInt(document.getElementById('rsvp-people')?.value || '2', 10);
    const message = document.getElementById('rsvp-wishes')?.value || '';

    const newRsvp = {
      id: 'rsvp_' + Date.now(),
      guestName,
      events: checkedEvents,
      peopleCount,
      message,
      timestamp: new Date().toISOString()
    };

    const currentList = this.getAllRsvps();
    currentList.unshift(newRsvp);
    this.saveRsvps(currentList);

    if (window.weddingAudio) {
      window.weddingAudio.playTempleBell();
    }

    this.showConfirmation(newRsvp);
    this.form.reset();
  }

  getEventNamesMap() {
    return {
      'haldi': 'Dec 5 · Haldi Ceremony (Thoothukudi)',
      'sangeet': 'Dec 5 · Sangeet & Musical Night (Thoothukudi)',
      'wedding_thoothukudi': 'Dec 6 · Wedding Tradition 1 (Thoothukudi)',
      'wedding_chennai': 'Dec 10 · Wedding Tradition 2 (Chennai)',
      'reception_chennai': 'Dec 11 · Grand Reception at The Leela Palace (Chennai)'
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

    // Exact requested wording
    if (phraseEl) {
      phraseEl.innerHTML = `<strong>"We look forward to celebrating with you."</strong>`;
    }

    if (eventsListEl) {
      const map = this.getEventNamesMap();
      eventsListEl.innerHTML = rsvp.events.map(evKey => `
        <li class="confirm-event-badge">
          <span>✨</span>
          <span>${map[evKey] || evKey}</span>
        </li>
      `).join('');
    }

    if (headcountEl) {
      headcountEl.textContent = `${rsvp.peopleCount} ${rsvp.peopleCount > 1 ? 'Guests' : 'Guest'} (Approx)`;
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

    let totalGuests = 0;
    list.forEach(r => {
      totalGuests += (r.peopleCount || 1);
    });

    if (countTotalEl) countTotalEl.textContent = list.length;
    if (countGuestsEl) countGuestsEl.textContent = totalGuests;

    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="empty-table-msg">No RSVPs recorded yet.</td></tr>`;
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
          <td><strong>${this.escapeHtml(r.guestName)}</strong></td>
          <td>${eventsStr}</td>
          <td>${r.peopleCount} People</td>
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
      'Ravi Kumar (Tuticorin Friends)',
      'Sneha & Vikram (Toronto Clan)'
    ];
    const pickedName = sampleNames[Math.floor(Math.random() * sampleNames.length)] + ' #' + Math.floor(Math.random() * 90 + 10);
    const newSample = {
      id: 'rsvp_' + Date.now(),
      guestName: pickedName,
      events: ['haldi', 'wedding_thoothukudi', 'reception_chennai'],
      peopleCount: Math.floor(Math.random() * 4) + 2,
      message: 'So excited to be part of Abu & Sachin’s big day!',
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

    const headers = ['S.No', 'Guest / Family Name', 'Attending Events', 'People Count (Approx)', 'Wishes / Message', 'RSVP Timestamp'];
    const rows = list.map((r, i) => [
      i + 1,
      `"${(r.guestName || '').replace(/"/g, '""')}"`,
      `"${r.events.join('; ')}"`,
      r.peopleCount || 1,
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
