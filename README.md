# Abu & Sachin · South Indian Wedding Invitation

> A festive, auspicious South Indian wedding invitation website celebrating the **11-year journey** of **Abu** (Thoothukudi) and **Sachin** (Chennai).

---

## 🌟 Key Features

### 🪔 1. Festive Temple Entrance & Auspicious Split Doors
- Ornate South Indian temple entrance framed with glowing brass **Kuthuvilakku** oil lamps, traditional thoranam, and carved deities.
- Interactive **"Open Doors & Enter Celebration"** button.
- On click:
  - Sounds an authentic **auspicious temple bell chime** via the Web Audio API.
  - Showers fluttering **golden marigold petals** and **white jasmine (malli) blossoms** via HTML5 Canvas.
  - Smoothly split-parts the carved double wooden temple doors in 3D perspective to reveal the main celebration.

### 🚂 2. Pearl City Superfast Express · 11-Year Horizontal Scroll Timeline
- Modeled after the historic **Pearl City Superfast Express** (Train #12693 / #12694) connecting Chennai Egmore & Tuticorin.
- Screen-scroll horizontal experience: scrolling vertically translates smoothly along the X-axis across the 5 milestone train coaches:
  1. **2015 · KCG College of Technology (Chennai)**: Campus corridors and the spark of young love.
  2. **2015 · First Movie Date (OK Kanmani)**: Satyam Cinemas date, AR Rahman soundtracks.
  3. **2017–2020 · Chennai Romance & Foundations**: Mylapore filter coffees, Marina Beach walks, Napier Bridge.
  4. **2021–2025 · The Canada Chapter**: Crossing oceans, sub-zero Toronto winters, falling red maple leaves, career triumphs.
  5. **2026 · Marriage — 11 Years & Forever**: Two sacred traditions uniting both families.
- Interactive navigation pills and prev/next buttons for direct coach jumping.

### 📅 3. Celebration Schedule & Ceremonies
- **Dec 5 (Thoothukudi)**: Haldi Ceremony (09:30 AM) & Sangeet / Musical Night (06:30 PM).
- **Dec 6 (Thoothukudi)**: Wedding Ceremony – Tradition 1 (09:00 AM, Muhurtham: 09:45 AM).
- **Dec 10 (Chennai)**: Wedding Ceremony – Tradition 2 (07:30 AM, Muhurtham: 08:15 AM).
- **Dec 11 (Chennai)**: Grand Wedding Reception at **The Leela Palace Chennai** (06:30 PM).
- Direct **Add to Google Calendar** integration for each event.
- Downloadable **.ICS Calendar files** generated on-the-fly.
- Direct **Google Maps venue links** and dress code guide.
- Live **Muhurtham Countdown Timer**.

### 💌 4. Personalized RSVP System
- Records guest & family names (e.g., *"Sai and his family"*).
- Multi-select checkboxes for all 5 ceremonies.
- Headcount selectors (Adults, Children) & feast meal preferences (Traditional Pure Veg Elai Sappadu vs. Coastal Virundhu).
- Personalized Confirmation modal greeting guests with the exact requested wording:
  > **"We look forward to celebrating with you."**
- **Organizer View & CSV Export**: An admin drawer to inspect all recorded RSVPs and export a clean `.csv` guest list spreadsheet with one click.
- Persistent in `localStorage`.

### 📼 5. OK Kanmani Jukebox & Chennai Monsoon Rain Atmosphere
- Floating retro Sony Walkman cassette player widget.
- Real-time procedural **Web Audio API synthesizer** playing 4 tracks:
  1. *Mental Manadhil* (Acoustic Synth)
  2. *Aye Sinamika* (Gentle Romance)
  3. *Parandhu Sella Vaa* (Dreamy Ambient Synth)
  4. *Mangala Vaathiyam* (Auspicious Temple Nadaswaram & Bells)
- **Toggleable Chennai Monsoon Rain Atmosphere**: procedural brown noise & resonant filtering creating realistic rain and soft thunder with volume slider.
- Rotating cassette reels, animated audio equalizer bars, and track controls.

### 📸 6. Couples Photo Gallery
- Polaroid-style frames with gold embossing and couple snapshots.
- Interactive **empty photo upload slots** for Haldi & Reception moments.
- High-resolution fullscreen lightbox viewer.

### ✈️ 7. Travel Transit Guide & Hotel Recommendations
- Pearl City Express schedule (#12693 / #12694) with booking tips.
- Direct flights guide (MAA ⇄ TCR).
- Luxury sleeper bus operators.
- Handpicked hotel stays near venues with Google Maps links (GRT Regency, DSF Grand Plaza, The Leela Palace, Somerset Greenways).

### 🏖️ 8. Iconic Spots of Thoothukudi & Chennai
- **Thoothukudi**: Tiruchendur Murugan Temple, Pearl City Beach & Harbour, Famous Ganesh Bakery Cashew Macaroons.
- **Chennai**: Kapaleeshwarar Temple & Filter Coffee, Marina Beach & Napier Bridge, Mahabalipuram Shore Temples.

---

## 🚀 Running Locally

You can serve the website using Python or Node:

```bash
# Option 1: Python HTTP Server
python -m http.server 3000

# Option 2: Node npx serve
npx serve -l 3000 .
```

Open `http://localhost:3000` in any web browser.

---

## 🎨 Design Philosophy
- **Colors**: Auspicious Temple Gold, Sindoor Maroon, Peacock Teal, OK Kanmani Warm Amber & Monsoon Slate, Canadian Maple Red.
- **Typography**: Cinzel Decorative, Playfair Display, Outfit.
- **Technology**: Pure HTML5, Vanilla CSS3, Vanilla JS (No heavyweight frameworks or external build tools required).
