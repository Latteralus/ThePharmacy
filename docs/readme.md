# The Pharmacy

## Overview

The Pharmacy is a pharmacy management game for Windows. You run a compounding pharmacy: hire staff, serve customers, fill and compound prescriptions, keep stock on the shelves, deal with insurance, and try to stay profitable.

## Features

- A working day from 07:00 to 22:00, with customers arriving each hour between 08:00 and 21:00. Pause it or run it at 0.5x, 1x, 2x or 5x.
- Customers check in, see a pharmacist for a consultation, get their prescription filled, and pay at checkout. Each one has limited patience.
- Pharmacists, lab technicians and cashiers pick up work on their own. Skilled staff work faster. Overwork and low pay wear their morale down, and unhappy staff slow down and may quit.
- Products are compounded from raw materials. A new pharmacy starts with a day or two of materials, set to reorder automatically; buy more in the Marketplace, and change the reorder points on the Inventory page.
- Lab equipment that products need: each unit handles one compound at a time and wears with use, so buy more and keep it repaired. Customers who want something you can't make go elsewhere.
- Insurance plans with copays and formularies. A plan pays its own contract price for the drugs it covers, and insurers pay what they owe every other week, so you carry two weeks of costs before the money comes in. Your prices are for self-pay customers.
- A finances page with revenue, expenses, profit and charts, and a bank that lends up to $50,000 when cash runs short.
- Real stakes: margins are thin, like a real pharmacy's. Rent, wages (with payroll taxes and benefits, and overtime at 1.5x past 8 hours) and loan interest are due every night whether or not you can pay. Close three days in a row with cash below $0 and the pharmacy goes bankrupt.
- Ten goals, from your first week to $300,000 in the bank. Reach them all to win, then keep playing.
- A Dashboard (today against yesterday, the bank, your goals), Statistics (every day as charts and a table) and a log of every customer's visit.
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

- **New game:** choose a pharmacy name, starting capital and location. Cities bring more customers and higher rent.
- **Navigation:** use the sidebar to move between pages. Operations shows customers, tasks and staff; the Dashboard shows how the pharmacy is doing.
- **Speed and pause:** in the top bar, or Space to pause and 1–4 for 0.5x, 1x, 2x and 5x.
- **Saving:** the Save button in the top bar, or Ctrl+S. The game also autosaves every 5 minutes of play at 1x speed; change that, or turn it off, in Settings on the main menu. There is one save slot.
- **Settings (main menu):** the speed a new game starts at, autosave, interface size and fullscreen.
- **Loading:** Load Game on the main menu, or Ctrl+L in game (it asks first, since anything since your last save is lost).
- **End of day:** at 22:00 the store closes, wages (and any overtime), overhead and any loan interest are charged, every 14th day the insurers pay their claims, staff morale changes with the day's hours and their pay, goals are checked, and a summary of the day appears. If cash is below $0, the summary says how many days you have to fix it.
- **Bankruptcy:** the game ends after three closings in a row below $0. Borrow on the Finances page to get through a bad stretch. A bankrupt pharmacy can't be saved, so you can load your last save and try again.

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
