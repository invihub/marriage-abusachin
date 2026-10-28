/**
 * Sangeet Mixtape: the shared song list
 * - Guests record a song they want to dance to, or tap one already on the
 *   tape to back it. Each guest holds 3 picks (any mix of new and backed).
 * - The same title (ignoring case and extra spaces) backs the existing song
 *   instead of adding a duplicate. Songs sort by how many guests back them.
 * - Saved in Supabase (abu_sachin.songs / song_claims, see
 *   supabase/song-wall.sql). The database enforces every rule; the page
 *   only shows them. Without js/config.js the list is kept on this device.
 * - While typing, a glass piano key presses for each letter and 1 to 4
 *   notes on the two staves light up. Recording a song runs up the keys.
 */

(() => {
  const section = document.getElementById('sangeet-mixtape');
  if (!section) return;

  const form = document.getElementById('mixtape-form');
  const input = document.getElementById('mixtape-input');
  const recordBtn = document.getElementById('mixtape-record');
  const noteEl = document.getElementById('mixtape-note');
  const picksEl = document.getElementById('mixtape-picks');
  const listEl = document.getElementById('mixtape-tracks');
  const moreBtn = document.getElementById('mixtape-more');
  const summaryEl = document.getElementById('mixtape-summary');
  const keysEl = document.getElementById('mixtape-keys');
  const scoreEl = document.getElementById('mixtape-score');

  // Fallback only: the real limit is abu_sachin.max_picks() in supabase/song-wall.sql,
  // read on load. Keep the two equal so the page agrees with it offline too.
  let maxPicks = 3;
  const TOP_N = 10;          // songs shown before "View all"
  const LIST_ROWS = 8;       // rows visible at once when the full list is open

  const tidy = (s) => s.replace(/\s+/g, ' ').trim();
  const keyOf = (s) => tidy(s).toLowerCase();

  /* A guest is a random id kept by their own browser: no sign-in. Clearing
     site data or using another phone gives a fresh set of picks. */
  const deviceId = (() => {
    const K = 'abu-sachin.device';
    let id = null;
    try { id = localStorage.getItem(K); } catch (e) { }
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : 'dev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      try { localStorage.setItem(K, id); } catch (e) { }
    }
    return id;
  })();

  /* ---- Storage: both versions offer load / claim / release ---- */

  // Shared list in Supabase. Reads go to the table, writes through the
  // database functions, where the rules live.
  function remoteWall(cfg) {
    async function api(path, body) {
      const headers = { apikey: cfg.supabasePublishableKey, Accept: 'application/json' };
      // This site's tables live in their own schema (abu_sachin)
      if (body) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Profile'] = cfg.supabaseSchema;
      } else {
        headers['Accept-Profile'] = cfg.supabaseSchema;
      }
      const res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { }
      if (!res.ok) throw new Error((data && (data.message || data.error)) || `http_${res.status}`);
      return data;
    }
    return {
      shared: true,
      load: () => Promise.all([
        api('songs?select=id,name,count,created_at&order=count.desc,created_at.asc&limit=500'),
        api('rpc/my_claims', { p_device_id: deviceId })
      ]).then(([songs, claims]) => ({ songs: songs || [], claims: claims || [] })),
      limit: () => api('rpc/max_picks', {}),
      claim: (name) => api('rpc/claim_song', { p_name: name, p_device_id: deviceId }),
      release: (id) => api('rpc/release_claim', { p_song_id: id, p_device_id: deviceId })
    };
  }

  // This device only (no js/config.js, e.g. opened from a file). Same rules
  // as the database; two tabs on one computer stay in step.
  const LOCAL_KEY = 'abu-sachin.mixtape.v1';
  function localWall() {
    const listeners = [];
    const chan = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('abu-sachin-mixtape') : null;
    const read = () => {
      let db = null;
      try { db = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch (e) { }
      return (db && db.songs && db.claims) ? db : { songs: [], claims: [] };
    };
    const write = (db) => {
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(db)); } catch (e) { }
      if (chan) chan.postMessage(Date.now());
    };
    const ping = () => listeners.forEach((fn) => fn());
    if (chan) chan.onmessage = ping;
    window.addEventListener('storage', (e) => { if (e.key === LOCAL_KEY) ping(); });
    const fail = (msg) => Promise.reject(new Error(msg));
    const byTime = (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0);
    const mine = (db) => db.claims.filter((c) => c.device_id === deviceId);
    return {
      shared: false,
      onExternalChange: (fn) => listeners.push(fn),
      load: () => {
        const db = read(), tally = {};
        db.claims.forEach((c) => { tally[c.song_id] = (tally[c.song_id] || 0) + 1; });
        const songs = db.songs.filter((s) => tally[s.id])
          .map((s) => ({ id: s.id, name: s.name, count: tally[s.id], created_at: s.created_at }))
          .sort((a, b) => (b.count - a.count) || byTime(a, b));
        return Promise.resolve({ songs, claims: mine(db).sort(byTime) });
      },
      claim: (name) => {
        const db = read(), v = tidy(name);
        if (!v || v.length > 80) return fail('bad_name');
        if (mine(db).length >= maxPicks) return fail('claim_limit');
        let song = db.songs.find((s) => keyOf(s.name) === keyOf(v)), kind = 'boost';
        if (!song) {
          kind = 'new';
          song = {
            id: 's-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
            name: v, created_at: new Date().toISOString()
          };
          db.songs.push(song);
        } else if (db.claims.some((c) => c.song_id === song.id && c.device_id === deviceId)) {
          return fail('already_claimed');
        }
        db.claims.push({ song_id: song.id, device_id: deviceId, kind, created_at: new Date().toISOString() });
        write(db);
        return Promise.resolve([{ song_id: song.id, kind }]);
      },
      release: (id) => {
        const db = read(), before = db.claims.length;
        db.claims = db.claims.filter((c) => !(c.song_id === id && c.device_id === deviceId));
        if (db.claims.length === before) return fail('not_claimed');
        // last claim gone, the song goes too
        if (!db.claims.some((c) => c.song_id === id)) db.songs = db.songs.filter((s) => s.id !== id);
        write(db);
        return Promise.resolve(true);
      }
    };
  }

  const cfg = window.SITE_CONFIG || {};
  const wall = (cfg.supabaseUrl && cfg.supabasePublishableKey && cfg.supabaseSchema)
    ? remoteWall(cfg) : localWall();

  /* For testing the list design: open http://localhost:8000/?seed=20 without
     js/config.js and this device's list fills with 20 songs (2 of them your
     picks, below 10th place). Never touches the database. ?seed=0 clears it. */
  (() => {
    const m = location.search.match(/[?&]seed=(\d+)/);
    if (!m || wall.shared || !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
    const n = parseInt(m[1], 10);
    if (!n) { try { localStorage.removeItem(LOCAL_KEY); } catch (e) { } return; }
    const TITLES = ['Mental Manadhil', 'Aye Sinamika', 'Parandhu Sella Vaa', 'Vaathi Coming', 'Rowdy Baby',
      'Arabic Kuthu', 'Jimikki Kammal', 'Why This Kolaveri Di', 'Appadi Podu', 'Kutti Story',
      'Aaluma Doluma', 'Danga Maari Oodhari', 'Munbe Vaa', 'Vaseegara', 'Chinna Chinna Aasai',
      'Uyire Uyire', 'Kadhal Rojave', 'Nenjukkul Peidhidum', 'Selfie Pulla', 'Otha Sollala'];
    const songs = [], claims = [], now = Date.now();
    for (let i = 0; i < n; i++) {
      const id = 's-seed-' + i;
      songs.push({
        id, name: TITLES[i % TITLES.length] + (i < TITLES.length ? '' : ` (${i + 1})`),
        created_at: new Date(now - (600 - i) * 60000).toISOString()
      });
      for (let v = 0; v < Math.max(1, n - i); v++) {
        claims.push({
          song_id: id, device_id: `guest-${i}-${v}`, kind: v ? 'boost' : 'new',
          created_at: new Date(now - (600 - i) * 60000 + v * 100).toISOString()
        });
      }
    }
    [Math.min(n - 1, 13), Math.min(n - 1, 16)].filter((x, k, a) => a.indexOf(x) === k).forEach((idx, k) => {
      claims.push({
        song_id: 's-seed-' + idx, device_id: deviceId, kind: k ? 'new' : 'boost',
        created_at: new Date(now + k * 1000).toISOString()
      });
    });
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ songs, claims })); } catch (e) { }
  })();

  /* ---- Piano and score: keys press and notes light up as you type ---- */

  // Two octaves of glass keys; black keys sit between whites 0-1, 1-2, 3-4, 4-5, 5-6
  const WHITE_KEYS = 14;
  const BLACK_AFTER = [0, 1, 3, 4, 5];
  const keys = [];
  for (let w = 0; w < WHITE_KEYS; w++) {
    const el = keysEl.appendChild(document.createElement('i'));
    el.className = 'mt-key';
    keys.push({ el, x: w + 0.5 });
  }
  for (let w = 0; w < WHITE_KEYS - 1; w++) {
    if (!BLACK_AFTER.includes(w % 7)) continue;
    const el = keysEl.appendChild(document.createElement('i'));
    el.className = 'mt-key mt-key-black';
    el.style.setProperty('--at', (w + 1) / WHITE_KEYS);
    keys.push({ el, x: w + 1 });
  }
  keys.sort((a, b) => a.x - b.x);          // left to right, for the runs

  function pressKey(k, ms = 260) {
    clearTimeout(k.timer);
    k.el.classList.add('is-down');
    k.timer = setTimeout(() => k.el.classList.remove('is-down'), ms);
  }

  // a run along the keys: up for a recorded song, down for a vote taken back
  function run(up) {
    const order = up ? keys : keys.slice().reverse();
    order.forEach((k, i) => setTimeout(() => pressKey(k, 180), i * 32));
  }

  /* The score: two staves in fixed positions. Staff lines are 7 units apart;
     a pitch counts steps up from the bottom line (0 = bottom line, 4 = middle
     line, 8 = top line). Each symbol below can light up. */
  const NS = 'http://www.w3.org/2000/svg';
  const SPACE = 7;
  const STEM = 3.5 * SPACE;
  const STAVES = [42, 98];                 // y of each staff's bottom line

  // Treble clef, sharp and flat outlines from the Noto Music font (SIL Open
  // Font License), in font units: 250 = one staff space, y = 0 on the bottom line.
  const GLYPHS = {
    clef: 'M314 -801Q300 -854 291 -906Q282 -958 282 -1012Q282 -1059 288 -1100Q295 -1142 307 -1177Q320 -1217 341 -1252Q362 -1288 386 -1311Q409 -1334 427 -1334Q451 -1334 493 -1249Q514 -1206 524 -1156Q534 -1106 534 -1049Q534 -978 515 -908Q496 -837 460 -775Q423 -713 372 -666L407 -498Q422 -500 432 -501Q442 -502 447 -502Q508 -502 556 -468Q604 -433 632 -377Q661 -321 661 -254Q661 -177 622 -116Q582 -54 503 -25Q508 -8 532 117Q538 147 541 164Q544 182 545 195Q546 208 546 225Q546 275 522 314Q497 354 456 376Q414 398 363 398Q311 398 271 378Q231 359 208 324Q185 290 185 245Q185 197 212 165Q238 133 287 133Q329 133 356 164Q382 194 382 236Q382 272 357 299Q332 326 292 326H282Q308 365 364 365Q433 365 472 320Q511 275 511 205Q511 188 507 160Q503 131 493 91Q483 51 478 25Q472 -1 470 -12Q436 -2 390 -2Q304 -2 222 -52Q142 -102 96 -184Q50 -266 50 -361Q50 -451 91 -530Q132 -609 192 -675Q253 -741 314 -801ZM341 -826Q364 -838 390 -870Q416 -903 440 -945Q464 -987 479 -1030Q494 -1072 494 -1106Q494 -1142 483 -1163Q472 -1184 445 -1184Q421 -1184 398 -1162Q376 -1140 358 -1104Q341 -1067 331 -1022Q321 -977 321 -930Q321 -898 328 -872Q334 -846 341 -826ZM398 -379Q371 -373 347 -354Q323 -334 308 -306Q294 -279 294 -248Q294 -223 307 -196Q320 -170 339 -154Q352 -142 365 -136Q380 -129 380 -123Q380 -120 370 -117Q332 -126 302 -151Q271 -176 254 -212Q236 -247 236 -287Q236 -330 254 -370Q271 -410 302 -442Q334 -474 374 -490L345 -641Q229 -547 174 -456Q120 -366 120 -277Q120 -212 154 -156Q188 -100 247 -66Q306 -31 380 -31Q400 -31 420 -35Q441 -39 464 -45ZM495 -55Q593 -97 593 -227Q593 -270 571 -306Q549 -341 512 -362Q475 -383 429 -383Z',
    sharp: 'M97 -46V-189L50 -177V-277L97 -290V-486H128V-298L195 -314V-509H226V-322L275 -333V-234L226 -220V-77L275 -89V14L226 26V214H195V34L128 52V247H97V59L50 71V-32ZM195 -70V-214L128 -197V-54Z',
    flat: 'M50 -615H81V-225Q118 -262 165 -262Q197 -262 223 -240Q249 -219 249 -178Q249 -146 230 -119Q211 -92 179 -65L110 -6Q91 10 76 26Q61 41 50 55ZM81 -12Q107 -40 125 -64Q143 -87 153 -105Q164 -124 170 -140Q175 -156 175 -170Q175 -198 162 -210Q149 -223 134 -223Q118 -223 102 -212Q87 -200 81 -180Z'
  };
  const GLYPH_CENTRE = { sharp: 131, flat: 125 };   // the font units that sit on the pitch line

  /* What is written, staff by staff: [kind, x, pitch, stem] or, for beamed
     groups, [kind, [[x, pitch], ...], stem]. Each staff opens the
     traditional way: treble clef, then its key signature. */
  const SCORE = [
    {
      key: ['sharp', 8],                    // F sharp, on the top line
      symbols: [
        ['crotchet', 54, 2, 'up'], ['crotchet', 78, 4, 'down'],
        ['quavers', [[102, 6], [122, 5]], 'down'], ['crotchet', 148, 3, 'up'],
        ['bar', 168],
        ['minim', 188, 2, 'up'], ['quaver', 214, 3, 'up'], ['quaver', 240, 6, 'down'],
        ['sharp', 264, 5], ['crotchet', 280, 5, 'down'],
        ['bar', 312]
      ]
    },
    {
      key: ['flat', 4],                     // B flat, on the middle line
      symbols: [
        ['semiquavers', [[46, 1], [60, 2], [74, 3], [88, 2]], 'up'],
        ['quavers', [[110, 5], [128, 3]], 'down'], ['minim', 150, 1, 'up'],
        ['bar', 168],
        ['crotchet', 188, 3, 'up'], ['semiquaver', 212, 2, 'up'], ['quaver', 240, 4, 'down'],
        ['minim', 280, 1, 'up'],
        ['end', 306]
      ]
    }
  ];

  const svg = (tag, attrs, parent) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return parent ? parent.appendChild(el) : el;
  };

  function drawScore() {
    const staffG = svg('g', { class: 'mt-staff' }, scoreEl);
    const symbols = [];
    const symbol = (x) => {
      const g = svg('g', { class: 'mt-sym' }, scoreEl);
      symbols.push({ g, x });
      return g;
    };
    const glyph = (name, x, y, g) => {
      const k = SPACE / 250;
      svg('path', { d: GLYPHS[name], transform: `translate(${x} ${y}) scale(${k})` }, g);
    };
    const accidental = (name, x, y, g) => glyph(name, x, y + GLYPH_CENTRE[name] * SPACE / 250, g);

    STAVES.forEach((bottom, s) => {
      const part = SCORE[s];
      const yOf = (pitch) => bottom - pitch * SPACE / 2;
      for (let l = 0; l < 5; l++) {
        svg('line', { x1: 2, x2: 312, y1: bottom - l * SPACE, y2: bottom - l * SPACE }, staffG);
      }
      glyph('clef', 3, bottom, symbol(6));
      accidental(part.key[0], 24, yOf(part.key[1]), symbol(26));

      const head = (g, x, y, hollow) => svg('ellipse', {
        cx: x, cy: y, rx: 4, ry: 2.8, transform: `rotate(-22 ${x} ${y})`,
        class: hollow ? 'mt-hollow' : ''
      }, g);
      const stemX = (x, up) => (up ? x + 3.4 : x - 3.4);
      const stem = (g, x, y, end, up) => svg('line', { x1: stemX(x, up), x2: stemX(x, up), y1: y, y2: end, class: 'mt-stem' }, g);
      // a flag on a lone quaver / semiquaver; n = 1 or 2 flags
      const flags = (g, x, end, up, n) => {
        const sx = stemX(x, up), dir = up ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const y = end + dir * i * 5;
          svg('path', {
            d: `M${sx} ${y}c0 ${3 * dir} 5.5 ${4.5 * dir} 5.5 ${9 * dir}`
              + `c0 ${2.4 * dir} -.8 ${4.6 * dir} -1.7 ${6 * dir}`
              + `c.7 ${-2.8 * dir} -.4 ${-6.8 * dir} -3.8 ${-10.6 * dir}z`
          }, g);
        }
      };

      part.symbols.forEach(([kind, a, b, c]) => {
        if (kind === 'bar') {
          svg('line', { x1: a, x2: a, y1: bottom - 4 * SPACE, y2: bottom, class: 'mt-bar' }, staffG);
          return;
        }
        if (kind === 'end') {
          svg('line', { x1: a, x2: a, y1: bottom - 4 * SPACE, y2: bottom, class: 'mt-bar' }, staffG);
          svg('rect', { x: a + 3, y: bottom - 4 * SPACE, width: 3, height: 4 * SPACE }, staffG);
          return;
        }
        if (kind === 'sharp' || kind === 'flat') {
          accidental(kind, a, yOf(b), symbol(a));
          return;
        }
        if (kind === 'quavers' || kind === 'semiquavers') {
          const up = b === 'up', notes = a.map(([x, p]) => [x, yOf(p)]);
          // a level beam, a full stem's length from the furthest note
          const beamY = up ? Math.min(...notes.map((n) => n[1])) - STEM : Math.max(...notes.map((n) => n[1])) + STEM;
          const g = symbol(notes[0][0]);
          notes.forEach(([x, y]) => { head(g, x, y); stem(g, x, y, beamY, up); });
          const x1 = stemX(notes[0][0], up) - .5, x2 = stemX(notes[notes.length - 1][0], up) + .5;
          const beams = kind === 'semiquavers' ? 2 : 1;
          for (let i = 0; i < beams; i++) {
            const y = beamY + (up ? i * 4.6 : -i * 4.6) + (up ? 0 : -3);
            svg('rect', { x: x1, y, width: x2 - x1, height: 3 }, g);
          }
          return;
        }
        const up = c === 'up', y = yOf(b), end = up ? y - STEM : y + STEM;
        const g = symbol(a);
        head(g, a, y, kind === 'minim');
        stem(g, a, y, end, up);
        if (kind === 'quaver') flags(g, a, end, up, 1);
        if (kind === 'semiquaver') flags(g, a, end, up, 2);
      });
    });
    return symbols.sort((p, q) => p.x - q.x);
  }
  // the score is optional (commented out in index.html for now); without it
  // the piano still plays and nothing lights up
  const symbols = scoreEl ? drawScore() : [];

  function lightSymbol(sym, ms = 700) {
    clearTimeout(sym.timer);
    sym.g.classList.add('is-lit');
    sym.timer = setTimeout(() => sym.g.classList.remove('is-lit'), ms);
  }

  // 1 to 4 notes, chosen at random, light up for each letter typed
  function lightRandom() {
    const n = 1 + Math.floor(Math.random() * 4);
    const pool = symbols.slice();
    for (let i = 0; i < n && pool.length; i++) {
      lightSymbol(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
  }

  // a song recorded or backed (by you, or newly arrived from another guest):
  // a run up the keys and a wave of light across the score
  function celebrate() {
    run(true);
    symbols.forEach((sym, i) => setTimeout(() => lightSymbol(sym, 600), i * 45));
  }

  // a vote taken back: a run down the keys
  function rewind() {
    run(false);
  }

  // Two soft notes when your song lands, once the guest has rung the gate bell
  function chime() {
    const audio = window.weddingAudio;
    if (!audio || !audio.ctx) return;
    audio.ensureContext();
    audio.synthesizeNote(659.25, 0.35);
    setTimeout(() => audio.synthesizeNote(987.77, 0.55), 140);
  }

  input.addEventListener('input', () => {
    // the letter just typed picks the key, so a word plays the same keys each time
    const at = Math.max(0, (input.selectionStart || input.value.length) - 1);
    const code = input.value.charCodeAt(at) || 32;
    pressKey(keys[(code * 7) % keys.length]);
    lightRandom();
  });

  /* ---- The list ----
     Gold and maroon do two separate jobs:
       · a song's number: its place in the list (1st gold, 2nd maroon, ...)
       · your own rows' outline: the order you picked them (1st gold, ...) */

  let songs = [], myClaims = [], wallLoaded = false, wallSig = '', knownIds = [], drawnIds = [];
  let expanded = false, flashId = null;

  const NOTE_BASE = wall.shared
    ? 'Shared with every guest. Tap a song on the tape to back it.'
    : 'Saved on this device for now. The shared list switches on once the database is connected.';

  const claimFor = (id) => myClaims.find((c) => c.song_id === id) || null;
  const slotOf = (id) => myClaims.findIndex((c) => c.song_id === id) + 1;
  const indexOfSong = (id) => songs.findIndex((s) => s.id === id);
  const indexOfName = (name) => songs.findIndex((s) => keyOf(s.name) === keyOf(name));
  const slotColour = (slot) => (slot % 2 === 1 ? 'var(--mt-gold)' : 'var(--mt-maroon)');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  const ERRORS = {
    claim_limit: 'That is all of your picks. Free one up by tapping a song you have backed, or × on your own.',
    already_claimed: 'That song is already one of your picks.',
    not_claimed: 'That pick is no longer yours. The list has moved on.',
    bad_name: 'Type a song name first.',
    bad_device: 'This browser could not identify itself. Try reloading the page.'
  };

  let noteTimer = 0;
  function note(msg, warn) {
    clearTimeout(noteTimer);
    const spent = myClaims.length >= maxPicks;
    noteEl.textContent = msg || (spent ? 'All picks used. Remove one to record another.' : NOTE_BASE);
    noteEl.classList.toggle('is-warn', !!warn);
    if (msg) noteTimer = setTimeout(() => note(), 4600);
    // The input stays live so the piano keeps reacting; Enter or the
    // button then explains the limit instead of silently doing nothing.
    recordBtn.classList.toggle('is-spent', spent);
    recordBtn.setAttribute('aria-disabled', spent ? 'true' : 'false');
    recordBtn.title = spent ? 'All of your picks are used' : '';
  }

  function wallError(err) {
    const raw = (err && err.message) ? String(err.message) : '';
    const key = Object.keys(ERRORS).find((k) => raw.includes(k));
    // The database has the last word on the limit: if it refuses a pick the
    // page thought was free, the page's number is stale. Correct it.
    if (key === 'claim_limit' && myClaims.length > 0 && myClaims.length < maxPicks) {
      maxPicks = myClaims.length;
      render();
    }
    note(key ? ERRORS[key] : 'Could not reach the song list. Check your connection and try again.', true);
  }

  function renderPicks() {
    picksEl.textContent = '';
    const label = document.createElement('span');
    label.className = 'mt-picks-label';
    label.textContent = 'Your picks';
    const tokens = document.createElement('span');
    tokens.className = 'mt-pick-tokens';
    for (let i = 1; i <= maxPicks; i++) {
      const t = document.createElement('i');
      if (i <= myClaims.length) {
        t.className = 'is-used';
        t.style.setProperty('--slot-colour', slotColour(i));
      }
      tokens.appendChild(t);
    }
    const left = maxPicks - myClaims.length;
    const count = document.createElement('span');
    count.className = 'mt-picks-count';
    count.textContent = left > 0 ? `${left} of ${maxPicks} left` : 'all used';
    picksEl.append(label, tokens, count);
  }

  /* Which rows show: the top 10, plus any of your picks that slipped below
     them, carried up so you can always find your own. Still 10 rows. */
  function visibleRows() {
    const rows = songs.map((s, i) => ({ song: s, rank: i, pinned: false }));
    if (expanded || rows.length <= TOP_N) return rows;
    const mineRanks = rows.filter((r) => claimFor(r.song.id)).map((r) => r.rank);
    let slots = TOP_N;
    for (let pass = 0; pass < maxPicks + 2; pass++) {
      const carried = mineRanks.filter((rk) => rk >= slots).length;
      if (TOP_N - carried === slots) break;
      slots = TOP_N - carried;
    }
    const mine = rows.filter((r) => r.rank >= slots && claimFor(r.song.id));
    mine.forEach((r) => { r.pinned = true; });
    return mine.concat(rows.slice(0, slots));
  }

  // The open list is sized to whole rows, so a song is never cut in half
  function sizeList() {
    if (!expanded) { listEl.style.maxHeight = ''; return; }
    const first = listEl.querySelector('li');
    if (!first) return;
    const cs = getComputedStyle(listEl);
    const gap = parseFloat(cs.rowGap) || 0;
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const n = Math.max(4, Math.min(LIST_ROWS, listEl.children.length));
    listEl.style.maxHeight = `${n * first.offsetHeight + (n - 1) * gap + pad}px`;
  }

  function syncMore() {
    if (songs.length <= TOP_N) { moreBtn.hidden = true; expanded = false; }
    else {
      moreBtn.hidden = false;
      moreBtn.textContent = expanded ? 'Show top 10' : `View all ${songs.length} songs`;
    }
    listEl.classList.toggle('is-expanded', expanded);
  }

  // A cassette reel: the spoked ring (it turns when the song is backed)
  // around a hub that holds the vote count or the row's action
  function reel(tag, cls, hubText) {
    const el = document.createElement(tag);
    el.className = 'mt-reel ' + cls;
    const ring = document.createElement('i');
    ring.className = 'mt-reel-ring';
    const hub = document.createElement('b');
    hub.textContent = hubText;
    el.append(ring, hub);
    return el;
  }

  /* Each track is a cassette window: the left reel holds the votes, the
     right reel the action (+1 to back, ✓ backed by you, × your own song),
     and the song name sits between them. */
  function trackRow(r) {
    const s = r.song, claim = claimFor(s.id), slot = slotOf(s.id);
    const own = !!claim && claim.kind === 'new';
    const li = document.createElement('li');
    li.className = 'mt-track' + (r.rank % 2 ? ' rank-maroon' : ' rank-gold')
      + (slot ? ' is-mine' : '') + (r.pinned ? ' is-pinned' : '')
      + (drawnIds.includes(s.id) ? '' : ' is-fresh') + (s.id === flashId ? ' is-flash' : '');
    li.dataset.id = s.id;
    if (slot) li.style.setProperty('--slot-colour', slotColour(slot));

    const votes = reel('span', 'mt-reel-votes', s.count);
    votes.setAttribute('role', 'img');
    votes.setAttribute('aria-label', plural(s.count, 'vote', 'votes'));
    votes.title = plural(s.count, 'vote', 'votes');

    const main = document.createElement('span');
    main.className = 'mt-track-main';
    const name = document.createElement('span');
    name.className = 'mt-track-name';
    name.textContent = s.name;
    const meta = document.createElement('span');
    meta.className = 'mt-track-meta';
    const num = document.createElement('span');
    num.className = 'mt-track-no';
    num.textContent = 'Track ' + String(r.rank + 1).padStart(2, '0');
    meta.appendChild(num);
    if (slot) {
      const tag = document.createElement('span');
      tag.className = 'mt-track-tag';
      tag.textContent = own ? 'Your song' : 'Backed by you';
      meta.appendChild(tag);
    }
    main.append(name, meta);

    let btn;
    if (own) {
      btn = reel('button', 'mt-track-action mt-remove', '×');
      btn.setAttribute('aria-label', `Remove ${s.name}`);
      li.title = 'Your song. Remove it with ×';
    } else if (claim) {
      btn = reel('button', 'mt-track-action is-backed', '✓');
      btn.setAttribute('aria-label', `Take back your vote for ${s.name}`);
      li.title = 'Tap to take your vote back';
    } else {
      const spent = myClaims.length >= maxPicks;
      btn = reel('button', 'mt-track-action' + (spent ? ' is-spent' : ''), '+1');
      btn.setAttribute('aria-label', `Back ${s.name}`);
      li.title = spent ? 'All of your picks are used' : 'Tap to back this song';
    }
    btn.type = 'button';

    li.append(votes, main, btn);
    return li;
  }

  function render() {
    listEl.textContent = '';
    summaryEl.textContent = songs.length
      ? `${plural(songs.length, 'song', 'songs')} · ${plural(songs.reduce((n, s) => n + s.count, 0), 'vote', 'votes')}`
      : '';
    renderPicks();
    if (!songs.length) {
      const li = document.createElement('li');
      li.className = 'mt-empty';
      li.textContent = wallLoaded ? 'The tape is blank. Be the first to record a song.' : 'Tuning in…';
      listEl.appendChild(li);
      drawnIds = [];
      syncMore();
      return;
    }
    const shown = visibleRows();
    shown.forEach((r) => listEl.appendChild(trackRow(r)));
    // only rows actually drawn count as seen, so later arrivals still rise in
    drawnIds = shown.map((r) => r.song.id);
    flashId = null;
    syncMore();
    sizeList();
  }

  moreBtn.addEventListener('click', () => {
    expanded = !expanded;
    render();
    if (!expanded) listEl.scrollTop = 0;
  });

  /* Fold a fresh read into the page. An unchanged list is left alone, so a
     guest scrolling the open list doesn't lose their place on every poll.
     Songs that appeared since the last read were recorded by someone else,
     so the piano and score celebrate them too. */
  function applyState(d) {
    const incoming = d.songs || [], claims = d.claims || [];
    const sig = incoming.map((s) => `${s.id}:${s.count}`).join('|')
      + '//' + claims.map((c) => c.song_id).join('|');
    const changed = sig !== wallSig;
    if (!changed && wallLoaded) return false;
    const arrivals = wallLoaded ? incoming.filter((s) => !knownIds.includes(s.id)) : [];
    songs = incoming;
    myClaims = claims;
    wallSig = sig;
    knownIds = incoming.map((s) => s.id);
    wallLoaded = true;
    if (arrivals.length && !flashId) {
      flashId = arrivals[arrivals.length - 1].id;
      if (sectionNear) celebrate();
    }
    const keepScroll = listEl.scrollTop;
    render();
    note();
    listEl.scrollTop = keepScroll;
    return changed;
  }
  const refresh = () => wall.load().then(applyState);

  /* One write at a time, held until the re-read lands: a quick second tap on
     a slow phone would otherwise be judged against the old pick count. */
  let busy = false;
  const free = () => { busy = false; listEl.classList.remove('is-busy'); };
  function writeWall(op) {
    if (busy) return;
    busy = true;
    listEl.classList.add('is-busy');
    op().then(() => wake().then(free, free), (err) => { free(); wallError(err); });
  }

  /* Staying in step: ask for news every 3s, easing out to 15s while nothing
     changes, and only while the section is near the screen and the tab is
     visible. */
  const POLL_MIN = 3000, POLL_MAX = 15000;
  let pollDelay = POLL_MIN, pollTimer = 0;
  const schedulePoll = (ms) => { clearTimeout(pollTimer); pollTimer = setTimeout(pollTick, ms); };
  function pollTick() {
    pollTimer = 0;
    if (!sectionNear || document.hidden) return;
    refresh().then((changed) => {
      pollDelay = changed ? POLL_MIN : Math.min(POLL_MAX, Math.round(pollDelay * 1.5));
      schedulePoll(pollDelay);
    }, () => schedulePoll(POLL_MAX));
  }
  // Read now (always, so your own change lands) and go back to polling often
  function wake() {
    pollDelay = POLL_MIN;
    const done = refresh().catch(() => { });
    if (sectionNear && !document.hidden) schedulePoll(POLL_MIN);
    return done;
  }
  if (window.IntersectionObserver) {
    new IntersectionObserver((es) => {
      sectionNear = es[0].isIntersecting;
      if (sectionNear) wake(); else clearTimeout(pollTimer);
    }, { rootMargin: '200px 0px' }).observe(section);
  } else {
    sectionNear = true;
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && sectionNear) wake();
  });
  if (wall.onExternalChange) wall.onExternalChange(() => refresh().catch(() => { }));

  /* Recording a song. A title already on the tape backs that song instead.
     The piano reacts straight away; if the write is refused, the words go
     back into the box so nothing is lost. */
  function recordSong() {
    const v = tidy(input.value);
    if (!v) { note(ERRORS.bad_name, true); input.focus(); return; }
    const at = indexOfName(v);
    if (at >= 0 && claimFor(songs[at].id)) { note(ERRORS.already_claimed, true); return; }
    if (myClaims.length >= maxPicks) { note(ERRORS.claim_limit, true); return; }
    if (busy) return;
    celebrate();
    input.value = '';
    writeWall(() => wall.claim(v).then((res) => {
      const row = Array.isArray(res) ? res[0] : res;
      if (row && row.song_id) flashId = row.song_id;
      chime();
    }, (err) => {
      input.value = v;
      throw err;
    }));
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    recordSong();
  });

  /* Tapping a row (each is one claim added or removed):
       · a song you backed  -> tap again to take your vote back
       · your own song      -> only × removes it
       · anyone else's song -> tap to back it, if you have a pick left */
  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('li.mt-track');
    if (!row) return;
    const id = row.dataset.id, claim = claimFor(id);
    if (claim) {
      if (claim.kind === 'boost' || e.target.closest('.mt-remove')) {
        rewind();
        writeWall(() => wall.release(id));
      } else {
        note('This is your song. Use × to remove it.');
      }
      return;
    }
    if (myClaims.length >= maxPicks) { note(ERRORS.claim_limit, true); return; }
    const at = indexOfSong(id);
    if (at < 0) { wake(); return; }              // the row went stale mid-tap
    if (busy) return;
    celebrate();
    writeWall(() => wall.claim(songs[at].name).then(() => { flashId = id; chime(); }));
  });

  // Ask the database for the limit; the fallback stands if it can't say
  if (wall.limit) {
    wall.limit().then((n) => {
      n = parseInt(n, 10);
      if (n > 0 && n !== maxPicks) { maxPicks = n; render(); note(); }
    }, (err) => console.warn('[mixtape] could not read max_picks(); using ' + maxPicks
      + '. Run supabase/song-wall.sql if the song list is not set up yet.', err));
  }

  render();
  note();
  refresh().catch(() => note('Could not reach the song list. It will try again shortly.', true));
})();
