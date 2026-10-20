# Checkmate X — Chess Mindprint (v3.1)

A local-first chess app: play the computer or a friend on one device, get engine analysis of your games, and see the mistakes you repeat (your **Mindprint**) with training positions taken from your own games.
No accounts, no server-side storage, no network calls: everything runs in the browser and all data stays in `localStorage`.

> **Stockfish integration status.** The UCI integration and setup script are included. This source archive does not contain the third-party Stockfish engine binary because the engine package could not be fetched in this build environment. Until you run the setup commands below in an internet-connected environment, the app uses the built-in engine and labels it clearly in the UI.

## Quick start

Requires Node 18+ (no npm dependencies).

```bash
npm start            # http://127.0.0.1:8080   (PORT=3000 npm start to change)
npm run build        # copies public/ to dist/ after checking all references
npm run start:dist   # serve the built copy
```

The app must be served over HTTP (not opened as `file://`) because it uses ES modules and Web Workers.

### Using Stockfish

```bash
npm install --no-save stockfish
npm run setup:stockfish
npm run build     # copies a single-threaded WASM build into public/vendor/stockfish and writes manifest.json
npm start
```

On start the app reads `vendor/stockfish/manifest.json`. If a Stockfish build is listed it is started as a Web Worker and used for hints, game analysis and the computer opponent; the header badge shows its name. If it fails to start, the app falls back to the built-in engine and explains why in the Analysis tab. Stockfish is GPL-3.0 and is **not** included in this repository.
Status: the installer and UCI client are tested against a fake package layout and a scripted UCI worker; **this archive has not been run against a real Stockfish build.** If your Stockfish package layout differs, adjust `scripts/setup-stockfish.js` (`pickBuild`) — and please check the engine badge in the header after starting.

## v3.1 improvements

- **Stockfish-ready integration:** UCI worker hookup, automatic fallback, and installer that records engine version/source/license metadata and copies an upstream license notice when available. The actual engine files must be installed with the commands above.
- **Evidence-based progress comparison:** Mindprint can compare the most recent 3 analyzed games with the previous 3 only when engine and analysis settings match. It reports the accuracy change and common costly pattern in each window; it does not claim a rating gain.
- **Return and engagement signals:** Mindprint shows active days over 7/30 days and counts completed games, analyses, and training attempts. These metrics stay in local browser storage and are not sent to a server; they help you test early retention with consenting testers but do not establish market demand.
- **More coverage:** unit tests for local progress metrics and fair recent-performance comparison.

## Features

- **Rules**: legal move generation including castling (with all conditions), en passant (including pinned-capture cases), promotion with piece choice, check, checkmate, stalemate, insufficient material, threefold repetition and the 50-move rule (both end the game automatically). FEN validation with readable errors.
- **Play**: click-to-move, pointer **drag-and-drop** (mouse, touch, pen), full keyboard play, legal-move dots, last-move and check highlights, board flip, undo (two plies against the computer), resign (with confirmation), hint arrow from the engine, captured pieces and material.
- **Computer opponent**: five levels (heuristic depth/randomness settings, not Elo-calibrated), play as White, Black or random; two-player mode and custom FEN start are still available.
- **History**: clickable move list, first/previous/next/last buttons, arrow keys, copy / download PGN, JSON export, PGN import (comments, variations and NAGs are skipped; main line only).
- **Analysis**: live evaluation + principal variation, evaluation bar and graph, full-game analysis with move classes (best … blunder), per-side accuracy, mistake list.
- **Mindprint**: aggregates analysed games into mistake patterns, per-phase error rates and accuracy trend. A pattern is called *recurring* only with ≥3 occurrences in ≥2 games; fewer than 20 analysed moves shows no profile at all. Every figure is computed from stored engine analysis.
- **Training**: positions are the mistakes/blunders from your own games (recurring patterns first). You must find the engine's move (or one the engine rates within 3 win-probability points). Progress is stored with a simple spaced-repetition schedule.
- **Responsive & accessible**: desktop, tablet and phone layouts, 44 px touch targets on phones, ARIA tabs/dialogs, focus trapping and restoration, live-region announcements, reduced-motion support.
- **Local only**: strict Content-Security-Policy (`default-src 'self'`), no CDN, custom SVG pieces drawn for this project.

## How the Mindprint is computed

1. The engine evaluates every position of the game (depth/time preset: Fast 6 / Standard 8 / Deep 10).
2. For each move: win-probability before vs. after (logistic model on centipawns, mates saturate). The drop classifies the move: **inaccuracy ≥ 5, mistake ≥ 10, blunder ≥ 20** points. Per-move accuracy uses a Lichess-style exponential formula; game accuracy is the simple mean. These thresholds are heuristics, not an official standard.
3. Errors get a primary tag from engine evidence: *allowed mate*, *missed mate*, *hung piece* (the engine's best reply captures a piece you left en prise), *missed capture*, *missed tactic* (best move was a check/promotion), *tactical oversight* (≥15 points lost otherwise), *positional slip*. "Blown advantage" is recorded as a secondary tag.
4. Patterns, phase rates and the training bank are aggregated across stored games (`public/js/analysis/mindprint.js`).

Limits: shallow analysis misses deep tactics; tags are rule-based; small samples are labelled low-confidence.

## Project layout

```
public/                 the app (served as-is)
  index.html, css/app.css
  js/chess/             position.js (rules core), game.js, pgn.js
  js/engine/            search.js, evaluate.js, uci.js, worker.js, client.js (UCI client), levels.js
  js/analysis/          analyze.js, mindprint.js
  js/ui/                app.js (controller), board.js, pieces.js (SVG pieces)
  js/storage.js
  vendor/stockfish/     manifest.json (+ engine files after setup)
scripts/                serve.js, build.js, setup-stockfish.js, run-tests.js
tests/unit/             node:test suites     tests/ui/  Playwright browser tests
TEST_REPORT.md          generated by npm run test:all
docs/screenshots/       captured by the browser tests
```

## Testing

```bash
npm test             # unit tests (no dependencies)
npm run test:perft   # move-generation node counts only
npm run test:all     # build + unit + browser tests (against public/ and dist/), regenerates TEST_REPORT.md
```

Browser tests need Playwright and Chromium: `npm i -D playwright && npx playwright install chromium`
(set `NODE_PATH` if Playwright is installed globally). See `TEST_REPORT.md` for the results of the last run.

## Known limitations

- Real Stockfish: integration is wired, but the engine binary is not bundled and must be installed separately (see above); real-engine startup and strength have not been verified in this environment.
- Product validation signals are local-only and self-reported by app behavior; they are not remote analytics, cohort retention, or proof of demand.
- Built-in engine strength is unmeasured; it cannot be interrupted mid-search, so cancelling restarts its worker.
- Tested in Chromium only; no real-device, Firefox, Safari or screen-reader testing.
- Not included: clocks, online play, opening book/names, sound, puzzles from outside your own games, Chess960, multi-game PGN files, PGN variations.
- Storage is `localStorage` (~5 MB): the app keeps at most 200 games and tells you if the browser refuses a save.
- Replaced from MVP v2: chess.js CDN dependency (own rules core), emoji pieces (SVG), the single-file layout. Kept: new-game dialog, tabs (Moves, Mindprint, Learn + Analysis, Train), resign, copy PGN, export JSON, local two-player mode.
