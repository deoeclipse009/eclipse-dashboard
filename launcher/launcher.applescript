-- Eclipse Launcher: opens apps and runs terminal commands from the dashboard.
-- The dashboard links to eclipse://app/<id> and eclipse://cmd/<id>.
-- Only the ids listed below can run; nothing from the URL is ever executed.
-- Edit the lists, then run launcher/install.sh again.

property allowedApps : {{"claude", "Claude"}, {"spotify", "Spotify"}, {"notion", "Notion"}, {"chrome", "Google Chrome"}}

property allowedLinks : {{"github", "https://github.com/deoeclipse009/eclipse-dashboard"}, {"site", "https://deoeclipse009.github.io/eclipse-dashboard/"}, {"omniroute-ui", "http://localhost:20128"}}

-- folders are relative to your home folder
property allowedFolders : {{"project", "Desktop/eclipse-dashboard"}}

-- OmniRoute is told to accept calls from the dashboard site (needed for voice commands)
property allowedCommands : {{"omniroute", "CORS_ALLOWED_ORIGINS=https://deoeclipse009.github.io omniroute serve"}, {"omniroute-stop", "omniroute stop"}, {"claude-code", "cd ~ && claude"}}

on run
	-- opened directly: nothing to do (quit after a moment so it doesn't linger)
	delay 3
	quit
end run

on open location theURL
	try
		do shell script "echo " & quoted form of (theURL & " " & (current date as string)) & " >> \"$HOME/.eclipse-launcher.log\""
		handleLink(theURL)
	on error errMsg
		do shell script "echo " & quoted form of ("ERROR: " & errMsg) & " >> \"$HOME/.eclipse-launcher.log\""
	end try
	quit
end open location

on handleLink(theURL)
	set AppleScript's text item delimiters to "/"
	set parts to text items of theURL
	set AppleScript's text item delimiters to ""
	if (count of parts) < 4 then return
	set linkKind to item 3 of parts
	set linkId to item 4 of parts
	if linkKind is "app" then
		repeat with entry in allowedApps
			if item 1 of entry is linkId then
				do shell script "/usr/bin/open -a " & quoted form of (item 2 of entry)
				return
			end if
		end repeat
	else if linkKind is "link" then
		repeat with entry in allowedLinks
			if item 1 of entry is linkId then
				do shell script "/usr/bin/open " & quoted form of (item 2 of entry)
				return
			end if
		end repeat
	else if linkKind is "folder" then
		repeat with entry in allowedFolders
			if item 1 of entry is linkId then
				do shell script "/usr/bin/open " & quoted form of ((POSIX path of (path to home folder)) & (item 2 of entry))
				return
			end if
		end repeat
	else if linkKind is "cmd" then
		repeat with entry in allowedCommands
			if item 1 of entry is linkId then
				tell application "Terminal"
					activate
					do script (item 2 of entry)
				end tell
				return
			end if
		end repeat
	end if
end handleLink
