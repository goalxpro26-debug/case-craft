# Case Craft: Design Studio

An original, calm, satisfying HTML5 craft toy. Run your own little phone-case
studio: every customer walks in with a dream case in mind. Wipe it clean, spray
on their colour, add their pattern, stick on their stickers, then hand it over
and watch them smile. No timers, no losing — just craft.

**Originality:** the mechanics are only *inspired by* decorating a phone case
step by step. Every title, customer, name, line of art and note of music is
original, drawn/synthesized in code. No copied art, code, names, characters or
assets; no stock images; no licensed characters; no external files at all.

## How to run

- Open `index.html` in any modern browser (desktop or mobile). That's it —
  plain HTML5 + vanilla JS + Canvas, single self-contained file, no engine,
  no external assets, no network needed.
- Or serve it locally, e.g. `python3 -m http.server` in this folder and open
  `http://localhost:8000/index.html`.

## How to play

1. **Wipe** — tap every dusty smudge on the case until it sparkles.
2. **Paint** — pick the colour from the request card, then press and drag
   across the case until the paint meter reaches the target.
3. **Pattern** — tap the pattern button that matches the request
   (Plain, Polka Dots, Stripes, Little Stars, Hearts, Checker, Zigzag, Waves).
4. **Stickers** — tap a sticker in the tray, then tap the case where it should
   go. Tap a placed sticker to peel it off and move it.
5. **Deliver** — when every step is ticked, tap the big Deliver button.

Wrong colour, pattern or sticker? Just a gentle nudge and one fewer star —
there is no fail state and no way to lose.

## Progression & difficulty

- **20 customers** (Mia → Alex), each with their own colour, pattern and
  sticker list, shown in the request card and in a speech bubble.
- Difficulty ramps: 3 smudges / 80% paint / 1 sticker early → 8 smudges /
  95% paint / up to 5 stickers across 3–4 types for the finale customer.
- **Score:** 100 points per delivered case + 25 per star. **Stars:** 3 for a
  flawless case, 2 for 1–2 mistakes, 1 for 3+. Max 60 stars / 3500 points.
- Customer select screen (☰) with unlocks and per-customer stars; progress
  bar; start menu with how-to-play; pause (II) + restart + quit; mute (♪);
  synthesized WebAudio SFX (wipe, spray, pop, place, ding, chimes, fanfare)
  and an original gentle pentatonic music loop (no copyrighted music).
- All art is procedurally drawn on canvas: workbench, paint pots, customer
  avatars, the phone case with camera module, 8 patterns, 10 sticker designs
  (star, heart, flower, moon, bolt, paw, smiley, rocket, crown, gem).
- Portrait-friendly layout (480 px wide), touch + mouse (pointer events).

## Files

- `index.html` — the whole game (single file).
- `test.js` — combined headless test (menu → level 1 detail → full playthrough).
- `test-a.js` — detailed level-1 test with strict real clicks (see below).
- `test-b.js` — full 1–20 playthrough test.
- `shot-check.js` — small visual probe (painted + finished case screenshots).
- `test-shots/` — screenshots from the test runs.
- `test-a.log`, `test-b5.log` — passing run logs.

## Test results (headless Chromium + Playwright, real clicks)

Run Nov 6, 2026, against `file://…/case-craft/index.html`
(viewport 480×900, SwiftShader). A `window.__caseCraft()` hook exposes live
game state for assertions; screenshots in `test-shots/`.

**`test-a.js` — 16/16 checks passed, no console/page errors** (log `test-a.log`).
Strict real mouse clicks throughout. Verified: loads to menu; Start →
level 1 with 3 smudges; wiping all smudges advances to Paint; wrong-colour
drag leaves paint at 0% and adds a mistake; real drag-painting to the 80%
target advances to Pattern; wrong pattern stays + mistake; correct pattern
advances to Stickers; wrong sticker tap places nothing + mistake; correct
sticker advances to Deliver; Deliver → clear screen with 1 star (3 mistakes)
and score 125; Next → level 2; pause → resume; mute toggles; customer-select
overlay opens and level 1 replays.

**`test-b.js` — 4/4 checks passed, no console/page errors** (log `test-b5.log`).
Full playthrough, customers 1–20, every step of every case driven by the
test: **win screen reached, final score 3500, total stars 60/60**.
Screenshots `06-level10.png`, `07-level20.png`, `08-win.png` ("Studio
Superstar!", 60/60 stars) confirm the late game and ending visually.

**`shot-check.js` — no console/page errors.** Post-fix visual probe:
wipe → real drag-paint → pattern → sticker → deliver-ready. Screenshots
`09-painted-postfix.png` (coral-pink case, camera module, paint meter) and
`10-finished-postfix.png` (star sticker placed, sparkles, Deliver button)
visually confirm the canvas renders the painted case correctly.

### Honest notes on the test runs

- **Bug found and fixed during testing:** the paint grid was only built
  inside level setup, so the very first `draw()` frame (menu screen) threw
  `Cannot read properties of undefined (reading '0')` and the animation loop
  stopped — the case rendered grey in the first screenshots. Fixed by
  pre-filling the 10×16 paint grid at boot. Both passing runs above were
  re-run after the fix; the final logs show zero page/console errors.
- **VM load:** the shared VM was heavily loaded during testing (load
  average 25–50, dozens of other Chrome processes). Under that load,
  Playwright's default click actionability waits timed out repeatedly even
  though the game was fine (levels kept clearing 3 stars each). For the
  full-playthrough run only, toolbar clicks use `{ force: true }` (still real
  input events, skipping the stability poll) and the paint sweeps dispatch
  synthetic pointer events through the game's real canvas handlers — real
  drag-painting itself was already proven with strict clicks in `test-a.js`.
  Nothing about the game was changed to pass the tests.
- **Not submitted anywhere.** Build only, per instructions — no portal
  uploads, no accounts touched.
