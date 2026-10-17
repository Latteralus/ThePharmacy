# The Pharmacy: Installation Guide

The Pharmacy runs on Windows only.

## Requirements

- Windows 10 or 11, 64-bit
- About 400 MB of free disk space
- An internet connection only for downloading the installer and for update checks. The game itself plays offline.

## Installing

1. Download `ThePharmacy Setup <version>.exe` from the [GitHub releases page](https://github.com/Latteralus/ThePharmacy/releases).
2. Double-click the downloaded file.
3. If Windows SmartScreen warns that the app is unrecognized, click **More info**, then **Run anyway**. The installer isn't code-signed yet.
4. Choose whether to install for just you or for everyone on the PC, then choose the install folder.
5. Click **Install**.
6. Launch The Pharmacy from the Start menu or the desktop shortcut.

## Updating

When the game starts, it checks GitHub for a newer release. If it finds one, it downloads it in the background and shows a Windows notification; the update installs the next time you close the game. You can also download and run a newer installer yourself. Your saves are kept either way.

## Where your files are

Everything the game writes is in `%APPDATA%\ThePharmacy\` (paste that into File Explorer's address bar):

- `saves\pharmacy_save.json`: your save
- `saves\pharmacy_save.json.bak`: the save before your most recent one
- `logs\main.log`: the game's log

## Troubleshooting

- **The game won't start or crashes:** check `logs\main.log` for errors, and include it if you report the problem.
- **A save won't load:** close the game, then rename `pharmacy_save.json.bak` to `pharmacy_save.json` to go back to the previous save.
- **Report a problem:** use the [GitHub issues page](https://github.com/Latteralus/ThePharmacy/issues).

## Uninstalling

- Open **Settings > Apps > Installed apps**, find **ThePharmacy**, and choose **Uninstall**.
- The uninstaller leaves your saves. To remove them too, delete `%APPDATA%\ThePharmacy\`.
