/**
 * Personalized South Indian Wedding RSVP Engine
 * - Guest / Family Name recording (e.g. 'Sai and his family')
 * - Event attendance multi-select
 * - Number of people (approx)
 * - Saved to the Supabase `abu_sachin.rsvps` table (insert-only for the public)
 * - Personalized greeting confirmation card with exact phrase:
 *   "We look forward to celebrating with you."
 *
 * RSVPs are viewed / exported (CSV) in the Supabase Table Editor.
 * Connection settings come from js/config.js, generated from environment
 * variables by scripts/build-config.mjs.
 */

class RsvpSystem {
  constructor() {
    this.form = document.getElementById('wedding-rsvp-form');
    this.submitBtn = document.getElementById('submit-rsvp-btn');
    this.errorEl = document.getElementById('rsvp-form-error');
    this.confirmationModal = document.getElementById('rsvp-confirmation-modal');
    this.config = window.SITE_CONFIG || {};
    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const closeConfirmBtn = document.getElementById('close-confirm-modal-btn');
    if (closeConfirmBtn) {
      closeConfirmBtn.addEventListener('click', () => this.closeConfirmation());
    }
    if (this.confirmationModal) {
      this.confirmationModal.addEventListener('click', (e) => {
        if (e.target === this.confirmationModal) this.closeConfirmation();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeConfirmation();
    });
  }

  closeConfirmation() {
    if (this.confirmationModal) this.confirmationModal.classList.remove('active');
  }

  showError(text) {
    if (!this.errorEl) return;
    this.errorEl.textContent = text;
    this.errorEl.hidden = !text;
  }

  setSending(sending) {
    if (!this.submitBtn) return;
    this.submitBtn.disabled = sending;
    this.submitBtn.textContent = sending ? 'Sending your RSVP…' : 'Confirm Wedding RSVP';
  }

  async handleSubmit(e) {
    e.preventDefault();
    this.showError('');

    // Hidden field only bots fill in: pretend success, save nothing
    const honeypot = document.getElementById('rsvp-website');
    if (honeypot && honeypot.value) return;

    const guestNameInput = document.getElementById('rsvp-guest-name');
    const guestName = guestNameInput ? guestNameInput.value.trim() : '';

    if (!guestName) {
      this.showError('Please enter your name or family name (e.g. Sai and his family).');
      if (guestNameInput) guestNameInput.focus();
      return;
    }

    const checkedEvents = [];
    const eventCheckboxes = document.querySelectorAll('input[name="rsvp_events"]:checked');
    eventCheckboxes.forEach(cb => checkedEvents.push(cb.value));

    if (checkedEvents.length === 0) {
      this.showError('Please select at least one ceremony you will be attending.');
      return;
    }

    const peopleCount = parseInt(document.getElementById('rsvp-people')?.value || '2', 10);
    const message = (document.getElementById('rsvp-wishes')?.value || '').trim();

    const rsvp = { guestName, events: checkedEvents, peopleCount, message };

    this.setSending(true);
    try {
      await this.saveRsvp(rsvp);
    } catch (err) {
      console.error('RSVP not saved', err);
      this.showError('Sorry, we could not send your RSVP. Please check your internet connection and try again.');
      return;
    } finally {
      this.setSending(false);
    }

    if (window.weddingAudio) {
      window.weddingAudio.playTempleBell();
    }

    this.showConfirmation(rsvp);
    this.form.reset();
  }

  async saveRsvp(rsvp) {
    const { supabaseUrl, supabasePublishableKey, supabaseSchema } = this.config;
    if (!supabaseUrl || !supabasePublishableKey || !supabaseSchema) {
      throw new Error('Missing js/config.js - run: node scripts/build-config.mjs');
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/rsvps`, {
      method: 'POST',
      headers: {
        'apikey': supabasePublishableKey,
        // This site's tables live in their own schema (e.g. abu_sachin.rsvps)
        'Content-Profile': supabaseSchema,
        'Content-Type': 'application/json',
        // The public can insert but not read, so don't ask for the row back
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        guest_name: rsvp.guestName.slice(0, 120),
        events: rsvp.events,
        people_count: rsvp.peopleCount,
        message: rsvp.message ? rsvp.message.slice(0, 1000) : null
      })
    });

    if (!res.ok) {
      throw new Error(`Supabase responded ${res.status}: ${await res.text()}`);
    }
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
    const modal = this.confirmationModal;
    if (!modal) return;

    const nameEl = document.getElementById('confirm-guest-name');
    const eventsListEl = document.getElementById('confirm-events-list');
    const headcountEl = document.getElementById('confirm-headcount');

    if (nameEl) nameEl.textContent = rsvp.guestName;

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
}

document.addEventListener('DOMContentLoaded', () => {
  window.weddingRsvp = new RsvpSystem();
});
