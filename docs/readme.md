# The Pharmacy

## Overview

The Pharmacy is a pharmacy management game for Windows. You run a compounding pharmacy: hire staff, serve customers, fill and compound prescriptions, keep stock on the shelves, deal with insurance, and try to stay profitable.

## Features

- A working day from 07:00 to 22:00, with customers arriving each hour between 08:00 and 21:00. Pause it or run it at 0.5x, 1x, 2x or 5x.
- Customers check in, see a pharmacist for a consultation, get their prescription filled, and pay at checkout. Each one has limited patience.
- Pharmacists, lab technicians and cashiers pick up work on their own. Skilled staff work faster. Overwork and low pay wear their morale down, and unhappy staff slow down and may quit.
- Products are compounded from raw materials. Buy materials in the Marketplace and set them to reorder automatically.
- Lab equipment that products need: each unit handles one compound at a time and wears with use, so buy more and keep it repaired. Customers who want something you can't make go elsewhere.
- Insurance plans with copays and formularies. Claims are paid out over time.
- A finances page with revenue, expenses, profit and charts.
- Five research levels that unlock new products and equipment over several in-game days, and bring more customers.
- Reputation, which rises with satisfied customers and falls when they leave unserved.
- Returning customers who come back for refills.

## System requirements

- Windows 10 or 11, 64-bit
- About 400 MB of free disk space

## Installation

1. Download `ThePharmacy Setup <version>.exe` from the [GitHub releases page](https://github.com/Latteralus/ThePharmacy/releases).
2. Run it and follow the installer. You can choose the install folder.
3. Launch The Pharmacy from the Start menu or the desktop shortcut.

See [install-instructions.md](install-instructions.md) for details.

## Playing

- **New game:** choose a pharmacy name, difficulty, starting capital and location. Cities bring more customers and higher rent.
- **Navigation:** use the sidebar to move between pages. Operations shows customers, tasks and staff.
- **Speed and pause:** in the top bar, or Space to pause and 1–4 for 0.5x, 1x, 2x and 5x.
- **Saving:** the Save button in the top bar, or Ctrl+S. The game also autosaves every 5 minutes of play at 1x speed; change that, or turn it off, in Settings on the main menu. There is one save slot.
- **Settings (main menu):** the speed a new game starts at, autosave, interface size and fullscreen.
- **Loading:** Load Game on the main menu, or Ctrl+L in game (it asks first, since anything since your last save is lost).
- **End of day:** at 22:00 the store closes, wages and overhead are charged, staff morale changes with the day's hours and their pay, and a summary of the day appears.

## Troubleshooting

- Saves and logs are in `%APPDATA%\ThePharmacy\`:
  - `saves\pharmacy_save.json` is your save. `pharmacy_save.json.bak` is the save before it.
  - `logs\main.log` is the game's log. Attach it when you report a problem.
- If a save won't load, rename `pharmacy_save.json.bak` to `pharmacy_save.json` to go back one save.

## Support

Report problems on the [GitHub issues page](https://github.com/Latteralus/ThePharmacy/issues).

## License

MIT License. The license text is in [LICENSE](../LICENSE).

## Version

1.0.0
