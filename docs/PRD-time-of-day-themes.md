# PRD: Time-of-day themes

Status: Approved, implemented · Owner: Jorge · Date: 2026-09-30

## 1. Summary
The dashboard's grainy gradient background and text colors currently rotate weekly (8 fixed palettes). This feature changes the palette automatically through the day, so the wallpaper matches the light outside: soft and pale at dawn, bright by day, warm at golden hour, dark and quiet at night.

## 2. Goals and non-goals
**Goals**
- Palette follows the time of day with no input from the user.
- Text stays readable in every phase (contrast of at least 7:1 for body text).
- Changes feel gradual, never like a flash, and never distract while working.
- Works offline, with no account or key (runs entirely in the browser).

**Non-goals (v1)**
- Real sunrise/sunset from location or weather.
- Per-user custom schedules.
- Changing layout, typography or content.

## 3. Phases and palettes
Six phases. Each uses the existing five color roles: `base` (background), `c1`/`c3` (large gradient blobs), `c2` (light or dark wash), `ink` (text and lines).

| Phase | Local time | Tone | base | c1 | c2 | c3 | ink | Mood |
|---|---|---|---|---|---|---|---|---|
| Dawn | 05:00–08:00 | light | `#F3E6DE` | `#E8B49A` | `#FBF4EE` | `#C9CFE0` | `#2A211E` | Soft peach, slow start |
| Morning | 08:00–12:00 | light | `#F7EDE3` | `#EFA77A` | `#FEF9F3` | `#F3D3B6` | `#2B1F17` | Fresh orange-white, clear |
| Midday | 12:00–16:00 | light | `#FAF1E6` | `#F08A4B` | `#FFFBF5` | `#F6C9A0` | `#2A1C12` | Bright orange, full light (main theme) |
| Golden hour | 16:00–19:30 | light | `#F2DAC3` | `#E0743A` | `#FAE9D8` | `#C98B78` | `#2C1A11` | Amber and dusty rose |
| Evening | 19:30–22:30 | dark | `#1A1E2E` | `#C8663A` | `#262B40` | `#6F7FA8` | `#F4EEE8` | Blue dusk, one ember of orange |
| Night | 22:30–05:00 | dark | `#0E1424` | `#2B3F7A` | `#17203A` | `#A9B8DA` | `#E9EEF8` | Deep navy with blue-white light |

Design direction: premium and minimal. Orange is the main theme, always softened with white (orange-white, never saturated), with low-saturation neighbors and no more than one strong accent per phase. Night uses deep navy blended with pale blue-white.

Contrast of `ink` on `base` (WCAG): Dawn 12.9, Morning 13.9, Midday 14.8, Golden 12.3, Evening 14.4, Night 15.8. All pass AA and AAA.

Night is deliberately the dimmest so the screen does not glow in a dark room.

## 4. Behavior
1. **Schedule:** phase is chosen from the device's local clock, checked every minute.
2. **Transitions:** during the 30 minutes before a boundary, colors blend smoothly toward the next phase (linear blend of each color role, updated each minute).
3. **Light ↔ dark boundaries** (Golden hour → Evening at 19:30, Night → Dawn at 05:00): no blending, because mid-blend text would lose contrast. Use the existing fade-out / fade-in (about 0.45 s each way) at the boundary.
4. **Modes** (extends the current palette button and `P` shortcut):
   - **Auto (default):** follows the schedule above.
   - **Pinned:** the user cycles one of the existing 8 palettes and it stays until they switch back to Auto. This replaces the current "manual until end of week" behavior.
   - The old weekly rotation is retired; the 8 palettes remain available as pins.
5. **Persistence:** mode and pinned palette saved in `localStorage`.
6. **Palette label:** the small text in the right column shows the phase name, hex of `c1`, and mood (for example "Golden hour · #D0703C · Amber and copper, winding down").
7. **Accessibility:** respects `prefers-reduced-motion` (swap at boundaries instead of blending). Text contrast never drops below 7:1 in any blended frame within a tone family.

## 5. Edge cases
- Device sleeps through a boundary: on wake, recompute from the clock and apply immediately.
- Time zone or daylight-saving change: recomputed each minute, so it self-corrects.
- Wallpaper app (Plash) keeps the page running for days: no reload needed.
- Tab throttled in the background: catch up on the next tick.

## 6. Success criteria
- At any minute of the day the palette matches the table (manual check at each boundary).
- No frame with `ink` on `base` contrast under 7:1 during transitions.
- No visible flash at boundaries on a 60 Hz display.
- Manual pin survives reload; Auto resumes when selected.

## 7. Open questions
1. Are the fixed clock times fine, or should v2 use real sunrise/sunset from location (also changes the summer/winter split)?
2. Should weekends use a different phase table?
3. (Open) Should Night also lower grain and blob opacity to dim the screen further?
4. Keep all 8 old palettes as pins, or trim to the ones you like?

## 8. Rollout
1. Approve palette table and open questions.
2. Implement schedule and blending behind the existing `paintPalette()`.
3. Review each phase live using a temporary "preview time" control, then remove it.
4. Ship to GitHub Pages.
