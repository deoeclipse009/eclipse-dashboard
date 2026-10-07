# Eclipse Dashboard

Deo's personal dashboard: clock, to-do, school timetable, college prep, calendar, music, voice assistant.

## Stack
- Static site: one `index.html` (all CSS + core script) plus ES modules. No build step, no framework.
- API: `api/` runs as Vercel functions, data in Turso (libSQL). Sign-in is email + password + invite code.
- Hosted twice from `main`: GitHub Pages (`deoeclipse009.github.io/eclipse-dashboard`) and Vercel (`eclipse-deo-dashboard.vercel.app`). A push deploys both in about a minute.

## Read this first: iCloud
This folder sits on an iCloud-synced Desktop. Files turn into cloud-only placeholders within minutes, and reading one (cat, Read, cp, node, `git diff`, `git status`) can hang past tool timeouts.
- Check with `ls -lO` (look for `dataless`) before reading.
- Read sources from `https://raw.githubusercontent.com/deoeclipse009/eclipse-dashboard/main/<file>` or `git show HEAD:<file>`.
- Edit in the session scratchpad, then write back with `cp file dest.new~ && mv -f dest.new~ dest`. Writes do not hang.

## Run and test
- Local API + site: `SIGNUP_CODE=anything npm run dev` (port 8765, local DB in `.data/`).
- Static preview without sign-in: serve a copy with `config.js` `apiBase = ""`.
- No test suite. Check changes in a browser at phone (375 wide) and laptop size.
- `?time=14:30` freezes the theme clock for previewing a palette.

## Files
- `index.html`: styles, markup, core script (tasks, calendar, palettes, account panel, phone views). Exposes `window.Dash`.
- `sync.js`: sign-in, task sync, settings sync. `SYNCED` lists the setting keys that follow the account.
- `api/settings.js`: `ALLOWED` must list the same keys as `SYNCED`. `api/tasks/index.js`: task table, do not add columns lightly.
- `voice.js`: assistant pop-up, blob, providers (Gemini default, Claude, ChatGPT, OmniRoute), validated actions.
- `school.js`: XII J timetable data and rendering. `scholar.js`: College prep (setting key is still `dash.scholar`).
- `spotify.js`, `calendar.js`, `weather.js`: connectors. `config.js`: public client IDs and `apiBase`.
- `launcher/`: macOS app for `eclipse://` links. Re-run `launcher/install.sh` after editing the AppleScript.
- `SETUP.md`: connector setup steps for the owner.

## Conventions
- Modules talk to the core only through `window.Dash` and `dash:action` / `dash:settings` events.
- New synced data goes in a setting key, added to both `SYNCED` and `ALLOWED`. Task priority lives in `dash.task.prio`, not the task table.
- Assistant actions are a fixed allow-list in `voice.js` `run()`. It can add and complete, never delete.
- Phone layout is the `@media (max-width:900px)` block: one fixed light palette, cards, bottom bar. Laptop keeps time-of-day themes and hairline columns.
- The assistant blob is always orange (`BLOB` in `voice.js`, `.blobby` in CSS).

## Status (2026-10-07)
- Live and working: to-do with date, time, priority; timetable; College prep; both layouts; assistant pop-up; cross-device settings sync.
- Waiting on the owner: Gemini API key, Google test-user fix (403 access_denied), real lesson times, College prep dates.
- Never tested for real: voice input, a live model reply, Spotify connect, sync across two real devices, Plash.
- Not started: integration with Deo's other site, Sori.
