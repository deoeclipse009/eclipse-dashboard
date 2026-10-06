# Eclipse Launcher

A web page can't start apps or run commands by itself. This tiny local app registers an `eclipse://` link scheme so the dashboard's **Launch** buttons work.

## Install
```bash
./launcher/install.sh
```
This builds `~/Applications/Eclipse Launcher.app`. No server runs and nothing listens on the network. The first time you start a terminal command, macOS asks whether the launcher may control Terminal; click OK.

## What it can run
Only the ids listed at the top of `launcher.applescript`:

| Link | Does |
|---|---|
| `eclipse://app/claude` `antigravity` `orion` `spotify` | Opens that app |
| `eclipse://link/github` `studio-site` `studio-dash` `omniroute-ui` | Opens that web address (this repo, the two Eclipse Studio repos, the OmniRoute page) |
| `eclipse://link/talk` | Opens the dashboard in your browser in talk mode (for when the wallpaper window has no microphone) |
| `eclipse://cmd/omniroute` | Terminal: `omniroute serve` (allows the dashboard site to call it) |
| `eclipse://cmd/omniroute-stop` | Terminal: `omniroute stop` |
| `eclipse://cmd/claude-code` | Terminal: `cd ~ && claude` |

Anything else in a link is ignored. To add or change a button, edit the lists in `launcher.applescript`, run `install.sh` again, and add a matching `<a href="eclipse://…">` in the `Launch` block of `index.html`.

## Notes
- Chrome and Safari ask once before opening the link. Plash's web view may or may not hand custom links to macOS; if the buttons do nothing there, tell me and I'll find another route.
- Remove it by deleting `~/Applications/Eclipse Launcher.app`.
- Each click is logged to `~/.eclipse-launcher.log` (the link and any error), which helps when a button does nothing.
