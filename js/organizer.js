/**
 * Guest List (organizer.html): the RSVPs, laid out for planning the wedding
 *
 * - Sign in: what the organizer types goes to Supabase
 *   (abu_sachin.organizer_login, see supabase/organizer.sql), which checks it
 *   against a stored hash. The password is not in this code and is not kept
 *   in the browser; Supabase hands back a sign-in (token) that lasts 12 hours
 *   and is kept for this browser tab only.
 * - The token reads the RSVPs (abu_sachin.organizer_rsvps). The page shows the
 *   totals, a card per ceremony (people + families), the guest list (search,
 *   filter by ceremony, download as a spreadsheet) and the guests' wishes.
 * - Guests type the names and wishes, so they are always shown as plain text.
 */

// The ceremonies, in date order (same names, times and venues as the
// celebration wheel on the invitation). key = the value saved with each RSVP.
// colour = the wheel's colour (stripes, dots, bars); ink = a darker shade of it for text.
const ORGANIZER_EVENTS = [
  { key: 'haldi_sangeet', short: 'Haldi & Sangeet', name: 'Haldi & Sangeet', when: 'Sat 5 Dec · 3:00 PM', venue: 'AVM Kamalavel Mahal, Ettayapuram Road, Thoothukudi', colour: '#D4A622', ink: '#8A5A00' },
  { key: 'wedding_thoothukudi', short: 'Wedding · Thoothukudi', name: 'Wedding · Tradition 1', when: 'Sun 6 Dec · 7:45 AM', venue: 'AVM Kamalavel Mahal, Ettayapuram Road, Thoothukudi', colour: '#B1233A', ink: '#9E1A31' },
  { key: 'wedding_marakkanam', short: 'Wedding · Marakkanam', name: 'Wedding · Tradition 2', when: 'Thu 10 Dec · 4:30 AM', venue: 'Ellaiamman Temple, Sandrorpalayam, Marakkanam', colour: '#1676C4', ink: '#0A5A9E' },
  { key: 'reception_chennai', short: 'Reception', name: 'Reception', when: 'Fri 11 Dec · 6:00 PM', venue: 'Madras Race Club, Guindy Lodge, Chennai', colour: '#2A9150', ink: '#176B3A' }
];

// RSVPs sent before the plan changed used the old ceremony names: Haldi and
// Sangeet were separate, and the second wedding was in Chennai. They are
// counted under the current ceremonies.
const LEGACY_EVENT_KEYS = {
  haldi: 'haldi_sangeet',
  sangeet: 'haldi_sangeet',
  wedding_chennai: 'wedding_marakkanam'
};

// The RSVP form's last choice is "6+ People (Family)", saved as 6
const PEOPLE_MAX_CHOICE = 6;
const TOKEN_KEY = 'as-organizer-token';

class GuestListBoard {
  constructor() {
    this.config = window.SITE_CONFIG || {};
    this.rsvps = [];
    this.filter = 'all';
    this.query = '';

    const $ = (id) => document.getElementById(id);
    this.el = {
      subtitle: $('org-subtitle'),
      login: $('org-login'),
      loginForm: $('org-login-form'),
      password: $('org-password'),
      loginError: $('org-login-error'),
      loginBtn: $('org-login-btn'),
      board: $('org-board'),
      updated: $('org-updated'),
      refresh: $('org-refresh'),
      signout: $('org-signout'),
      guests: $('org-total-guests'),
      families: $('org-total-families'),
      wishesCount: $('org-total-wishes'),
      events: $('org-events'),
      search: $('org-search'),
      chips: $('org-chips'),
      count: $('org-count'),
      list: $('org-guests'),
      guestsSection: $('org-guests-section'),
      exportBtn: $('org-export'),
      wishes: $('org-wishes'),
      wishesSection: $('org-wishes-section')
    };

    this.init();
  }

  init() {
    this.el.loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.signIn();
    });
    this.el.refresh.addEventListener('click', () => this.load());
    this.el.signout.addEventListener('click', () => this.signOut());
    this.el.search.addEventListener('input', () => {
      this.query = this.el.search.value.trim().toLowerCase();
      this.renderGuests();
    });
    this.el.exportBtn.addEventListener('click', () => this.download());
    this.buildChips();

    if (!this.config.supabaseUrl) {
      this.showLogin('This page needs js/config.js (run: node scripts/build-config.mjs).');
      this.el.loginBtn.disabled = true;
      return;
    }
    if (this.token()) this.load();
    else this.showLogin();
  }

  /* ------------------------------------------------------------ Supabase */

  async rpc(name, body) {
    const { supabaseUrl, supabasePublishableKey, supabaseSchema } = this.config;
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'apikey': supabasePublishableKey,
        'Content-Profile': supabaseSchema,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Supabase responded ${res.status}: ${await res.text()}`);
    return res.json();
  }

  // The sign-in, kept for this tab (and in memory if the browser blocks storage)
  token(value) {
    if (value === undefined) {
      try { return sessionStorage.getItem(TOKEN_KEY) || this.memoryToken; } catch (e) { return this.memoryToken; }
    }
    this.memoryToken = value;
    try {
      if (value) sessionStorage.setItem(TOKEN_KEY, value);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* storage blocked: sign in again after a refresh */ }
    return value;
  }

  async signIn() {
    const password = this.el.password.value;
    if (!password) {
      this.showLogin('Please enter the password.');
      return;
    }
    this.el.loginBtn.disabled = true;
    this.el.loginBtn.textContent = 'Checking…';
    try {
      const r = await this.rpc('organizer_login', { password });
      if (!r.ok) {
        const reasons = {
          wrong: 'That password isn\'t right. Please try again.',
          locked: 'Too many wrong tries. Please wait 10 minutes and try again.',
          unset: 'The password hasn\'t been set up yet (see supabase/organizer.sql).'
        };
        this.showLogin(reasons[r.reason] || 'Could not sign in. Please try again.');
        this.el.password.select();
        return;
      }
      this.el.password.value = '';
      this.token(r.token);
      await this.load();
    } catch (err) {
      console.error('Sign in failed', err);
      this.showLogin('Could not reach the guest list. Please check the internet connection and try again.');
    } finally {
      this.el.loginBtn.disabled = false;
      this.el.loginBtn.textContent = 'Open the guest list';
    }
  }

  async load() {
    const token = this.token();
    if (!token) {
      this.showLogin();
      return;
    }
    this.el.refresh.disabled = true;
    this.el.updated.textContent = 'Loading…';
    try {
      const r = await this.rpc('organizer_rsvps', { session_token: token });
      if (!r.ok) {
        this.token(null);
        this.showLogin('Your sign-in has ended. Please enter the password again.');
        return;
      }
      this.rsvps = (r.rsvps || []).map((row) => ({
        ...row,
        events: [...new Set((row.events || []).map(key => LEGACY_EVENT_KEYS[key] || key))]
      }));
      this.showBoard();
    } catch (err) {
      console.error('Guest list not loaded', err);
      this.el.updated.textContent = 'Could not load the guest list. Check the connection and tap Refresh.';
      if (this.el.board.hidden) this.showLogin('Could not reach the guest list. Please try again.');
    } finally {
      this.el.refresh.disabled = false;
    }
  }

  async signOut() {
    const token = this.token();
    this.token(null);
    this.rsvps = [];
    this.showLogin();
    if (token) {
      try { await this.rpc('organizer_logout', { session_token: token }); } catch (e) { /* ends by itself */ }
    }
  }

  /* --------------------------------------------------------------- views */

  showLogin(message = '') {
    this.el.board.hidden = true;
    this.el.login.hidden = false;
    this.el.subtitle.textContent = 'Enter the organizers\' password to see who is coming.';
    this.el.loginError.textContent = message;
    this.el.loginError.hidden = !message;
    if (!message) this.el.password.focus({ preventScroll: true });
  }

  showBoard() {
    this.el.login.hidden = true;
    this.el.board.hidden = false;
    this.el.subtitle.textContent = 'Who is coming to each ceremony, from the RSVPs.';
    const now = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date());
    this.el.updated.textContent = `Updated at ${now}`;
    this.render();
  }

  render() {
    const all = this.rsvps;
    const people = this.people(all);
    this.el.guests.textContent = people.text;
    this.el.families.textContent = String(all.length);
    this.el.wishesCount.textContent = String(all.filter(r => r.message).length);
    this.renderEvents(people.count);
    this.renderGuests();
    this.renderWishes();
  }

  // Head count; "6+" families count as 6, so the total is "at least" (shown as 52+)
  people(rows) {
    const count = rows.reduce((sum, r) => sum + (r.people_count || 0), 0);
    const open = rows.some(r => r.people_count >= PEOPLE_MAX_CHOICE);
    return { count, text: `${count}${open ? '+' : ''}` };
  }

  renderEvents(totalPeople) {
    const box = this.el.events;
    box.textContent = '';
    ORGANIZER_EVENTS.forEach((ev) => {
      const rows = this.rsvps.filter(r => (r.events || []).includes(ev.key));
      const people = this.people(rows);

      const card = el('button', 'org-card org-event');
      card.type = 'button';
      card.style.setProperty('--event-colour', ev.colour);
      card.style.setProperty('--event-ink', ev.ink);
      card.setAttribute('aria-pressed', String(this.filter === ev.key));
      card.setAttribute('aria-label', `${ev.name}, ${ev.when}: ${people.text} guests from ${rows.length} RSVPs. Show who is coming.`);

      const head = el('span', 'org-event-head');
      head.append(el('span', 'org-event-when', ev.when), el('span', 'org-event-name', ev.name), el('span', 'org-event-venue', ev.venue));

      const numbers = el('span', 'org-event-numbers');
      numbers.append(el('strong', '', people.text), el('span', '', people.count === 1 ? 'guest' : 'guests'),
        el('span', 'org-event-families', `${rows.length} ${rows.length === 1 ? 'RSVP' : 'RSVPs'}`));

      // share of everyone who replied
      const bar = el('span', 'org-event-bar');
      const fill = el('span', 'org-event-bar-fill');
      fill.style.width = `${totalPeople ? Math.round((people.count / totalPeople) * 100) : 0}%`;
      bar.append(fill);

      card.append(head, numbers, bar);
      card.addEventListener('click', () => {
        this.setFilter(this.filter === ev.key ? 'all' : ev.key);
        this.el.guestsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      box.append(card);
    });
  }

  buildChips() {
    const box = this.el.chips;
    const chip = (key, label, ev) => {
      const b = el('button', 'org-chip', label);
      b.type = 'button';
      b.dataset.key = key;
      if (ev) {
        b.style.setProperty('--event-colour', ev.colour);
        b.style.setProperty('--event-ink', ev.ink);
      }
      b.addEventListener('click', () => this.setFilter(key));
      box.append(b);
    };
    chip('all', 'Everyone');
    ORGANIZER_EVENTS.forEach(ev => chip(ev.key, ev.short, ev));
    this.updateChips();
  }

  setFilter(key) {
    this.filter = key;
    this.updateChips();
    this.el.events.querySelectorAll('.org-event').forEach((card, i) => {
      card.setAttribute('aria-pressed', String(ORGANIZER_EVENTS[i].key === key));
    });
    this.renderGuests();
  }

  updateChips() {
    this.el.chips.querySelectorAll('.org-chip').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.key === this.filter));
    });
  }

  visibleGuests() {
    return this.rsvps.filter(r => {
      if (this.filter !== 'all' && !(r.events || []).includes(this.filter)) return false;
      if (!this.query) return true;
      return `${r.guest_name} ${r.message || ''}`.toLowerCase().includes(this.query);
    });
  }

  renderGuests() {
    const rows = this.visibleGuests();
    const list = this.el.list;
    list.textContent = '';

    const ev = ORGANIZER_EVENTS.find(e => e.key === this.filter);
    const people = this.people(rows);
    this.el.count.textContent = this.rsvps.length
      ? `${rows.length} ${rows.length === 1 ? 'RSVP' : 'RSVPs'} · ${people.text} ${people.count === 1 ? 'guest' : 'guests'}${ev ? ` at the ${ev.short}` : ''}${this.query ? ` matching “${this.el.search.value.trim()}”` : ''}`
      : '';

    if (!rows.length) {
      list.append(el('li', 'org-empty', this.rsvps.length
        ? 'No one matches. Try another name or ceremony.'
        : 'No RSVPs yet. They appear here as guests reply.'));
      return;
    }

    rows.forEach((r) => {
      const item = el('li', 'org-guest');

      const top = el('div', 'org-guest-top');
      top.append(el('strong', 'org-guest-name', r.guest_name),
        el('span', 'org-guest-people', r.people_count >= PEOPLE_MAX_CHOICE ? '6+ people' : `${r.people_count} ${r.people_count === 1 ? 'person' : 'people'}`));

      const tags = el('div', 'org-guest-events');
      ORGANIZER_EVENTS.forEach(e => {
        if (!(r.events || []).includes(e.key)) return;
        const tag = el('span', 'org-tag', e.short);
        tag.style.setProperty('--event-colour', e.colour);
        tags.append(tag);
      });

      item.append(top, tags);
      if (r.message) item.append(el('p', 'org-guest-wish', `“${r.message}”`));
      const contact = [r.phone, r.email].filter(Boolean).join(' · ');
      if (contact) item.append(el('p', 'org-guest-contact', contact));
      item.append(el('span', 'org-guest-date', `Replied ${formatDate(r.created_at)}`));
      list.append(item);
    });
  }

  renderWishes() {
    const box = this.el.wishes;
    box.textContent = '';
    const wishes = this.rsvps.filter(r => r.message);
    this.el.wishesSection.hidden = !wishes.length;
    wishes.forEach((r) => {
      const card = el('figure', 'org-card org-wish');
      card.append(el('blockquote', '', r.message), el('figcaption', '', `— ${r.guest_name}`));
      box.append(card);
    });
  }

  /* ------------------------------------------------- spreadsheet download */

  download() {
    const header = ['Replied', 'Guest / family', 'People', ...ORGANIZER_EVENTS.map(e => `${e.short} (${e.when})`), 'Wish', 'Phone', 'Email'];
    const lines = [header].concat(this.rsvps.map(r => [
      formatDate(r.created_at),
      r.guest_name,
      r.people_count >= PEOPLE_MAX_CHOICE ? '6+' : String(r.people_count),
      ...ORGANIZER_EVENTS.map(e => ((r.events || []).includes(e.key) ? 'Yes' : '')),
      r.message || '',
      r.phone || '',
      r.email || ''
    ]));
    const csv = lines.map(cols => cols.map(csvCell).join(',')).join('\r\n');
    // the BOM lets Excel read Tamil names and emoji correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `abu-sachin-guest-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}

/* ------------------------------------------------------------------ helpers */

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso));
}

// Quote for CSV; a cell starting with = + - @ is kept as text, so a
// spreadsheet never runs it as a formula
function csvCell(value) {
  let s = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

document.addEventListener('DOMContentLoaded', () => {
  window.guestListBoard = new GuestListBoard();
});
