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
3. Person icon > **Connect Spotify**. Apps in development mode only work for the owner and users added under **User Management**.

## Notes

- The pages load JS modules, so open the deployed URL (or a local server), not the file directly.
- If your wallpaper app blocks pop-ups, sign in from a normal browser tab; Google sign-in there will not carry over to a separate webview.
