/**
 * RSVP ticket: the RSVP as a Pearl City Express ticket, all on one page.
 *
 * - Only the name is needed. Ceremonies and seats are optional: someone who
 *   can't come can send just their name, or their name and a blessing.
 *   With no ceremony ticked the seats rest; their number is still saved but
 *   the Guest List doesn't count it (js/organizer.js).
 * - Sending it stamps the ticket and prints a landscape railway ticket in
 *   the train coaches' colours (a ~200 KB JPEG drawn on a canvas, no library) that the guest can
 *   download, or share on phones that can. It carries a QR code to the venue
 *   of each place they're coming to: Thoothukudi (Haldi & Sangeet and the
 *   Wedding share it) and/or Chennai (the Reception). The QR patterns are
 *   made ahead of time by scripts/build-qr.py (js/venue-qr.js).
 *   The picture is drawn once, just after sending, so the buttons react at once.
 * - Runs only while #rsvp-section has data-rsvp="ticket" (index.html).
 *   ?rsvp=classic or ?rsvp=ticket in the address switches it for a preview.
 * - Saves with the classic form's code (window.weddingRsvp.saveRsvp in
 *   js/rsvp.js): same fields, same table.
 */

const RT_MAX_SEATS = 6;      // "6+", saved as 6 like the classic form's last choice

// What the seats say next to their label
const RT_SEAT_CAPTIONS = {
  1: 'Just me',
  2: 'The two of us',
  3: 'Three of us',
  4: 'Four of us',
  5: 'Five of us',
  6: 'Six or more: the whole family!'
};

// The seats, in words (Playfair's figures dip below the line on the canvas)
const RT_SEAT_WORDS = {
  1: 'One person',
  2: 'Two people',
  3: 'Three people',
  4: 'Four people',
  5: 'Five people',
  6: 'Six or more'
};

// One seat, seen from the front
const RT_SEAT_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 3h14a3 3 0 0 1 3 3v11H6V6a3 3 0 0 1 3-3z"/><rect x="3" y="17" width="26" height="7" rx="2.5"/><rect x="7" y="24" width="3" height="5" rx="1"/><rect x="22" y="24" width="3" height="5" rx="1"/></svg>';

// The stamped ticket's wording, by what the guest sent
const RT_DONE_TEXT = {
  coming: { stamp: 'CONFIRMED', kicker: 'Booked', title: 'Your seat is saved!', quote: '"We look forward to celebrating with you."' },
  blessing: { stamp: 'WITH LOVE', kicker: 'Blessing received', title: 'Thank you for your blessing!', quote: '"You\'ll be missed, and your wishes mean the world to us."' },
  noted: { stamp: 'THANK YOU', kicker: 'RSVP received', title: 'Thank you for letting us know', quote: '"You\'ll be missed, and you\'ll be in our hearts on the day."' }
};

// ---- THE PRINTED TICKET'S LOOK: 'ice' or 'coach' ----
// ice:   the coaches' dark-blue bands on frosted ice paper, a pale ice stripe,
//        a few frost crystals, on the site's Ice background (matches the
//        ticket on the page)
// coach: the earlier look, the Pearl City Express coaches' livery as they
//        are drawn on the page (css/style.css .train-coach-item): blue bands,
//        cream livery stripe, slate roof for the backdrop
// ?ticket=coach or ?ticket=ice in the address previews the other one.
const RT_PRINT_LOOK = 'ice';

// ceremony colours match the celebration wheel, in both looks
const RT_PRINT_CEREMONIES = {
  haldi_sangeet: { stripe: '#D4A622', ink: '#8A5A00' },
  wedding_thoothukudi: { stripe: '#B1233A', ink: '#9E1A31' },
  reception_chennai: { stripe: '#2A9150', ink: '#176B3A' }
};

const RT_PRINT_STYLES = {
  ice: {
    backdrop: '#90CBDF',     // the site's Ice background, edge ...
    backdropCentre: '#D2E6EE', // ... and centre
    shadow: 'rgba(10, 60, 100, .3)',
    paper: '#F8FCFE',
    paperEdge: '#DCEDF6',
    bandTop: '#0E427F',      // coach body, top to bottom
    bandBottom: '#0A2F5C',
    bandText: '#FFFFFF',
    bandSub: '#BAE6FD',
    stripe: '#DCF0FA',       // pale ice livery stripe
    stripeText: '#0A2F5C',
    sky: '#38BDF8',          // the ticket's edge, QR corners
    engine: '#60A5FA',
    accent: '#0E427F',       // stamp ink, labels, frames
    cream: '#E0F2FE',        // light lettering on the blue (fare, side band)
    ink: '#0A2F5C',
    muted: '#4F6880',
    line: 'rgba(10, 70, 120, .22)',
    perforation: 'rgba(186, 230, 253, .55)',
    qr: '#0A1C30',
    frost: 'rgba(186, 230, 253, .3)', // crystals on the blue band
    frostPaper: 'rgba(56, 160, 220, .16)', // ... and on the paper
    ceremonies: RT_PRINT_CEREMONIES
  },
  coach: {
    backdrop: '#2C3E50',     // coach roof
    backdropCentre: '#2C3E50',
    shadow: 'rgba(0, 0, 0, .35)',
    paper: '#FDF7E7',
    paperEdge: '#F3E6C4',
    bandTop: '#0E427F',
    bandBottom: '#0A2F5C',
    bandText: '#FFFFFF',
    bandSub: '#BAE6FD',
    stripe: '#F8E7B4',       // cream livery stripe
    stripeText: '#0A2F5C',
    sky: '#38BDF8',
    engine: '#60A5FA',
    accent: '#0E427F',
    cream: '#F8E7B4',
    ink: '#0A2F5C',
    muted: '#5B6B82',
    line: 'rgba(10, 47, 92, .25)',
    perforation: 'rgba(186, 230, 253, .55)',
    qr: '#0A1C30',
    frost: null,             // no crystals
    frostPaper: null,
    ceremonies: RT_PRINT_CEREMONIES
  }
};

const RT_PRINT = RT_PRINT_STYLES[((location.search.match(/[?&]ticket=(ice|coach)/i) || [])[1] || RT_PRINT_LOOK).toLowerCase()];

class RsvpTicket {
  constructor(section) {
    const $ = (sel) => section.querySelector(sel);
    this.ticket = $('#rt-ticket');
    this.form = $('#rt-form');
    this.done = $('#rt-done');
    this.nameInput = $('#rt-name');
    this.stopButtons = [...section.querySelectorAll('.rt-stop')];
    this.seatsBox = $('#rt-seats');
    this.coach = $('.rt-coach');
    this.captionEl = $('#rt-seat-caption');
    this.seatsHint = $('#rt-seats-hint');
    this.wishInput = $('#rt-wish');
    this.honeypot = $('#rt-website');
    this.errorEl = $('#rt-error');
    this.submitBtn = $('#rt-submit');
    this.preview = $('#rt-preview');
    this.previewImg = $('#rt-preview-img');
    this.downloadBtn = $('#rt-download');
    this.shareBtn = $('#rt-share');
    this.againBtn = $('#rt-again');

    this.seats = 2;
    this.sent = null;        // what was sent, for the picture
    this.picture = null;     // the ticket picture (JPEG blob), once drawn
    this.pictureUrl = null;  // ... and its address, for the preview

    this.buildSeats();
    this.bind();
    this.setSeats(this.seats);
    this.syncSeats();
  }

  bind() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.send();
    });

    this.nameInput.addEventListener('input', () => this.showError(''));

    this.stopButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
        this.syncSeats();
      });
    });

    this.ticket.querySelectorAll('.rt-chip').forEach(chip => {
      chip.addEventListener('click', () => this.addWish(chip.textContent.trim()));
    });

    // the picture's fonts start loading once the guest starts on the ticket
    this.form.addEventListener('focusin', () => this.loadFonts(), { once: true });
    this.form.addEventListener('pointerdown', () => this.loadFonts(), { once: true });

    // the preview opens full size only once the picture is ready
    this.preview.addEventListener('click', (e) => {
      if (!this.pictureUrl) e.preventDefault();
    });
    this.downloadBtn.addEventListener('click', () => this.download());
    this.shareBtn.addEventListener('click', () => this.share());
    this.againBtn.addEventListener('click', () => this.reset());
  }

  // the ticked ceremonies, in date order
  events() {
    return this.stopButtons.filter(btn => btn.getAttribute('aria-pressed') === 'true');
  }

  /* ------------------------------------------------------------- seats */

  buildSeats() {
    this.seatButtons = [];
    for (let n = 1; n <= RT_MAX_SEATS; n++) {
      const seat = document.createElement('button');
      seat.type = 'button';
      seat.className = 'rt-seat';
      seat.setAttribute('role', 'radio');
      seat.setAttribute('aria-label', n === RT_MAX_SEATS ? '6 or more people' : `${n} ${n === 1 ? 'person' : 'people'}`);
      seat.innerHTML = `${RT_SEAT_SVG}<span>${n === RT_MAX_SEATS ? '6+' : n}</span>`;
      seat.addEventListener('click', () => this.setSeats(n));
      this.coach.append(seat);
      this.seatButtons.push(seat);
    }
  }

  setSeats(n) {
    this.seats = Math.min(RT_MAX_SEATS, Math.max(1, n));
    this.captionEl.textContent = RT_SEAT_CAPTIONS[this.seats];
    this.seatButtons.forEach((seat, i) => {
      seat.classList.toggle('is-filled', i < this.seats);
      seat.setAttribute('aria-checked', String(i + 1 === this.seats));
    });
  }

  // no ceremony ticked: the seats rest, keeping their number
  syncSeats() {
    const resting = !this.events().length;
    this.seatsBox.classList.toggle('is-resting', resting);
    this.seatButtons.forEach(seat => { seat.disabled = resting; });
    this.seatsHint.textContent = resting
      ? 'Tick a ceremony above to save seats.'
      : 'An approximate number is fine.';
  }

  /* ---------------------------------------------------------- blessing */

  addWish(text) {
    const current = this.wishInput.value.trim();
    if (current.includes(text)) return;
    this.wishInput.value = (current ? `${current} ${text}` : text).slice(0, 1000);
  }

  /* -------------------------------------------------------------- send */

  async send() {
    // Hidden field only bots fill in: pretend success, save nothing
    if (this.honeypot && this.honeypot.value) return;

    const guestName = this.nameInput.value.trim();
    if (!guestName) {
      this.showError('Please write your name (or your family\'s) for the ticket.');
      this.shake(this.nameInput);
      this.nameInput.focus();
      return;
    }

    const saver = window.weddingRsvp;
    if (!saver) {
      this.showError('Sorry, the RSVP could not be sent. Please refresh the page and try again.');
      return;
    }

    const rsvp = {
      guestName,
      events: this.events().map(btn => btn.dataset.event),
      peopleCount: this.seats,
      message: this.wishInput.value.trim()
    };

    this.showError('');
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Sending…';
    try {
      await saver.saveRsvp(rsvp);
    } catch (err) {
      console.error('RSVP not saved', err);
      this.showError('Sorry, we could not send your RSVP. Please check your internet connection and try again.');
      return;
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Get my ticket';
    }

    if (window.weddingAudio) window.weddingAudio.playTempleBell();
    this.showDone(rsvp);
  }

  showDone(rsvp) {
    const coming = rsvp.events.length > 0;
    const kind = coming ? 'coming' : (rsvp.message ? 'blessing' : 'noted');
    const words = RT_DONE_TEXT[kind];
    const title = coming && rsvp.peopleCount > 1 ? 'Your seats are saved!' : words.title;
    const $ = (id) => this.ticket.querySelector(id);

    $('#rt-stamp-word').textContent = words.stamp;
    $('#rt-d-kicker').textContent = words.kicker;
    $('#rt-d-title').textContent = title;
    $('#rt-d-quote').textContent = words.quote;

    this.form.hidden = true;
    this.done.hidden = false;
    this.againBtn.hidden = false;
    this.ticket.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#rt-d-title').focus({ preventScroll: true });

    // what the printed ticket needs: the ceremonies, their venues, a ticket number
    const events = this.events().map(btn => {
      const [day, time] = btn.querySelector('.rt-stop-when').textContent.split('·').map(s => s.trim());
      return {
        key: btn.dataset.event,
        venue: btn.dataset.venue,
        name: btn.querySelector('.rt-stop-name').textContent.trim(),
        day,
        time,
        city: btn.querySelector('.rt-stop-where').textContent.split(',').pop().trim(),
        date: (day.match(/\d+/) || [''])[0]
      };
    });
    const venues = [...new Set(events.map(e => e.venue))].map(key => ({
      key,
      city: events.find(e => e.venue === key).city,
      // one ceremony there: its name; both Thoothukudi ones: "Haldi & Wedding"
      label: (() => {
        const here = events.filter(e => e.venue === key);
        return here.length === 1 ? here[0].name : here.map(e => e.name.split(' ')[0]).join(' & ');
      })()
    }));
    this.sent = { ...rsvp, kind, words, title, events, venues, serial: ticketNumber(rsvp.guestName) };

    // draw the picture now, so Download / Share work straight away
    this.clearPicture();
    this.previewImg.alt = `RSVP ticket for ${rsvp.guestName}${coming ? `: ${events.map(e => e.name).join(', ')}` : ', sending love'}`;
    setTimeout(() => this.drawPicture(), 350);
  }

  // a fresh ticket, for another family on the same phone
  reset() {
    this.nameInput.value = '';
    this.wishInput.value = '';
    this.stopButtons.forEach(btn => btn.setAttribute('aria-pressed', 'false'));
    this.setSeats(2);
    this.syncSeats();
    this.sent = null;
    this.clearPicture();
    this.done.hidden = true;
    this.againBtn.hidden = true;
    this.form.hidden = false;
    this.ticket.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------------------------------------- the ticket as a picture */

  // the canvas only uses a web font once it has loaded
  loadFonts() {
    if (!this.fonts) {
      this.fonts = Promise.all([
        '700 40px "Cinzel Decorative"', '700 40px "Playfair Display"', '600 40px "Playfair Display"',
        'italic 700 40px "Playfair Display"', 'italic 400 40px "Playfair Display"',
        '400 24px Outfit', '500 24px Outfit', '600 24px Outfit', '700 24px Outfit'
      ].map(f => document.fonts.load(f))).catch(() => { /* draw with the fallback fonts */ });
    }
    return this.fonts;
  }

  clearPicture() {
    if (this.pictureUrl) URL.revokeObjectURL(this.pictureUrl);
    this.picture = null;
    this.pictureUrl = null;
    this.preview.removeAttribute('href');
    this.preview.classList.remove('is-ready');
    this.preview.setAttribute('aria-busy', 'true');
    this.previewImg.removeAttribute('src');
    this.downloadBtn.disabled = true;
    this.downloadBtn.textContent = 'Preparing your ticket…';
    this.shareBtn.hidden = true;
  }

  async drawPicture() {
    const sent = this.sent;
    if (!sent) return;
    await this.loadFonts();
    if (this.sent !== sent) return;

    const canvas = document.createElement('canvas');
    canvas.width = RT_PICTURE.width;
    canvas.height = RT_PICTURE.height;
    paintTicket(canvas.getContext('2d'), sent);

    canvas.toBlob((blob) => {
      if (!blob || this.sent !== sent) return;
      this.picture = blob;
      this.pictureUrl = URL.createObjectURL(blob);
      this.previewImg.src = this.pictureUrl;
      this.preview.href = this.pictureUrl;
      this.preview.classList.add('is-ready');
      this.preview.setAttribute('aria-busy', 'false');
      this.downloadBtn.disabled = false;
      this.downloadBtn.textContent = 'Download ticket';
      this.shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [this.pictureFile()] }));
    }, 'image/jpeg', 0.9);
  }

  pictureName() {
    const slug = this.sent.guestName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    return `abu-sachin-ticket${slug ? `-${slug}` : ''}.jpg`;
  }

  pictureFile() {
    return new File([this.picture], this.pictureName(), { type: 'image/jpeg' });
  }

  download() {
    if (!this.picture) return;
    const a = document.createElement('a');
    a.href = this.pictureUrl;
    a.download = this.pictureName();
    document.body.append(a);
    a.click();
    a.remove();
  }

  // phones: the share sheet (has "Save image" on iPhone)
  async share() {
    if (!this.picture) return;
    try {
      await navigator.share({ files: [this.pictureFile()], title: 'Our RSVP ticket · Abu & Sachin' });
    } catch (e) {
      if (e.name !== 'AbortError') this.download();
    }
  }

  /* ------------------------------------------------------------ helpers */

  showError(text) {
    this.errorEl.textContent = text;
    this.errorEl.hidden = !text;
  }

  shake(el) {
    el.classList.remove('rt-shake');
    void el.offsetWidth;
    el.classList.add('rt-shake');
    el.addEventListener('animationend', () => el.classList.remove('rt-shake'), { once: true });
  }
}

// A ticket number for show, e.g. "2026·4827" (from the name and the moment)
function ticketNumber(name) {
  let h = Date.now() % 100000;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 1000003;
  return `2026·${String(1000 + (h % 9000))}`;
}

/* ------------------------------------------------------------------------
   The printed ticket: a railway ticket in the Pearl City Express coaches'
   blue, on ice paper (or cream: RT_PRINT_LOOK above), landscape, 1800 x 860.

   ┌───────────────────────── main ─────────────────────────┐┌──── stub ─────┐
   │ band: engine · PEARL CITY EXPRESS              Nº 2026  ││ BOARDING PASS │
   │ NAME OF PASSENGER          │ CLASS        SEATS         ││ PASSENGER    ▐│
   │ Maya and her family        │ SCAN FOR DIRECTIONS        ││ SEATS        ▐│
   │ FROM ...        TO ...     │ [QR]  [QR]                 ││ DATES        ▐│
   │ YOUR BLESSING "..."        │ Haldi & Wedding  Reception ││   (stamp)    ▐│
   │ [ceremony][ceremony][ceremony]                [FARE]    ││              ▐│
   └─────────────────────────────────────────────────────────┘└───────────────┘
   ------------------------------------------------------------------------ */

const RT_PICTURE = { width: 1800, height: 860 };

function paintTicket(ctx, t) {
  const P = RT_PRINT;
  const { width: W, height: H } = RT_PICTURE;
  const M = 40;                       // backdrop round the ticket
  const X = M;
  const Y = M;
  const TW = W - M * 2;               // ticket 1720 x 780
  const TH = H - M * 2;
  const PX = X + 1240;                // the perforation: main | stub
  const BAND = 118;                   // header band
  const STRIPE = 30;                  // livery stripe under it
  const R = 26;                       // corner radius
  const coming = t.events.length > 0;

  // ---- backdrop, ticket shape, paper
  const backdrop = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * .6);
  backdrop.addColorStop(0, P.backdropCentre);
  backdrop.addColorStop(1, P.backdrop);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = P.shadow;
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, X, Y, TW, TH, R);
  ctx.fillStyle = P.paper;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, X, Y, TW, TH, R);
  ctx.clip();
  const paper = ctx.createRadialGradient(X + TW * .4, Y + TH * .55, 120, X + TW * .4, Y + TH * .55, TW * .75);
  paper.addColorStop(0, P.paper);
  paper.addColorStop(1, P.paperEdge);
  ctx.fillStyle = paper;
  ctx.fillRect(X, Y, TW, TH);

  // a faint steam engine behind the details
  drawLocomotive(ctx, X + 560, Y + 255, 1.9, P.ink, .05, false);

  // ---- header: coach-blue band, then the cream livery stripe
  const band = ctx.createLinearGradient(0, Y, 0, Y + BAND);
  band.addColorStop(0, P.bandTop);
  band.addColorStop(1, P.bandBottom);
  ctx.fillStyle = band;
  ctx.fillRect(X, Y, TW, BAND);
  ctx.fillStyle = P.stripe;
  ctx.fillRect(X, Y + BAND, TW, STRIPE);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(X, Y + BAND, TW, 2);
  ctx.fillRect(X, Y + BAND + STRIPE - 2, TW, 2);

  // frost crystals: on the band between the name and the ticket number,
  // and faintly on the stub's paper
  if (P.frost) {
    drawCrystal(ctx, X + 880, Y + 56, 34, P.frost);
    drawCrystal(ctx, X + 952, Y + 92, 15, P.frost);
    drawCrystal(ctx, X + 838, Y + 100, 11, P.frost);
  }
  if (P.frostPaper) {
    drawCrystal(ctx, X + TW - 122, Y + 332, 22, P.frostPaper);
    drawCrystal(ctx, X + 34, Y + TH - 34, 18, P.frostPaper);
  }

  drawLocomotive(ctx, X + 46, Y + 30, .4, P.engine, 1, true);
  text(ctx, 'Pearl City Express', X + 192, Y + 68, '700 46px "Cinzel Decorative"', P.bandText);
  spaced(ctx, 'TRAIN 12693 · 11-YEAR JOURNEY · 2015 – 2026', X + 194, Y + 99, 4, 'left', P.bandSub, '600 18px Outfit');
  spaced(ctx, 'WEDDING SPECIAL · THOOTHUKUDI ⇄ CHENNAI · DECEMBER 2026', X + (PX - X) / 2, Y + BAND + 21, 4, 'center', P.stripeText, '700 16px Outfit');

  // ticket number, boxed
  ctx.font = '600 24px Outfit';
  const serial = `Nº ${t.serial}`;
  const serialW = spacedWidth(ctx, serial, 2);
  const sx = PX - 50 - serialW - 36;
  ctx.strokeStyle = P.engine;
  ctx.lineWidth = 2;
  ctx.strokeRect(sx, Y + 36, serialW + 36, 48);
  spaced(ctx, serial, sx + 18, Y + 69, 2, 'left', P.bandText, '600 24px Outfit');

  // stub header
  const stubCX = PX + (X + TW - PX) / 2;
  text(ctx, 'Boarding Pass', stubCX, Y + 68, '700 38px "Cinzel Decorative"', P.bandText, 'center');
  spaced(ctx, 'ADMIT WITH LOVE', stubCX, Y + 99, 4, 'center', P.bandSub, '600 18px Outfit');
  spaced(ctx, 'ABU ♥ SACHIN', stubCX, Y + BAND + 21, 4, 'center', P.stripeText, '700 16px Outfit');

  // ---- main: left column (passenger, journey, blessing)
  const LX = X + 60;
  const LW = 620;
  label(ctx, 'NAME OF PASSENGER', LX, Y + 178);
  fitLines(ctx, t.guestName, LX, Y + 238, LW, '700', '"Playfair Display"', 56, 34, 2, 38, P.ink);

  const dest = coming ? t.venues.map(v => v.city).join(' & ') : 'Abu & Sachin, with love';
  label(ctx, 'FROM', LX, Y + 322);
  fitLines(ctx, 'Wherever you are', LX, Y + 362, 290, '600', '"Playfair Display"', 32, 22, 1, 0, P.ink);
  label(ctx, 'TO', LX + 320, Y + 322);
  fitLines(ctx, dest, LX + 320, Y + 362, 300, '600', '"Playfair Display"', 32, 22, 1, 0, P.ink);
  dashed(ctx, LX, Y + 386, LX + LW);

  // the guest's blessing, or the couple's words
  label(ctx, t.message ? 'YOUR BLESSING' : 'ABU & SACHIN SAY', LX, Y + 424);
  ctx.font = 'italic 400 27px "Playfair Display"';
  let note = wrap(ctx, t.message ? `“${t.message}”` : t.words.quote.replace(/"/g, ''), LW);
  if (note.length > 3) {
    note = note.slice(0, 3);
    note[2] = `${note[2].replace(/\s*\S*$/, '')} …${t.message ? '”' : ''}`;
  }
  note.forEach((line, i) => text(ctx, line, LX, Y + 462 + i * 36, 'italic 400 27px "Playfair Display"', P.ink));

  // ---- main: right column (class & seats, venue QR codes)
  const RX = X + 720;
  const RW = PX - 50 - RX;            // 470
  if (coming) {
    label(ctx, 'CLASS', RX, Y + 178);
    fitLines(ctx, 'Family & Friends', RX, Y + 218, 230, '600', '"Playfair Display"', 30, 22, 1, 0, P.ink);
    label(ctx, 'SEATS', RX + 260, Y + 178);
    fitLines(ctx, RT_SEAT_WORDS[Math.min(RT_MAX_SEATS, t.peopleCount)], RX + 260, Y + 218, RW - 260, '600', '"Playfair Display"', 30, 22, 1, 0, P.ink);

    const codes = t.venues.filter(v => window.VENUE_QR && window.VENUE_QR[v.key]);
    if (codes.length) {
      spaced(ctx, 'SCAN FOR DIRECTIONS', RX + RW / 2, Y + 270, 4, 'center', P.muted, '700 16px Outfit');
      const size = 210;
      const gap = 56;
      const total = codes.length * size + (codes.length - 1) * gap;
      codes.forEach((v, i) => {
        const qx = RX + (RW - total) / 2 + i * (size + gap);
        drawQr(ctx, window.VENUE_QR[v.key].rows, qx, Y + 288, size);
        spaced(ctx, v.label.toUpperCase(), qx + size / 2, Y + 532, 2, 'center', P.accent, '700 16px Outfit', size + gap - 8);
        text(ctx, v.city, qx + size / 2, Y + 558, '500 19px Outfit', P.muted, 'center');
      });
    }
  } else {
    // not travelling: a framed note instead of seats and directions
    ctx.save();
    roundRect(ctx, RX, Y + 160, RW, 390, 16);
    ctx.setLineDash([12, 9]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = P.sky;
    ctx.stroke();
    ctx.restore();
    spaced(ctx, 'NOT TRAVELLING THIS TIME', RX + RW / 2, Y + 236, 4, 'center', P.muted, '700 17px Outfit');
    text(ctx, 'In spirit', RX + RW / 2, Y + 340, '700 70px "Cinzel Decorative"', P.accent, 'center');
    text(ctx, 'Sending love from afar', RX + RW / 2, Y + 410, 'italic 400 30px "Playfair Display"', P.ink, 'center');
    text(ctx, '♥', RX + RW / 2, Y + 488, '400 40px Outfit', P.accent, 'center');
  }

  // ---- main: the ceremonies along the bottom, like a timetable, and the fare
  const GX = LX;
  const GY = Y + 586;
  const GW = PX - 50 - GX;            // 1130
  const GH = 134;
  const FARE = 250;
  const fare = ctx.createLinearGradient(0, GY, 0, GY + GH);
  fare.addColorStop(0, P.bandTop);
  fare.addColorStop(1, P.bandBottom);
  ctx.fillStyle = fare;
  ctx.fillRect(GX + GW - FARE, GY, FARE, GH);
  spaced(ctx, 'FARE', GX + GW - FARE + 26, GY + 40, 4, 'left', P.bandSub, '700 17px Outfit');
  text(ctx, 'Paid in love', GX + GW - FARE + 26, GY + 92, 'italic 700 34px "Playfair Display"', P.cream);

  const cells = coming ? t.events : [null];
  const cellW = (GW - FARE) / cells.length;
  cells.forEach((e, i) => {
    const cx = GX + i * cellW;
    if (e) {
      const colours = P.ceremonies[e.key] || { stripe: P.accent, ink: P.ink };
      ctx.fillStyle = colours.stripe;
      ctx.fillRect(cx, GY, cellW, 8);
      spaced(ctx, `${e.day} · ${e.time}`.toUpperCase(), cx + 22, GY + 44, 1.5, 'left', colours.ink, '700 18px Outfit');
      fitLines(ctx, e.name, cx + 22, GY + 86, cellW - 40, '700', '"Playfair Display"', 30, 22, 1, 0, P.ink);
      text(ctx, e.city, cx + 22, GY + 116, '500 19px Outfit', P.muted);
    } else {
      label(ctx, 'JOURNEY', cx + 22, GY + 44);
      text(ctx, 'Not attending this time', cx + 22, GY + 88, '600 32px "Playfair Display"', P.ink);
      text(ctx, 'We will miss you on the day', cx + 22, GY + 118, '500 19px Outfit', P.muted);
    }
    if (i > 0) {
      ctx.fillStyle = P.line;
      ctx.fillRect(cx, GY + 14, 2, GH - 28);
    }
  });
  ctx.fillStyle = P.accent;
  ctx.fillRect(GX, GY + GH, GW, 2);
  ctx.fillRect(GX, GY - 2, GW - FARE, 2);

  spaced(ctx, 'VALID FOR THE WEDDING CELEBRATIONS OF ABU & SACHIN · DECEMBER 2026', X + (PX - X) / 2, Y + TH - 22, 3, 'center', P.muted, '600 15px Outfit');

  // ---- stub: passenger, seats, dates, the stamp, and a "control" band
  const SX = PX + 40;
  const BANDX = X + TW - 76;
  const SW = BANDX - 30 - SX;         // 334
  label(ctx, 'PASSENGER', SX, Y + 178);
  fitLines(ctx, t.guestName, SX, Y + 222, SW, '700', '"Playfair Display"', 38, 24, 2, 32, P.ink);

  label(ctx, coming ? 'SEATS' : 'TRAVELLING', SX, Y + 302);
  fitLines(ctx, coming ? RT_SEAT_WORDS[Math.min(RT_MAX_SEATS, t.peopleCount)] : 'In spirit', SX, Y + 340, SW, '600', '"Playfair Display"', 30, 22, 1, 0, P.ink);
  label(ctx, 'DATES', SX, Y + 386);
  // dates in the sans font: Playfair's figures dip below the line
  const dates = coming ? `${joinAnd(t.events.map(e => e.date))} December` : 'December 2026';
  fitLines(ctx, dates, SX, Y + 424, SW, '600', 'Outfit', 30, 22, 1, 0, P.ink);

  drawStamp(ctx, SX + SW / 2, Y + 594, 250, t.words.stamp, P.accent, P.paper);

  // the "control" band down the stub's edge, in coach blue
  const bandTop = Y + BAND + STRIPE;
  const bandH = Y + TH - bandTop;
  const control = ctx.createLinearGradient(BANDX, 0, X + TW, 0);
  control.addColorStop(0, P.bandTop);
  control.addColorStop(1, P.bandBottom);
  ctx.fillStyle = control;
  ctx.fillRect(BANDX, bandTop, X + TW - BANDX, bandH);
  ctx.save();
  ctx.translate(BANDX + 38, bandTop + bandH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '700 22px Outfit';
  let words = 'ABU ♥ SACHIN';
  while (spacedWidth(ctx, `${words}  ·  ABU ♥ SACHIN`, 4) < bandH - 60) words += '  ·  ABU ♥ SACHIN';
  spaced(ctx, words, 0, 8, 4, 'center', P.cream, '700 22px Outfit');
  ctx.restore();

  // the perforation
  ctx.save();
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = P.perforation;
  ctx.beginPath();
  ctx.moveTo(PX, Y + 30);
  ctx.lineTo(PX, Y + BAND);
  ctx.stroke();
  ctx.strokeStyle = P.line;
  ctx.beginPath();
  ctx.moveTo(PX, bandTop + 12);
  ctx.lineTo(PX, Y + TH - 30);
  ctx.stroke();
  ctx.restore();

  ctx.restore();   // end of the ticket's clip

  // the coaches' sky-blue edge
  roundRect(ctx, X + 1.5, Y + 1.5, TW - 3, TH - 3, R);
  ctx.strokeStyle = P.sky;
  ctx.lineWidth = 3;
  ctx.stroke();

  // notches where the stub tears off
  ctx.fillStyle = backdrop;
  [Y, Y + TH].forEach(ny => {
    ctx.beginPath();
    ctx.arc(PX, ny, 24, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ---- drawing helpers ---- */

function text(ctx, str, x, y, font, colour, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function label(ctx, str, x, y) {
  spaced(ctx, str, x, y, 4, 'left', RT_PRINT.muted, '700 17px Outfit');
}

function spacedWidth(ctx, str, gap) {
  const chars = [...str];
  return chars.reduce((w, ch) => w + ctx.measureText(ch).width, 0) + gap * (chars.length - 1);
}

// letter-spaced text (canvas letterSpacing isn't in every browser yet);
// maxWidth: squeeze the gaps (then the letters) to fit
function spaced(ctx, str, x, y, gap, align, colour, font, maxWidth) {
  ctx.font = font;
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const chars = [...str];
  let total = spacedWidth(ctx, str, gap);
  if (maxWidth && total > maxWidth) {
    gap = Math.max(0, gap - (total - maxWidth) / Math.max(1, chars.length - 1));
    total = spacedWidth(ctx, str, gap);
  }
  const squeeze = maxWidth && total > maxWidth ? maxWidth / total : 1;
  let cx = align === 'center' ? x - (total * squeeze) / 2 : x;
  chars.forEach(ch => {
    const w = ctx.measureText(ch).width * squeeze;
    ctx.save();
    ctx.translate(cx, y);
    ctx.scale(squeeze, 1);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    cx += w + gap * squeeze;
  });
}

// write text in the biggest size (max..min) that fits on one line; if even
// the smallest doesn't fit, wrap it onto up to `lines` lines (lineHeight apart)
function fitLines(ctx, str, x, y, width, weight, family, max, min, lines, lineHeight, colour) {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(str).width <= width) {
      ctx.fillStyle = colour;
      ctx.textAlign = 'left';
      ctx.fillText(str, x, y);
      return;
    }
  }
  ctx.font = `${weight} ${min}px ${family}`;
  let rows = wrap(ctx, str, width);
  if (rows.length > lines) {
    rows = rows.slice(0, lines);
    rows[lines - 1] = `${rows[lines - 1].replace(/\s*\S*$/, '')}…`;
  }
  ctx.fillStyle = colour;
  ctx.textAlign = 'left';
  rows.forEach((row, i) => ctx.fillText(row, x, y - (rows.length - 1) * lineHeight / 2 + i * lineHeight));
}

// break text into lines that fit (the guest's line breaks are kept)
function wrap(ctx, str, maxWidth) {
  const lines = [];
  str.split(/\r?\n/).forEach(paragraph => {
    let line = '';
    paragraph.split(/\s+/).filter(Boolean).forEach(word => {
      // a single word wider than the line is broken by letters
      while (ctx.measureText(word).width > maxWidth) {
        let cut = word.length - 1;
        while (cut > 1 && ctx.measureText(word.slice(0, cut)).width > maxWidth) cut--;
        if (line) { lines.push(line); line = ''; }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
  });
  return lines.length ? lines : [''];
}

function joinAnd(items) {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}` : items.join('');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dashed(ctx, x1, y, x2) {
  ctx.save();
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = RT_PRINT.line;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

// a QR code from its rows ('1' = dark), on white with a quiet margin, framed
// by corner brackets like a printed ticket's scan box. Squares are whole
// pixels so the code stays sharp.
function drawQr(ctx, rows, x, y, size) {
  const n = rows.length;
  const quiet = 3;
  const m = Math.floor(size / (n + quiet * 2));
  const box = m * (n + quiet * 2);
  const ox = Math.round(x + (size - box) / 2);
  const oy = Math.round(y + (size - box) / 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(ox, oy, box, box);
  ctx.fillStyle = RT_PRINT.qr;
  rows.forEach((row, r) => {
    for (let c = 0; c < n; c++) {
      if (row[c] === '1') ctx.fillRect(ox + (quiet + c) * m, oy + (quiet + r) * m, m, m);
    }
  });

  const pad = 10;
  const arm = 30;
  const left = ox - pad;
  const top = oy - pad;
  const right = ox + box + pad;
  const bottom = oy + box + pad;
  ctx.save();
  ctx.strokeStyle = RT_PRINT.sky;
  ctx.lineWidth = 5;
  ctx.lineCap = 'square';
  [[left, top, 1, 1], [right, top, -1, 1], [left, bottom, 1, -1], [right, bottom, -1, -1]].forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + dy * arm);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + dx * arm, cy);
    ctx.stroke();
  });
  ctx.restore();
}

// a steam locomotive with its tender, facing right (about 330 x 150 at scale 1);
// steam: a puff above the chimney
function drawLocomotive(ctx, x, y, scale, colour, alpha, steam) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  const body = new Path2D(
    'M0 52h70v50H0z' +                                // tender
    'M6 52q29-20 58 0z' +                             // coal
    'M74 24h76v78H74z M88 34v26h44V34z' +             // cab, with its window
    'M68 16h88a4 4 0 0 1 0 8H68a4 4 0 0 1 0-8z' +     // cab roof
    'M150 50h120a24 24 0 0 1 0 48H150z' +             // boiler
    'M244 50V24h-6V14h30v10h-6v26z' +                 // chimney
    'M194 50a14 14 0 0 1 28 0z' +                     // dome
    'M166 50a9 9 0 0 1 18 0z' +                       // sand dome
    'M0 100h300v8H0z' +                               // frame
    'M296 108l32 34h-36z' +                           // cowcatcher
    'M148 114h58v6h-58z'                              // side rod
  );
  ctx.fill(body, 'evenodd');
  [[16, 124, 12], [54, 124, 12], [100, 126, 15], [150, 120, 22], [206, 120, 22], [262, 126, 15]].forEach(([cx, cy, r]) => {
    const wheel = new Path2D();
    wheel.arc(cx, cy, r, 0, Math.PI * 2);
    wheel.moveTo(cx + r * .45, cy);
    wheel.arc(cx, cy, r * .45, 0, Math.PI * 2);
    ctx.fill(wheel, 'evenodd');
    ctx.beginPath();
    ctx.arc(cx, cy, r * .2, 0, Math.PI * 2);
    ctx.fill();
  });
  if (steam) {
    [[268, 2, 9], [284, -8, 12], [304, -14, 15]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

// a six-armed frost crystal (r: centre to arm tip), drawn in lines
function drawCrystal(ctx, x, y, r, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(2, r * .09);
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -r);
    // two pairs of side branches on each arm
    [[.45, .3], [.72, .2]].forEach(([at, len]) => {
      ctx.moveTo(0, -r * at);
      ctx.lineTo(-r * len, -r * (at + len));
      ctx.moveTo(0, -r * at);
      ctx.lineTo(r * len, -r * (at + len));
    });
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// the rubber stamp (same layout as the SVG stamp on the page, 200 x 200)
function drawStamp(ctx, cx, cy, size, word, ink, paper) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-12 * Math.PI / 180);
  ctx.scale(size / 200, size / 200);
  ctx.globalAlpha = .9;
  ctx.strokeStyle = ink;

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 94, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 66, 0, Math.PI * 2);
  ctx.stroke();

  // the words round the ring, centred on the right like the page's stamp
  const ring = '★ PEARL CITY EXPRESS ★ WEDDING SPECIAL ★ DEC 2026';
  const r = 74;
  ctx.font = '700 13px Outfit';
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const chars = [...ring];
  const widths = chars.map(ch => ctx.measureText(ch).width + 1.5);
  const total = widths.reduce((a, b) => a + b, 0);
  let angle = -total / r / 2;
  chars.forEach((ch, i) => {
    const mid = angle + widths[i] / r / 2;
    ctx.save();
    ctx.rotate(mid);
    ctx.translate(r, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += widths[i] / r;
  });

  // the band with the word
  roundRect(ctx, -68, -28, 136, 56, 4);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = '700 22px Outfit';
  ctx.fillText(word, 0, -5);
  spaced(ctx, 'ABU ♥ SACHIN', 0, 21, 2, 'center', ink, '700 12px Outfit');
  ctx.restore();
}

document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('rsvp-section');
  if (!section || !section.querySelector('#rt-ticket')) return;

  const pick = (location.search.match(/[?&]rsvp=(ticket|classic)/i) || [])[1];
  if (pick && pick.toLowerCase() === 'classic') section.removeAttribute('data-rsvp');
  if (pick && pick.toLowerCase() === 'ticket') section.setAttribute('data-rsvp', 'ticket');

  if (section.getAttribute('data-rsvp') === 'ticket') {
    window.rsvpTicket = new RsvpTicket(section);
  }
});
