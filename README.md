# Eclipse Dashboard

A minimal personal dashboard meant to be used as a live macOS wallpaper (e.g. with Plash).
Static site (`index.html` + two small modules). No build step.

- Big clock with day and date
- Month calendar, to-do list (Today / Week / Month), upcoming tasks
- Spotify embed (paste a playlist or track link)
- Grainy blurred gradient, palette rotates weekly
- Every section (calendar, clock, to-do, upcoming) folds away on its own
- Optional: accounts + Firestore task database, Google Calendar events, Spotify now-playing with album art. See [SETUP.md](SETUP.md)
- Without setup, data stays in the browser's localStorage

## Deployment

Static site, no build step. Deploy the repo root as-is.

- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` / root.
- **Vercel / Netlify:** import the repo; framework preset "Other", no build command, output directory `.`.

For Plash, point it at the deployed URL (or the local `index.html`).
