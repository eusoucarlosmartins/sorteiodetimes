# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Brisa FC · Rachão — a single-page React app (Create React App) that drafts two balanced football teams from a confirmed roster and tracks player skill via dynamic ELO ratings. UI is in Portuguese (pt-BR).

## Commands

```bash
npm install        # install dependencies
npm start          # dev server on http://localhost:3000 (react-scripts)
npm run build      # production build into ./build
npm test           # react-scripts test (Jest, watch mode)
npm test -- --watchAll=false MyTest    # run a single test file once
```

There is no linter, formatter, or type-checker configured. There are no test files in the repo today — `npm test` will report "No tests found" until specs are added under `src/`.

Deployment is via Vercel and is automatic on push (config in `vercel.json`, framework `create-react-app`, output `build/`).

## Architecture

The entire application lives in **`src/App.js`** as one default-exported `App` component. `src/index.js` only mounts it. There are no other modules, no routing library, no state library, and no backend.

### View state machine

A single `view` state (`VIEWS.LIST | MANAGE | DRAW | RESULT | HISTORY`) gates which block of JSX renders. Navigation is just `setView(...)`. There is no React Router.

### Data model (all in-memory, lost on reload)

- `players`: array of `{ id, name, position, skill (1–10), elo, wins, losses }`, seeded from the `initialPlayers` constant at the top of `App.js`.
- `confirmed`: `Set<id>` of players checked in for the next match.
- `history`: last 10 match summaries (kept newest-first via `slice(0, 9)`).
- `nextId`: a `useRef` counter for new player IDs.

There is **no persistence layer** (no localStorage, no API). Edits, draws, and ELO updates only live for the session.

### Rating + draw pipeline

Three pure helpers at the top of `App.js` define the core algorithm — keep them pure and side-effect free:

1. `eloRating(p)` → effective rating used everywhere for sorting and balancing: `p.elo + (p.skill - 5) * 20`. Display this value, not raw `p.elo`.
2. `distributeTeams(confirmed)` → groups confirmed players by `position`, sorts each group by `eloRating` desc, walks pairs of adjacent ranks, and randomly assigns each pair across team A / team B. Odd leftovers go to whichever team is currently smaller.
3. `balanceTeams(teamA, teamB)` → 200-iteration hill-climb: pick a random player on A, find a same-position counterpart on B, swap, keep the swap only if `|strength(A) − strength(B)|` improved. Position-locked swaps are intentional — don't change this without revisiting `distributeTeams`.

`teamStrength` is just the sum of `eloRating` for the team.

### ELO update on result

`confirmResult()` applies a standard ELO update with `K = 32`, comparing each player's `eloRating` to the **average `eloRating` of the opposing team**. ELO has a hard floor of 800 (`Math.max(800, p.elo + delta)`). Wins/losses counters are incremented in the same pass. Only `p.elo` is mutated — `p.skill` stays manual.

### Draw animation

`handleDraw` schedules a `setInterval` that increments `animStep` 0→6 every 380 ms while showing the `DRAW` view, then computes and balances teams and transitions to `RESULT`. The labels under the spinner are purely cosmetic — they do not correspond to real algorithm phases.

## Conventions

- **Position constants** (`POSITIONS`, `POSITION_LABELS`, `POSITION_COLORS`, `POSITION_ICONS`) are the single source of truth for the four roles `GK | DEF | MID | ATK`. When adding a position, update all four maps and the seeded `initialPlayers`.
- **Styling is inline `style={{}}` plus one embedded `<style>` tag** with global rules and keyframes. No CSS files, no CSS-in-JS library, no Tailwind. Match the existing palette (`#0d1a0d` background, `#d4a017` gold accent, `#166534` green, `#b91c1c` red, `#f0ead0` text).
- **Strings are Portuguese (pt-BR).** Keep new UI copy in Portuguese to match the existing app.
- React 18 with `StrictMode`. Use functional components and hooks (`useState`, `useRef`); the codebase has no class components.

## Git workflow

Develop on branch `claude/add-claude-documentation-ck5Sf` (per task instructions). Push with `git push -u origin <branch>`. Do not open a PR unless explicitly requested.
