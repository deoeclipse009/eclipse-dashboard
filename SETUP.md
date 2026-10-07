# Setup: sign-in, database and connectors

The dashboard works with none of this (tasks stay in the browser, no login). Turn it on in this order.
Site: `https://deoeclipse009.github.io/eclipse-dashboard/`

## How it fits together

- The page stays on GitHub Pages.
- Sign-in and data live in a small API (`api/` in this repo) that runs on **Vercel** and stores everything in a **Turso** (libSQL) database, the same kind of database as the Eclipse Studio control room, but a separate database.
- The first time on a device you see a sign-in screen. After that the device is remembered for about 90 days (renewed whenever you use it). Passwords are stored hashed, and device tokens are stored only as hashes.

## 1. Database (Turso)

Easiest: in Vercel, **Storage > Create > Turso** (Marketplace) and connect it to the project from step 2. That fills in `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` for you.

Or by hand: create a database at turso.tech (Singapore is closest), create a token, and add both as environment variables in Vercel.

The tables are created automatically on the first request.

## 2. API (Vercel)

1. Vercel > **Add New > Project**, import this GitHub repo. Framework preset **Other**, no build command.
2. Environment variables (Settings > Environment Variables):

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | From step 1 |
| `SIGNUP_CODE` | An invite code you invent (long, random). Needed once to create your account. Without it nobody can sign up |
| `ALLOWED_ORIGINS` | `https://deoeclipse009.github.io` (comma-separate more sites if you add any) |

3. Deploy. Open `https://YOUR-PROJECT.vercel.app` to confirm the dashboard loads there too.
4. In `config.js`, set `apiBase` to that Vercel address, commit and push. Reload the Pages site: you'll see the sign-in screen. Choose **Create an account**, enter your email, a password (10+ characters) and the invite code.

To test on your Mac without Vercel: `SIGNUP_CODE=anything npm run dev` and open http://localhost:8765 (uses a local database file in `.data/`; set `apiBase` to `http://localhost:8765`).

## 3. Google Calendar (after you're signed in)

1. https://console.cloud.google.com > create or choose a project > **APIs & Services > Library > Google Calendar API > Enable**.
2. **OAuth consent screen**: External, add yourself as a **test user**.
3. **Credentials > Create credentials > OAuth client ID > Web application**. Authorized JavaScript origins: `https://deoeclipse009.github.io` (and your Vercel address if you use it).
4. Copy the Client ID into `googleClientId` in `config.js`, push, then open the person-icon panel and click **Connect Google Calendar**.

Google's browser token lasts about an hour. The dashboard renews it quietly; if your browser blocks that, the panel shows **Reconnect**.

## 4. Spotify now playing and controls

1. https://developer.spotify.com/dashboard > **Create app**. Redirect URI: `https://deoeclipse009.github.io/eclipse-dashboard/` (exact, with trailing slash). Tick **Web API**.
2. Copy the **Client ID** into `spotifyClientId` in `config.js`.
3. Person icon > **Connect Spotify**. Play/pause/next/previous need **Spotify Premium**. Apps in development mode only work for the owner and users added under **User Management**.

## 5. Assistant (Gemini by default)

1. Go to https://aistudio.google.com/apikey, sign in with your Google account and press **Create API key**. This key is separate from a Gemini app subscription; the free tier is enough for a personal assistant.
2. On the dashboard open the person icon > **Assistant**, leave **Answers come from** on **Gemini**, and paste the key into **Gemini API key**. While you are signed in it is saved to your account, so you only do this once and it works on every device.
3. Click the blob in the bottom-right corner (or press **V**; on a phone, tap the blob in the bottom bar) and speak or type: "add dentist friday at 3pm", "what's on today", "next song". Close the pop-up or press Esc to stop. Nothing listens while it is closed.

Claude, ChatGPT and OmniRoute are also in the **Answers come from** list. For OmniRoute, run `./launcher/install.sh` once, click **OmniRoute** in the Launch section (the dot turns green), and pick "OmniRoute on this Mac".

Speech-to-text is done by the browser (Chrome or Safari) and needs the microphone allowed. The assistant can add or complete tasks, track a scholarship, open a view, open launcher buttons and control Spotify. It can't delete anything.

## 6. Weather and sun times

Person icon > **Weather and sun times**: type a city and press Set (Open-Meteo, no key). The city follows your account.

## Quick-add phrases

`IELTS test friday 10am`, `study every day`, `gym every monday 6pm`, `call mom oct 20`, `in 3 days`. Tasks containing words like test, exam, quiz, deadline or interview show under **Key dates**.

## What is stored where

| Data | Where |
|---|---|
| Account, hashed password, devices, tasks, weather city, theme choice, folded sections, assistant profile, lesson times, scholarships | Your Turso database |
| AI provider API keys, Spotify sign-in, OmniRoute key, the Google Calendar "connected" flag and the last fetched events | Your Turso database, so one setup covers every device you sign in on |
| Google's one-hour calendar access, microphone and location permission | This device only |
