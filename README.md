# Eclipse Dashboard

A minimal personal dashboard meant to be used as a live macOS wallpaper (e.g. with Plash).
Static front end (`index.html` + small modules) plus a small API in `api/`.

- Big clock with day and date
- Month calendar, to-do list (Today / Week / Month), upcoming tasks
- Spotify embed (paste a playlist or track link)
- Grainy blurred gradient, palette rotates weekly
- Every section (calendar, clock, to-do, upcoming) folds away on its own
- Optional: sign-in with a remembered device and a Turso database (via a small Vercel API), Google Calendar, Spotify now-playing with controls, voice commands. See [SETUP.md](SETUP.md)
- Without setup, data stays in the browser's localStorage

## Deployment

Static site, no build step. Deploy the repo root as-is.

- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root.
- **Vercel / Netlify:** import the repo; framework preset "Other", no build command, output directory `.`.

For Plash, point it at the deployed URL (or the local `index.html`).
