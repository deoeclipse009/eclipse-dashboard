# Setup: accounts, database, Google Calendar, Spotify

The dashboard works without any of this (tasks stay in the browser). Each part below is optional.
Site URL used here: `https://deoeclipse009.github.io/eclipse-dashboard/`

## 1. Firebase (accounts + task database)

1. Go to https://console.firebase.google.com and create a project (Analytics not needed).
2. **Build > Authentication > Get started**, then enable **Email/Password** and **Google**.
3. **Authentication > Settings > Authorized domains**: add `deoeclipse009.github.io`.
4. **Build > Firestore Database > Create database** (production mode, any region).
5. **Firestore > Rules**: paste the contents of `firestore.rules` and publish.
6. **Project settings > Your apps > Web (`</>`)**: register an app, copy the config values into `firebase-config.js`.
7. Commit and push. Tasks are stored at `users/{uid}/tasks/{taskId}`, readable only by that user.

## 2. Google Calendar

Uses the same Firebase project.

1. In https://console.cloud.google.com (same project), **APIs & Services > Library > Google Calendar API > Enable**.
2. **OAuth consent screen**: add yourself under **Test users** while the app is in Testing mode.
3. Open the dashboard, click the person icon, sign in, then **Connect Google Calendar**.

Google's browser access token lasts about an hour. When it lapses the panel shows **Reconnect**; events already loaded stay on screen. Refreshing silently would need a small server that keeps a refresh token.

## 3. Spotify now playing

1. https://developer.spotify.com/dashboard > **Create app**. Redirect URI: `https://deoeclipse009.github.io/eclipse-dashboard/` (exact, with the trailing slash). Tick **Web API**.
2. Copy the **Client ID** into `spotifyClientId` in `firebase-config.js`.
3. Person icon > **Connect Spotify**. Play/pause/next/previous under the album cover need **Spotify Premium** and the playback-control permission. If you connected before this was added, click **Reconnect Spotify for controls** once. Apps in development mode only work for the owner and users added under **User Management**.

## Notes

- The pages load JS modules, so open the deployed URL (or a local server), not the file directly.
- If your wallpaper app blocks pop-ups, sign in from a normal browser tab; Google sign-in there will not carry over to a separate webview.

## 4. Voice assistant (Claude through OmniRoute)

1. Install the launcher again after changes: `./launcher/install.sh`.
2. Click **OmniRoute** in the Launch section. It starts `omniroute serve` with `CORS_ALLOWED_ORIGINS=https://deoeclipse009.github.io`, which lets the dashboard talk to it. The dot next to it turns green when it's running.
3. Press **V** or the mic button and speak, for example "add dentist friday at 3pm", "what's on today", "next song", "open Notion".
4. If you set an OmniRoute API key, add it in the account panel under Voice assistant. Without one, leave it empty.

Speech-to-text is done by the browser (Chrome or Safari) and needs the microphone allowed for the site. The assistant can only add or complete tasks, open launcher buttons and control Spotify. It can't delete anything.

## 5. Weather and sun times

Person icon > **Weather and sun times**: type a city and press Set (or use your location). Data comes from Open-Meteo, no key needed.

## Quick-add phrases

The task box understands things like `IELTS test friday 10am`, `study every day`, `gym every monday 6pm`, `call mom oct 20`, `in 3 days`. Tasks containing words like test, exam, quiz, deadline or interview show up under **Key dates**.
