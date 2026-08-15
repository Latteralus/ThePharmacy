# Changelog & Project Notes

This file is project memory. It's written for whoever (human or Claude) picks
this project back up after time away: what the game actually is right now,
terms that don't explain themselves, what's been done, and what's still
broken or unfinished. Update it whenever you finish a meaningful chunk of
work — add a session entry, and touch "Current State" / "Known Issues" if
they changed.

## Current state (as of 2026-08-15)

**What this is:** *The Pharmacy* (a.k.a. PharmaSim), an Electron desktop
game where you run a compounding pharmacy in real time — hire staff, fill
prescriptions, compound products, manage inventory and insurance claims.
Single-player, offline, no accounts.

**Architecture:** Plain JavaScript, no bundler, no framework. Every file is
a `<script>` tag loaded by `main.html` (game screen), `index.html` (main
menu), or `settings.html`. Modules communicate by hanging objects/functions
off `window` (`window.taskManager`, `window.finances`, `window.updateUI`,
etc.) rather than `import`/`export`. As of 2026-08-15 the codebase is
starting an **incremental TypeScript migration** — `tsc` compiles `.ts` →
`.js` in place with no bundler, so this architecture doesn't change, files
just gain types one at a time. `docs/revision.md` is the live migration plan
and per-file progress tracker (3 of 47 files converted so far); a much
larger Webpack/React/Redux rewrite was considered and explicitly rejected —
see that file for why.

**It works.** New game, load game, save game, the tasking/production loop,
and the UI all run without crashing as of this writing. That was not true
as of 2026-08-14 morning (see session log) — a commit from April 2025 had
quietly gutted large parts of the game and nothing since had fixed it until
this round of sessions.

**Run it:**
- `npm start` — launch the app
- `npm test` — Jest unit tests (`test/unit/`)
- `npm run test:e2e` — Playwright end-to-end tests that drive the real
  Electron app (`test/e2e/`)

**Save location:** `%APPDATA%/thepharmacy/saves/pharmacy_save.json`
(via `game-integration.js`, main process). One save slot, no autosave
rotation.

## Glossary

- **"The TestTime commit"** — `d64821a`, dated 2025-04-12, message
  "TestTime". Deleted `materials.js` outright, gutted `ui.js`,
  `taskManager.js`, `timeEvents.js`, and `production.js` down to stubs,
  and rewrote `products.js`/`main.js` with an incompatible architecture
  (including switching `main.js` to ES-module `import` syntax inside a
  plain `<script>` tag). Nothing since had fixed it — every session before
  2026-08-14 in this project was effectively running a broken game. Fixed
  by restoring the pre-TestTime versions from `b5b10c4` ("init"). If you
  ever find a module that seems weirdly thin or disconnected from
  everything around it, check `git log -- <path>` against this commit
  before assuming it's intentional.
- **Employee roles** — canonical set is `'Pharmacist'`, `'Lab Technician'`,
  `'Cashier'`. Older/typo role strings (`'Sales Rep'`, `'SalesRep'`,
  `'Assistant'`, `'Clerk'`, etc.) get coerced to `'Cashier'` by
  `taskAssignment.normalizeEmployeeRoles()`, which runs on load and every
  60s. If you add a role-gated feature, grep for all three canonical
  strings — several files still have stale branches for retired names
  (see the Cashier wage bug in the session log below for what that costs).
- **Task lifecycle** — a task is a plain object in `window.taskManager`'s
  internal `tasks` array: `status` moves `pending` (or `pending-dependent`,
  waiting on another task) → `inProgress` → `completed`, at which point
  `finalizeTask()` runs side effects and removes it from the array.
  `type` is one of `compound`, `fillPrescription`, `customerInteraction`,
  `consultation`, `production`. Progress advances in-game-minutes,
  driven every animation frame from `main.js`'s render loop.
- **The single progress-bar system** — `main/js/taskbars.js` is the only
  place progress-bar UI gets built (`window.taskbars.createProgressBar`).
  `operationsPage.js` and `employeesPage.js` call into it rather than
  rolling their own. This used to be three competing implementations;
  see the 2026-08-14 tasking-engine session below.
- **The single watchdog** — `taskManager.js`'s integrity check, on a 60s
  timer, is the one place stuck-task/stuck-employee/stuck-customer cleanup
  happens. It used to be split across `taskManager.js`, `customers.js`,
  and a third, unloaded file (`task-error-recovery.js`, now deleted).

## Known issues / not yet addressed

From the 2026-08-15 audit. Nothing below is fixed yet — this is the
backlog, not a status report. Full detail and file:line references are in
the audit artifact (ask the user if they still have the link; if not,
re-run a codebase audit rather than assuming this list is exhaustive, since
some of it may have been addressed in a session this file wasn't updated
for).

**Silently-does-nothing features** (UI saves a value, nothing reads it):
equipment auto-purchase threshold/amount, equipment durability display
(never decrements), research pacing (unlock happens instantly on click;
the multi-day timer is cosmetic only), `brandReputation.brandScore`
(frozen at its starting value forever — only `reputationScore` actually
moves), insurance plan `formulary` (always null, every plan covers
everything), prescription `refillsAllowed`/`assignedEmployeeId` (generated,
never read).

**Confirmed dead code** (zero callers, safe to delete): the four
`main/components/*Card.js` files plus `card.js` (not loaded by any HTML
file, and use ES-module syntax that would throw if they were);
`main/components/panel.js`'s `window.createPanel` (loaded, never called);
~250 lines of placeholder IPC handlers in `main/ipcMain.js` (namespaced
`game:*`/`tasks:*`/etc. channels nothing in the renderer ever invokes);
`employees.js`'s `promoteEmployee`, `updateEmployeeSkills`, and a duplicate
`calculateEmployeeEfficiency` (the one actually used lives in
`taskAssignment.js:455` — two copies exist, risk of drift); `gameLogic.js`
(an entire unused Web Worker); `task.priority` (set by every task creator,
read by nothing — `taskAssignment.js` uses its own hardcoded priority
table instead).

**Stub pages:** Dashboard, Orders, Customers, Marketing, Statistics are
one-line placeholders sitting in the same sidebar as fully-built pages.
Traced to the original design doc (`docs/overview.txt`) — these map to
"Phase 3+" of a five-phase plan that was never reached. Not bugs exactly,
but they read as broken to a player.

**Packaging, not yet fixed:** `electron-builder`'s `build.win.icon` points
at `assets/icon.ico`, which doesn't exist — a real build will fail or ship
unbranded. `package.json`'s `appId` is still the npm-init default
(`com.yourcompany.thepharmacy`); `author`/`license` have since been filled
in for real (`Latteralus` / MIT) outside of a Claude session — check
`package.json` directly rather than trusting this line if it's been a
while. No `files` allowlist, so a real build would bundle `docs/`,
`test/`, and dev config into the shipped app.

**Low-priority formatting/cosmetic:** a couple of raw un-rounded numbers
in `financesPage.js`/`researchPage.js`; every real page re-declares its
own card/grid CSS inline instead of sharing `main/css/style.css`
(`financesPage.js` re-injects its `<style>` block on every render, not
just once); an invalid `//` comment inside a CSS template literal in
`inventoryPage.js:420` (harmless, browser ignores it); DevTools force-open
on every launch; CSP present on `index.html` only.

## Session log

Newest first. Each entry is what changed and why — check `git log` for the
full diff, this is the narrative version.

### 2026-08-15 — TypeScript migration started (tooling + first file)

User asked to begin transitioning the codebase from JS to TS. `docs/revision.md`
previously documented a full Webpack/React/Redux/TS rewrite from 2025 that
was never built; discussed the tradeoffs directly with the user and they
agreed a big-bang rewrite isn't worth the risk — this project already lived
through that failure mode once (the TestTime commit, see Glossary above)
and a rewrite is the same shape of risk at a larger scale. Went with
incremental, in-place TS adoption instead: `tsc` compiles `.ts` → `.js` with
`module: "none"`, no bundler, no change to the `<script>`-tag/`window`-global
architecture. `docs/revision.md` has been rewritten to document this as the
current, active plan (with a running per-file progress table) instead of the
archived rewrite.

Added: `tsconfig.json` (`target: ES2022`, `strict: true`, no `outDir` — 
compiles in place); `typescript` devDependency (pinned to the 5.9.x line —
the newly-released TS 7 native/Go-ported compiler dropped `module: "none"`
support, which this setup depends on, so stayed on the well-established 5.x
line rather than redesigning around that); `main/js/types/global.d.ts` for
ambient `window.*` typings, growing per converted file; a `build:ts` npm
script chained in front of `start`/`test`/`test:e2e`/`dist`/`publish` so
compiled output is always fresh (compiled `.js` for converted files is now
gitignored — build artifact, not source, to avoid the exact staleness bugs
this project keeps hitting).

Converted the first file as a proof of concept: `main/js/data/insurance.js`
→ `insurance.ts` (the one true leaf in `main/js/data/` — assigns
`window.insuranceData`, reads nothing else, so needed zero ambient type
dependencies). Verified end-to-end, not just compiled: `npm run build:ts`
clean, 8/8 Jest, 2/2 Playwright, and a manual Electron launch confirming
`window.insuranceData` still holds all 6 plans and
`customers.getRandomInsurance()` still works, no new console errors.

The other 46 files are unconverted — see `docs/revision.md`'s progress
table for what's next; conversion will continue leaf-most-file-first,
one small batch at a time, each independently verified the same way.

### 2026-08-15 — TypeScript migration: second batch (names.js, materials.js)

Continued the migration started earlier the same day. Converted the two
remaining true-leaf files in `main/js/data/` — `names.js` and
`materials.js` — both only ever read their own `window.*` global, never
another file's, so no new ambient dependencies were needed beyond what they
already assign (added to `main/js/types/global.d.ts`).

Verified more rigorously than the first file: in addition to the usual
`build:ts` clean / 8/8 Jest / 2/2 Playwright, wrote a throwaway script that
`require()`s the pre-conversion `.js` (from git history) and the
post-conversion generated `.js` side by side and diffs their data —
confirmed byte-identical `window.namesData` and `window.materialsData`, and
identical `calculateMaterialCost()` output. Manually launched the app and
visually confirmed the Marketplace page (iterates `window.materialsData`)
renders correctly, and that `getRandomFirstName`/`getRandomLastName`/
`generateDoctorName` still work.

Found, but deliberately did not fix (out of scope for a migration session):
`main/js/data/products.js` independently defines `window.calculateMaterialCost`
with the same signature as the one in `materials.js`. Since `materials.js`
loads after `products.js` in `main.html`, its version silently wins at
runtime — the copy in `products.js` is dead code. Noted in
`docs/revision.md`'s progress table for a future cleanup pass.

### 2026-08-15 — Save/load fixed, three high-severity bugs fixed

The audit below found the save system was completely non-functional — two
independent bugs, either alone sufficient to prevent saving:

1. `electron-main.js` registered in-memory-only `save-game`/`load-game`/etc.
   IPC handlers at module load, *before* `game-integration.js`'s real
   disk-writing versions could register for the same channel names.
   Electron throws on a duplicate handler registration; the throw was
   swallowed by a try/catch, silently discarding the rest of
   `game-integration.js`'s setup (`get-saved-games`, `delete-saved-game`,
   `log-error` never registered either). Fixed by deleting the eight
   duplicate top-level handlers in `electron-main.js`.
2. The renderer-side file that defines `window.saveGame()` and the only
   Save UI (autosave, Ctrl+S/Ctrl+L) — `electron-integration.js` — was
   sitting at the project root instead of `main/js/`, where `main.html`
   actually looks for scripts. It had never loaded. Moved into `main/js/`,
   wired into `main.html`, and a visible **Save button** was added to the
   top bar (next to the notification bell) since a keyboard shortcut alone
   isn't discoverable.

Verifying the fix for real (launching the actual Electron app, not just
reading code) surfaced three more bugs directly blocking it, all fixed in
the same pass:

3. `main/js/debug.js` renders a full-screen, always-on console-log overlay
   that intercepts every click on the page — including the new Save
   button — until someone finds and clicks its tiny "Hide Debug" button.
   It now starts hidden, with a small always-visible toggle tab instead.
4. `window.brandReputation` and every `equipmentData` item carry live
   methods (`calcCustomers`/`gainReputation`/`loseReputation`, and
   `isUnlocked()` respectively). Functions can't cross Electron's IPC
   structured-clone boundary — saving threw `An object could not be
   cloned`. Fixed by sending only plain data fields and re-attaching the
   methods after load (in both load paths — see next point).
5. Saved dates round-trip through the JSON save file as plain strings, not
   `Date` objects. Loading a save crashed the UI immediately
   (`dateObj.getMonth is not a function` in `ui.formatDateTime`). There
   are two separate "load a game" implementations —
   `gameInitializer.js`'s `loadSavedGame()` (what the main-menu Load Game
   button actually calls) and `electron-integration.js`'s `loadGame()`
   (bound to Ctrl+L) — both had this bug and both needed the same three
   fixes (date revival, equipment method re-attachment, brandReputation
   merge-not-overwrite).

Also fixed, the three high-severity bugs from the audit:

6. `helpers.calculateStartingWage` had a stale `'Sales Rep'` branch instead
   of `'Cashier'` (the role was renamed in `employees.js` at some point;
   this file wasn't updated to match). Every Cashier hire got `NaN` wage
   math and silently fell back to a flat $60,000 regardless of skill
   level. One-word fix.
7. `settingsPage.js`'s `setCustomerFrequency` wrapped
   `window.brandReputation.calcCustomers` in a new multiplier function on
   every dropdown change, without ever unwrapping the previous patch —
   changing the setting twice compounded the multiplier instead of
   replacing it. Fixed by capturing the true original function once
   (`window._originalCalcCustomers`) and always re-wrapping from that.
8. The sidebar "Logout" button pointed at `window.location.href =
   '/logout'` — no such route exists in this Electron app. Relabeled
   "Main Menu" and repointed at `index.html`, matching the pattern used
   elsewhere in the app.

Added `test/e2e/saveLoad.spec.js` — a full save → quit → relaunch → load
round trip against the real app, asserting pharmacy name, cash, revived
dates, and re-attached methods all survive. Verified manually against the
running app in addition to the automated suite. Test totals: 8/8 Jest,
2/2 Playwright.

Also consolidated `docs/structure.txt` (an early, superseded structure
sketch) into `docs/revision.md` and deleted the `.txt` file, and created
this changelog.

### 2026-08-15 — Full codebase audit

Read through the Electron main process, IPC, preload, save/load, every
page module, every UI component, and the entire data/economy layer
(employees, equipment, insurance, research, brand reputation, customers,
prescriptions), plus git history, dependencies, and packaging config.
Three parallel investigations plus direct review, 60+ files.

Headline finding: the save system was completely broken (see the
2026-08-15 "Save/load fixed" entry above for the fix). Also found the
three high-severity bugs fixed above, six "silently does nothing"
features, a batch of confirmed dead code, and the usual formatting/
packaging cleanup — see "Known issues" above for what's still
unaddressed. Health check came back clean: `npm audit` zero
vulnerabilities, dependencies current, no secrets in git history, sane
`contextBridge` preload surface, tests passing.

Published as a formatted report (Artifact); ask the user if they still
have the link. The content is folded into "Known issues" above regardless,
so this file doesn't depend on that link staying valid.

### 2026-08-14 — Tasking engine consolidated, decimals fixed

User asked to work on the employee tasking engine and its UI, specifically
fixing progress/time displays rendering with excessive decimal places
(e.g. `1.000000000000` instead of `1.00`). Investigation found the root
cause plus a lot of surrounding sprawl:

- **Three competing progress-bar rendering systems** running concurrently:
  `operationsPage.js`'s native `<progress>` elements, `employeesPage.js`'s
  hand-rolled bar, and `taskbars.js`'s DOM-replacing "enhanced" bars (which
  monkey-patched `window.showPage` to hook itself in). Only `taskbars.js`
  formatted numbers correctly; the other two printed raw floats.
- **Four overlapping watchdog/self-healing loops** on different timers (5s,
  60s, 2min, plus one nested inside the 60s one) doing conceptually similar
  stuck-task/stuck-employee/stuck-customer cleanup — one of the four,
  `task-error-recovery.js`, turned out to not even be loaded by any HTML
  file (dead code, also had an internal bug double-registering its own
  timer).

Consolidated to one of each (see Glossary above): `taskbars.js` became the
single progress-bar system, exposing `window.taskbars.createProgressBar()`
for pages to call directly; `taskManager.js`'s 60s integrity check became
the single watchdog, now driving stuck-customer detection too (removed
`customers.js`'s redundant separate 2-minute timer); deleted the unloaded
`task-error-recovery.js`. Also deduped a ~25-line copy-pasted
`updateUI`-fallback block in `production.js` into one helper, and fixed a
compound-task ID collision risk (`compound-${product.id}` had no
uniqueness guard — a comment literally said "removed timestamp"; added it
back).

Added `test/unit/taskbars.test.js` as a direct regression test for the
decimal-formatting fix.

### 2026-08-14 (earlier) — Fixed the TestTime regression; game runs again

Starting point: user pasted a console error log showing the game crashing
immediately on "New Game" (`window.updateUI is not a function`,
`window.ui.formatDateTime is not a function`, `productsData is missing`,
`materialsData is missing`). Root-caused to the TestTime commit (see
Glossary) — a regression that had been sitting unfixed since **April
2025**; every session on this project before this one was working with a
broken build.

Restored `materials.js` (fully deleted), `ui.js`, `taskManager.js`,
`timeEvents.js`, `production.js`, and `main.js` from their pre-TestTime
versions (commit `b5b10c4`). Removed an orphan `gameInitialization.js`
that TestTime had added (unreferenced, used ES-module syntax incompatible
with the rest of the codebase). Also fixed, once the restoration let
execution get far enough to expose them:

- `window.updateUI` was called as a bare global in ~23 places across the
  codebase, but only ever existed as `window.ui.updateUI` — added an
  alias.
- `gameInitializer.js` and `game-bootstrap.js` both independently ran the
  full game-initialization sequence (one via `DOMContentLoaded`, one via
  `setTimeout`), so the game silently initialized twice on every launch.
  Removed the duplicate self-triggering block in `gameInitializer.js`.
- `finances.js` had a self-invoking block at the bottom that called
  `setToSuggestedPrices()` at its own script-load time — before `ui.js`
  (which defines `updateUI`) had even loaded, guaranteeing an uncaught
  exception on every launch, plus incorrectly resetting prices even on
  the "load game" path. Removed (redundant with `gameInitializer.js`'s
  own correctly-timed call).
- `taskManager.js`'s integrity checker referenced `fixedEmployeeCount`
  outside the block scope it was declared in — a `ReferenceError` that
  only started firing once `taskManager.js` was a real implementation
  again instead of a stub.

Set up test infrastructure from scratch (none existed before): Jest for
unit tests (`test/unit/gameLogic.test.js` — materials/products loading,
cost calculation, a direct regression test for the `updateUI` crash) and
Playwright for end-to-end (`test/e2e/newGame.spec.js` — launches the real
Electron app, drives the actual New Game UI flow, asserts no console
errors). Verified against the real running app via Electron's remote
debugging protocol, not just static analysis.

Follow-up in the same session: removed two remaining cosmetic issues — a
dangling `<script>` reference to a `main/js/electron-integration.js` that
didn't exist at that path yet (see the 2026-08-15 entry above for where it
actually was), and a "fallback path finder" debug block in `main.html`
that always 404'd.
