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
and per-file progress tracker (41 of 46 files converted so far —
every renderer-side `<script>`-tag file, including `main/js/pages/`, is now
fully typed; the one remaining main-process file, `main/ipcMain.js`, turned
out to be entirely dead code and was deleted rather than converted, which is
why the denominator dropped by one — though a chunk of the remainder besides
that turned out to be dead code excluded from the count too — see that
file); a much
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
never read). **Newly found while converting `taskAssignment.js` to TS
(2026-08-15):** `canFillPrescription`'s inventory check reads
`prescription.quantityNeeded` — but `quantityNeeded` only ever exists on the
fill *Task* object (set in `prescriptions.js`), never on the `Prescription`
itself, so that lookup is always `undefined` and the check silently falls
through to `prescription.dosage` instead. Not fixed (out of scope for a
migration pass), preserved via a local cast in `taskAssignment.ts`.
**Correction to a prior entry:** `gameInitializer.js` calling
`window.runFallbackInitialization` was previously listed here as dead —
that was wrong. `gameInitializer.js` *defines*
`window.runFallbackInitialization` (unconditionally, at its own bottom) and
`main.html` really does call it or the game silently fails to start; the
confusion was with `fallback.js`'s *unrelated*, unexported, genuinely-dead
local function of the same name. Found and corrected while actually
converting `gameInitializer.js` to TS (2026-08-15) — see that file's
progress-table entry.
**Newly found while converting `settingsPage.js` to TS (2026-08-15):** the
Settings page's Simulation Speed dropdown has never worked —
`setGameSpeed` bails out on `if (!window.GAME_CONFIG)`, but nothing ever
sets `window.GAME_CONFIG`; `main.ts` keeps its own `SIMULATION_SPEED` in a
script-local `const GAME_CONFIG`, not on `window`. Confirmed via manual
launch (console logs "Game config not found" every time the dropdown
changes). Not fixed — see `docs/revision.md`'s `settingsPage.ts` entry for
the related (and compile-forced) `window.setGameSpeed`/`toggleGamePause`
shadowing bug found in the same file.
**Newly found while converting `inventoryPage.js` to TS (2026-08-15):** the
Inventory page's "Raw Materials" tab click handler only toggles which grid
is visible — it never calls `renderMaterials()`, so the grid is empty until
the filter input fires at least once. Pre-existing in the original `.js`,
confirmed via manual launch, not fixed.

**Confirmed dead code** (zero callers, safe to delete): the four
`main/components/*Card.js` files plus `card.js` (not loaded by any HTML
file, and use ES-module syntax that would throw if they were);
`main/js/data.js`, `dataInitialization.js`, `events.js`, `fallback.js`,
`inventory.js`, `ipcRenderer.js`, `ipcTypes.js`, and `orders.js` (found
2026-08-15 while scoping the TS migration — none referenced by any
`<script>` tag or `require`/`import` anywhere live; `orders.js` even
`import`s `inventory.js` via ES-module syntax, which would throw if either
were ever actually loaded); `main/components/panel.js`'s `window.createPanel` (loaded, never called);
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

### 2026-08-15 — TypeScript migration: eleventh batch (electron-integration) + `main/ipcMain.js` deleted as dead code

Follow-on to the same session's page-file batch, at the user's request to
finish scoping and converting the two remaining non-renderer-page files:
`main/js/electron-integration.js` and `main/ipcMain.js`.

`electron-integration.js` turned out to be a normal renderer `<script>` file
despite its name — DOM APIs, `window.*` globals, wrapped in an IIFE, no
`require`/`module.exports` anywhere. Converted the same way as every other
renderer file, no special build setup needed. It's the file that actually
*defines* `window.saveGame`/`window.loadGame` (every other file that touches
them was just checking `typeof window.saveGame === 'function'` against an
optional stub) — added `GameApi.saveGame`, a new `ElectronApi` interface, and
`AutoSaveApi` to `global.d.ts` accordingly. The save payload's type is
deliberately `unknown` rather than `SavedGameData`: it strips each
`equipmentData` item's `isUnlocked()` method before it crosses IPC (functions
don't survive structured clone), so it's a slightly different shape than what
`loadGame()` hands back — `loadGame` re-attaches `isUnlocked` afterward.
Verified via the existing `saveLoad.spec.js` e2e test, which already drives
exactly this: save → quit → relaunch → load, then asserts
`isUnlocked` is a function again and `brandReputation`'s methods survived.

`main/ipcMain.js` was scoped next — being a `require()`d Node/CommonJS file
rather than a `<script>` tag, it genuinely needed a second, isolated tsconfig
(`module: "commonjs"`, Node lib, `@types/node`) to compile at all, since the
existing single tsconfig's `module: "none"` + DOM lib setup is built entirely
around the renderer's `window`-global architecture. While setting that up and
actually reading the file closely enough to type it, its channel names
(`game:saveGame`, `tasks:assignTasks`, `finances:processTransaction`, ...)
turned out not to match anything `preload.js` actually invokes —
`preload.js`'s `gameAPI.saveGame`/`.loadGame`/etc. call totally different,
un-namespaced channels (`save-game`, `load-game`, ...) that are handled by
`game-integration.js`, a completely separate file `main/ipcMain.js` has no
relationship to. So all ~250 lines `main/ipcMain.js` registers are
unreachable — this *confirms* the existing Known Issues entry about
placeholder IPC handlers, rather than contradicting it. Converting confirmed
-dead code has no payoff under this migration's own stated policy, and would
have meant permanently maintaining a second tsconfig and a new dev dependency
for code that never runs — so instead of converting it, the file and its one
call site (`initializeIPC(mainWindow)` in `electron-main.js`) were deleted.
The tsconfig/`@types/node` scaffolding set up to compile it was reverted
along with it. `main/ipcMain.js`'s known-dead-code note in this file's Known
Issues section above is removed now that the file itself is gone.

Verified: `build:ts` clean, 8/8 Jest, 2/2 Playwright — including
`saveLoad.spec.js`'s real save → quit → relaunch → load round trip, both
before writing `electron-integration.ts` (to confirm the baseline) and after
deleting `main/ipcMain.js` (to confirm its handlers were truly never on the
load-bearing save/load path).

41 of 46 files converted (the denominator dropped by one for the deleted
file). Every renderer-side `<script>`-tag file in the app is now typed; what
remains is exclusively the four confirmed-dead `main/components/*Card.js`
files, which were never planned for conversion.

### 2026-08-15 — TypeScript migration: tenth batch (operationsPage, employeesPage, financesPage, inventoryPage, marketplacePage, settingsPage) — `main/js/pages/` fully converted

At the user's explicit request to finish out the page files in one sitting
(overriding the standing 5-files-per-batch pace for this one session),
converted all 6 remaining files under `main/js/pages/`: `operationsPage.js`,
`employeesPage.js`, `financesPage.js`, `inventoryPage.js`,
`marketplacePage.js`, `settingsPage.js`. `main/js/pages/` — and, with it,
every renderer-side `<script>`-tag file — is now fully typed. What's left of
the migration is `main/components/{activityCard,card,cashCard,inventoryCard}.js`
(confirmed dead code, not actually planned for conversion) and
`main/js/electron-integration.js`/`main/ipcMain.js`, which run in Electron's
main process rather than as renderer `<script>` tags — a genuinely different
architecture (CommonJS-style Node, not `window`-global) that needs its own
tsconfig/build scoping decision before conversion starts, deliberately not
attempted in this batch.

Two of the six were true leaves (`operationsPage.ts`, `marketplacePage.ts`),
converting the same way every prior leaf page did. The other four needed
real fixes:

- **`settingsPage.ts` forced an actual compile-time resolution, not just a
  note.** The file declares top-level `function setGameSpeed(speed) {...}`
  and `function toggleGamePause() {...}` — in a plain (non-module) `<script>`,
  top-level `function` declarations become `window` properties, exactly like
  an explicit `window.x = ...` assignment would. Since `settingsPage.js`
  loads *after* `main.js` in `main.html`, these have been silently
  overwriting `main.ts`'s real `window.setGameSpeed`/`window.toggleGamePause`
  on every single game load — since the game's founding, as far as this
  session could tell. TypeScript caught it the moment both files had types:
  `main.ts`'s assignment (`(speedMultiplier: number) => void`) couldn't
  satisfy the merged global type once `settingsPage.ts` also declared a
  same-named global returning `boolean`. There was no way to preserve the
  shadowing behavior byte-for-byte and still get a compiling project, so both
  were changed from `function` declarations to `const ... = function`
  expressions, which stay scoped to the file instead of leaking onto
  `window`. Grepped the whole codebase (including `test/`) first to confirm
  nothing outside `settingsPage.ts` reads `window.setGameSpeed` or
  `window.toggleGamePause` — so this changes what those two properties
  silently *were*, but not any behavior any code path actually exercises.
- **`window.GAME_CONFIG` turned out to never be set at all** — `main.ts`
  keeps `SIMULATION_SPEED` in a script-local `const`, never on `window` — so
  the Settings page's speed dropdown has always failed silently. See Known
  Issues below; not fixed, just newly confirmed and documented.
- **`financesPage.ts`** needed a hand-written ambient `declare class Chart`
  (chart.js loads via `<script>`, not `import`, so TS has no built-in
  knowledge of it) and the same `Date` arithmetic → `.getTime()` fix
  `finances.ts` needed earlier for its own transaction sort.
- **`inventoryPage.ts`** surfaced a real, pre-existing UI bug while manually
  verifying the batch: the "Raw Materials" tab never actually renders
  materials until the filter input fires once. Not introduced by this
  conversion (same logic existed in the original `.js`); documented, not
  fixed.

Several more of the now-familiar `.value`/`.textContent` `String(...)`
DOM-typing fixes (same pattern as every earlier page), and
`settingsPage.ts`'s `addRandomEmployee` reuses `employees.ts`'s established
`Partial<EmployeeSkills>` / unrecognized-role-leaves-`{}` pattern for its own
near-identical candidate-generation logic.

Verified: `build:ts` clean, 8/8 Jest, 2/2 Playwright, plus a temporary
Playwright script (removed after use) driving the real Electron app through
all 6 pages — Operations' employee/task list, Marketplace's purchase flow
(cash decremented correctly), Inventory's product/materials tabs, Employees'
full hire flow (candidate generation through to roster increment), Finances'
charts and transactions tab, and Settings' day/pause toggles (confirmed the
`GAME_CONFIG` dropdown bug reproduces exactly as documented, no unexpected
console errors).

### 2026-08-15 — TypeScript migration: ninth batch (customersPage, marketingPage, statisticsPage, equipmentPage, researchPage)

Continued the migration at the standing 5-files-per-batch pace, moving into
`main/js/pages/` proper (the last two batches picked up `dashboardPage.js`/
`ordersPage.js` as trivial stubs alongside the task/time engine). Converted
`main/js/pages/customersPage.js`, `main/js/pages/marketingPage.js`, and
`main/js/pages/statisticsPage.js` — three more one-line placeholder pages,
same shape as `dashboardPage.ts`/`ordersPage.ts` (see Known Issues above) —
plus `main/js/pages/equipmentPage.js` and `main/js/pages/researchPage.js`,
the two smallest *real* (non-stub) page files and both true leaves: neither
reads another still-untyped page file, only already-typed data-layer globals
(`equipmentData`, `financesData`, `updateFinancialSummary`, `researchData`,
`research`, `productsData`). `main/js/pages/marketplacePage.js` was passed
over this round even though it's equally leaf-shaped (nearly identical
purchase-flow structure to `equipmentPage.js`) — batch was already full at 5.

Added `window.renderCustomersPage`/`renderMarketingPage`/
`renderStatisticsPage`/`renderEquipmentPage`/`renderResearchPage` to
`global.d.ts`, all optional (matching `renderDashboardPage`/`renderOrdersPage`
— nothing reads them through that property; `main.ts`'s `showPage` looks page
renderers up dynamically by constructed string name).

One new local type introduced: `equipmentPage.ts`'s `EquipmentCardRefs`, for
the array of per-card DOM-element references built during render. Two
behavior-preserving fixes for strict DOM typings, same pattern as
sideBar.ts/topBar.ts's earlier `textContent = String(...)` fix:
`equipmentPage.ts` assigns `HTMLInputElement.value` (a `string`) from
`eq.autoPurchaseThreshold \|\| 0`/`eq.autoPurchaseAmount \|\| 0` (a `number`)
for the auto-purchase threshold/amount inputs' initial values — wrapped both
in `String(...)`, producing the identical string either way. No such fix was
needed in `researchPage.ts`.

Verified: `build:ts` clean, 8/8 Jest, 2/2 Playwright. Also drove the real
Electron app directly (temporary Playwright script under `test/e2e/`,
removed after use): started a new game; confirmed `showPage('customers')`/
`showPage('marketing')`/`showPage('statistics')` each render their expected
`<h2>` header; on the Equipment page, confirmed 8 unlocked equipment cards
render, the search filter narrows the grid correctly, and buying 1 unit of
the first item deducts the correct cost from `financesData.cash` ($100,000 →
$99,500 for a $500 item) with the success alert firing; on the Research
page, confirmed the current-level display, and that clicking "Start
Research" deducts the next level's cost from `financesData.cash` ($99,500 →
$94,500). No new console errors — only the pre-existing, already-documented
preload.js noise.

34 of 47 files converted so far (13 remaining). `main/js/pages/` is now 5 of
11 done; remaining: `operationsPage.js`, `employeesPage.js`,
`financesPage.js`, `inventoryPage.js`, `marketplacePage.js`,
`settingsPage.js`.

### 2026-08-15 — TypeScript migration: eighth batch (taskManager, taskAssignment, timeEvents, dashboardPage, ordersPage)

Continued the migration at the standing 5-files-per-batch pace. Moved out of
`main/js/data/` and the customers/production/prescriptions cluster into the
task/time engine — the last thing several already-converted files
(`customers.ts`, `production.ts`, `prescriptions.ts`) had been holding a
partial/placeholder `Task`/`TaskManagerApi`/`TaskAssignmentApi` type for.
Converted `main/js/taskManager.js`, `main/js/taskAssignment.js`,
`main/js/timeEvents.js`, `main/js/pages/dashboardPage.js`, and
`main/js/pages/ordersPage.js` — the last two are one-line stub pages (see
Known Issues above), picked up as trivial, leaf-most additions to round out
the batch alongside the heavier task/time engine trio (task engine and
`timeEvents.js` are mutually referential — `timeEvents.js` drives
`taskManager.updateTasks`, `taskManager`/`taskAssignment` schedule
auto-assignment via `setTimeout` back into each other — so all three
converted together rather than split across batches).

`Task`, `TaskManagerApi`, and `TaskAssignmentApi` are now their real, full
types (upgraded from customers.ts's earlier partial index-signature
placeholders); `TimeEventsApi` similarly went from a 3-method partial to its
full real shape, plus a new `TimeEventsConfig` type for `CONFIG`.

Notable typing decisions, all confirmed behavior-preserving:
- Two non-null assertions in `taskManager.ts` preserve pre-existing
  defensive-at-runtime behavior rather than adding new guards:
  `task.prescriptionId!`/`product!` when calling
  `taskAssignment.canFillPrescription`/`production.canCompound` (both
  callees already handle a missing value gracefully at runtime — the
  assertion only satisfies their required-parameter *signatures*), and
  `customer.prescriptionId!` in the `readyForCheckout` →
  `finances.completePrescription` path (a customer only reaches that status
  after a prescription has already been assigned to them, per
  `customers.ts`'s own `generateCustomer` flow).
- Same pattern in `taskAssignment.ts`: `autoAssignTasks`' checkout-task
  filter calls `getCustomerById(t.customerId!)` without a preceding truthy
  check, matching the original's own unguarded shape (customerInteraction
  tasks always carry a `customerId` in practice).
- Found, not fixed, while converting `taskAssignment.ts`: `canFillPrescription`
  reads `prescription.quantityNeeded`, but that field only ever exists on the
  fill *Task* object (`prescriptions.js` sets it there), never on a
  `Prescription` — always `undefined` at runtime, silently falling through to
  `prescription.dosage`. Preserved via a local cast; folded into Known Issues
  above rather than fixed, matching this migration's standing rule.
- One ambient-type correction, confirmed non-behavior-changing:
  `CustomersApi.generateCustomer`'s `hour` parameter went from required to
  optional. `timeEvents.ts`'s `spawnCustomersForHour` has always called it
  with zero arguments (a pre-existing quirk, unrelated to this batch), and
  `hour` was already dead/unused inside `generateCustomer`'s own body — the
  type now just matches what was already true at runtime.
- `window.forceTimeForward` (the debug-console time-skip helper `timeEvents.js`
  defines at its own bottom, outside the module IIFE) and
  `window._taskAssignTimeout` (`taskManager.js`/`taskAssignment.js`'s shared
  debounce handle for batching auto-assignment) both added to `global.d.ts`
  for the first time. `window.renderDashboardPage`/`renderOrdersPage` also
  added even though nothing reads them through that property — `main.ts`'s
  `showPage` looks page renderers up dynamically by constructed string name,
  not by static reference; added for consistency with every other
  directly-assigned global, matching the convention already used for
  `renderOperationsPage`/`renderInventoryPage`/etc.

Verified: `build:ts` clean on the first attempt (no compile errors), 8/8
Jest, 2/2 Playwright. Given this batch is inherently stateful/cross-module
(the task and time engines aren't pure-logic in the way `helpers.ts` or
`research.ts` were), skipped a pure old-vs-new script diff in favor of a
scripted real-Electron-app driver: started a new game, generated a customer
through `window.customers.generateCustomer()` and confirmed the resulting
check-in task auto-assigned to a Cashier within the expected debounce
window; called `window.forceTimeForward(2)` and confirmed task `progress`
advanced correctly across multiple in-flight tasks; called
`taskManager.forceCompleteTask()` on the check-in task and confirmed the
full finalization cascade fired correctly (customer status
`waitingForCheckIn` → `waitingForConsultation`, a new `consultation` task
created and immediately auto-assigned); called
`debugTaskStatus`/`logTaskAssignmentState`/`getProgressAnomalies`/
`normalizeEmployeeRoles` directly and confirmed none threw; confirmed both
stub pages render via `showPage`'s dynamic lookup. No new console errors —
only the pre-existing, already-documented preload.js noise.

29 of 47 files converted so far. `main/js/data/` and the task/time engine
are now fully converted. Remaining: the 11 files under `main/js/pages/`
(besides the two just converted), plus the confirmed-dead
`main/components/*Card.js` files and `main/js/electron-integration.js`/
`main/ipcMain.js` (main-process-adjacent, not yet scoped for this
migration).

### 2026-08-15 — Fixed everything flagged during the seventh migration batch

User asked to fix all the issues surfaced while converting/verifying the
seventh batch (below) rather than leave them documented-but-open. Four
fixes, all re-verified against the real running app afterward:

1. **`main.ts`'s dead `updateCountdownTimers` guard.** Nothing in the
   codebase ever defines `window.updateCountdownTimers`, so the `typeof`
   check in `renderUI` never passed. Removed the branch (and the now-unused
   ambient type), same treatment as the `updateInventory` fix earlier this
   session.
2. **`employees.ts`'s `hireSelectedEmployee` alert.** Referenced
   `employeeData.skillLevel`, a field the candidate objects never actually
   carry — always printed literally "undefined" in the success alert.
   Removed it from the message. Verified via a real hire through the
   running app: alert now reads "Successfully hired Verify Person as a
   Pharmacist with a salary of $85000.00." — no "undefined".
3. **`gameInitializer.ts`'s `runFallbackInitialization` fallback objects.**
   This is the true last-resort path (used only if everything else already
   failed), and it had always constructed an incomplete `gameState` (no
   `renderInfo`) and `financesData` (only `cash`/`dailyIncome`/
   `pendingInsuranceIncome`) — meaning the very thing meant to rescue a
   broken launch would itself crash on the first animation frame
   (`gameState.renderInfo.lastFpsUpdate`) or the first finances call
   (`financesData.transactions.push`). Filled in both objects with the same
   zeroed-default shape `initializeNewGame` already uses. Verified directly
   (this path isn't reachable through normal play): wiped `window.gameState`/
   `window.financesData`, called `runFallbackInitialization()`, then drove
   one real `gameLoop` frame and one real `finances.addTransaction` call —
   neither threw, `renderInfo` and `transactions` were both present.
4. **Finances page charts (`ReferenceError: Chart is not defined`).**
   `financesPage.js` has always called `new Chart(...)`, but nothing in
   `main.html` loaded a Chart.js script — the dependency was simply never
   added. Added `chart.js` as a real `dependencies` entry (`npm install
   chart.js`, landed on v4.5.1) and a `<script
   src="node_modules/chart.js/dist/chart.umd.min.js">` tag in `main.html`
   before the page-renderer scripts. `financesPage.js` already used Chart.js
   v3+'s config syntax (`plugins.title` instead of v2's `options.title`),
   so no changes needed there. Verified in the running app: all 3 canvases
   on the Finances page now have real attached Chart instances
   (`Chart.getChart(canvas)` returns non-null for each).

Deliberately left alone: `hireEmployee`'s candidate-generation `skills`
object would be incomplete (`{}`) for an unrecognized `role` — but `role`
only ever arrives from `employeesPage.js`'s `<select>`, hard-coded to
exactly `['Pharmacist', 'Lab Technician', 'Cashier']`, so that branch isn't
reachable through the actual UI. Not "fixed" since there's no live bug to
fix, just an unused defensive gap.

Re-verified everything after all four fixes: `build:ts` clean, 8/8 Jest,
2/2 Playwright, plus the direct fallback-initialization test above and a
full manual launch (new game → Finances page → hire flow) with no new
console errors beyond the pre-existing preload.js noise.

### 2026-08-15 — TypeScript migration: seventh batch (main, employees, finances, game-bootstrap, gameInitializer) + VS Code tsdk fix

Two unrelated things in one session: a VS Code editor false-positive, and
the next migration batch.

**VS Code fix:** the editor's Problems panel showed TS2046 ("Argument for
'--module' option must be: 'commonjs', 'es6', ...") pointing at
`tsconfig.json`'s `module: "none"` — but `npx tsc -p .` (the actual pinned
5.9.3 from `node_modules`) compiled clean, as it has all along. VS Code's
built-in TypeScript language service was using its own bundled TS version
instead of the workspace's pinned one, and that bundled version doesn't
support `module: "none"` (this is exactly the TS7-drops-`module:"none"`
situation `docs/revision.md` already documented as the reason for pinning
to 5.9.x — the editor just wasn't honoring the pin). Fixed with
`.vscode/settings.json` (`typescript.tsdk`), not by changing `tsconfig.json`
— changing the actual build config would have broken the real, working
architecture to satisfy a phantom editor warning.

**Migration batch:** converted `main/js/main.js`, `main/js/data/employees.js`,
`main/js/data/finances.js`, `main/js/game-bootstrap.js`, and
`main/js/gameInitializer.js` — the largest batch so far by line count
(~2,050 lines combined). Chosen together because they're the last thing
blocking `main/js/data/`'s completion (`employees.js`/`finances.js` were
both waiting on `window.gameState` from `main.js`) plus the bootstrap
sequence that constructs `gameState`/`financesData` in the first place
(`gameInitializer.js`) and drives it (`game-bootstrap.js`). `GameState` and
`FinancesData` are now their real, full shapes (`main.js` and `finances.js`
respectively own them) instead of the small partials earlier batches had
been extending.

Notable typing decisions:
- `GameState`'s `simulationAccumulator`/`lastFrameTime`/`lastSimulationTime`/
  `renderInfo`/`dateCreated` are genuinely optional — three different call
  sites construct `window.gameState` (main.js's own fallback,
  `initializeNewGame`, and `runFallbackInitialization`) and each sets a
  different subset. `main.js`'s own `gameLoop` already defensively checks
  `if (!window.gameState.lastFrameTime)`, confirming this isn't accidental.
  `runFallbackInitialization`'s `renderInfo`-less path means `main.ts`'s
  `window.gameState.renderInfo!.lastFpsUpdate = timestamp` would still throw
  if that specific fallback-of-a-fallback ever ran — a pre-existing latent
  bug, preserved via non-null assertion rather than "fixed" with a new
  guard, matching this migration's standing rule of not changing behavior
  it didn't set out to change.
- Same rule applied to `runFallbackInitialization`'s finances fallback,
  which only ever set 3 of `FinancesData`'s now-many required fields —
  rather than fabricating the other fields with zero defaults (a real
  behavior change), cast the incomplete literal to `FinancesData` so it
  keeps leaving the rest `undefined` at runtime exactly like the original.
- `showPage`/`ui`/`renderTopBar`/`renderSidebar`/`taskManager` (made
  required in earlier batches) are joined by `displayEmployeeCandidates`,
  `initializeNewGame`, `loadSavedGame`, `runFallbackInitialization`,
  `bootstrapGame`, `gameLoop`, `isGameInitialized` — all called
  unconditionally by at least one converted file despite their owner
  (`employeesPage.js`, or one of this batch's own files) sometimes still
  being guarded elsewhere with a defensive `typeof` check.
- Found and preserved (not fixed) two more "silently does nothing" spots,
  folded into Known Issues above: `main.js`'s `updateCountdownTimers` guard
  never passes (nothing ever defines that global), and
  `hireSelectedEmployee`'s success alert references a `skillLevel` field
  that candidate objects never actually have.
- **Corrected a stale Known Issues entry** while actually converting
  `gameInitializer.js`: it previously said `window.runFallbackInitialization`
  was dead code. It isn't — `gameInitializer.js` defines it for real and
  `main.html` calls it. The earlier audit had confused it with an unrelated,
  genuinely-dead same-named local function inside `fallback.js`.
- `finances.ts`'s `addTransaction` sort switched from `b.date - a.date` to
  `b.date.getTime() - a.date.getTime()` — identical result, just spelled
  out since TS doesn't do arithmetic directly on two `Date` objects.

Verified the same way as prior batches, scaled to this batch's size:
`build:ts` clean, 8/8 Jest, 2/2 Playwright (including the save/load
round-trip test, which directly exercises `gameInitializer.ts`'s load path),
a scripted old-vs-new comparison (`employees.calculateEmployeeEfficiency`/
`calculateTaskCompletionTime`/mood transitions across the full morale range,
`hireEmployee`'s candidate generation and cash deduction,
`finances.addTransaction`'s sort order and id uniqueness, `addIncome`/
`addExpense` including the unknown-category fallback path, `updateProfitMetrics`,
two chart-data functions — all byte-identical old vs. new). Also a real
Electron launch driving the actual new-game form with non-default options
(hard difficulty + urban location): confirmed the resulting cash
($100,000 × 0.7 hard modifier = $70,000) and overhead ($650 hard base ×
1.3 urban = $845) matched the expected math exactly, reputation applied the
hard-difficulty starting value, `dateCreated` was set; let the real game
loop run for 3 real seconds and confirmed `gameState.currentDate` advanced
and `lastFrameTime` got set; hired a Cashier through the real
`employees.hireEmployee` → `displayEmployeeCandidates` pipeline and
confirmed 5 candidates generated with correct role/salary and the $500
hiring fee deducted; visited the Employees and Finances pages and confirmed
no *new* console errors (only the pre-existing preload.js noise, plus the
pre-existing-but-newly-noticed Chart.js one documented above, from
unrelated still-plain-JS page files).

`main/js/data/` is now **fully converted**. 24 of 47 files converted so far
(23 remaining).

### 2026-08-15 — Dead-code cleanup: production.ts's unreachable updateInventory check

Follow-up to the sixth migration batch below. That batch's conversion of
`production.js` had to decide what to do with a `typeof
window.ui.updateInventory === 'function'` check in `refreshInventoryUI`'s
UI-refresh fallback chain — ui.ts's real `UiApi` type (see `global.d.ts`)
has never had an `updateInventory` method, so the branch could never fire.
At the time, kept it alive via a local untyped cast rather than changing
behavior mid-migration. Asked to fix it directly afterward: removed the
dead branch outright (production.ts's `refreshInventoryUI` now falls
through to the `updateInventoryDisplay`/`renderInventoryPage` checks
instead). Deleting code that could never execute isn't a behavior change,
so no new verification beyond a clean `build:ts`, 8/8 Jest, 2/2 Playwright.

### 2026-08-15 — TypeScript migration: sixth batch (production, prescriptions)

User asked for just 2 files this round (batches are otherwise fixed at 5).
Converted `main/js/production.js` and `main/js/prescriptions.js` together —
they read each other (`prescriptions.generatePrescription` calls
`production.canCompound`; `production.handleTaskCompletion` calls
`prescriptions.getPrescription`/`createFillTaskForPrescription`), the same
mutual-dependency shape as the previous batch's ui.ts/customers.ts pair.
`prescriptions.js` converting makes `PrescriptionsApi` the real, full type
(upgrading customers.ts's earlier partial placeholder), and removes the
second of the three things that were blocking `employees.js`/`finances.js`
from converting (only `window.gameState` from `main.js` remains).

One dead-code compile hazard surfaced and deliberately preserved rather than
fixed: `production.js`'s `refreshInventoryUI` fallback chain checks
`typeof window.ui.updateInventory === 'function'`, but ui.ts's real `UiApi`
has never actually exposed an `updateInventory` method — this branch has
always been unreachable at runtime. Kept the exact behavior via a local
untyped cast rather than removing the dead branch (out of scope for a
migration pass; folded into Known Issues below). Also preserved two
implicit-`NaN`-on-missing-field behaviors in `handleTaskCompletion`
(`task.quantityToMake`/`quantityNeeded`) via non-null assertions rather than
defaulting to `0`, matching the "don't silently change fallback behavior"
precedent from earlier batches (helpers.ts's `NaN` initialization).

Verified the same way as the previous batch: `build:ts` clean, 8/8 Jest,
2/2 Playwright, a scripted old-vs-new comparison (`canCompound`,
`createCompoundTask`, `handleTaskCompletion` for both compound and
fillPrescription task types, `createFillTaskForPrescription`,
`getRandomFrequency`'s weighting boundaries, `updatePrescriptionStatus`,
`removePrescriptionsByCustomer` — all byte-identical old vs. new), and a
real Electron launch driving the actual cross-module pipeline: generated 4
customers through `window.customers.generateCustomer()`, confirmed each one
correctly produced a prescription plus the right task chain (compound →
dependent fillPrescription → customerInteraction check-in), let the game
run for a few seconds and confirmed tasks picked up progress via the real
`taskManager`/`taskAssignment` (still plain JS), and checked the Inventory
page renders without error. No new console errors — only the pre-existing,
already-documented preload.js noise.

19 of 47 files converted so far (28 remaining).

### 2026-08-15 — TypeScript migration: fifth batch (sideBar, topBar, taskbars, ui, customers)

Continued the migration, per the fourth batch's "fixed at 5 files" standing
instruction. Moved out of `main/js/data/` into the UI/engine layer: converted
`main/components/sideBar.js`, `main/components/topBar.js`,
`main/js/taskbars.js`, `main/js/ui.js`, and `main/js/customers.js` — chosen in
that order (near-leaf UI components first, then `ui.js` as the UI-layer
analog of `helpers.ts` — touches nearly everything — then `customers.js` as
the batch's real unlock, since it was one of three things blocking
`employees.js`/`finances.js` from converting).

Notable decisions, all verified behavior-preserving:
- `NotificationItem` (not `Notification`) for topBar.ts's notification-panel
  type — `Notification` is already lib.dom's browser Notification API;
  naming it that silently declaration-merges instead of erroring, and did
  produce a real compile error before the rename.
- Two `textContent = someNumber` assignments (sideBar.ts's reputation
  display, topBar.ts's unread-count badge) needed `String(...)` — strict DOM
  typings require `textContent` to be a string, where the original relied on
  implicit coercion. `String(n)` produces the identical string either way.
- ui.ts's `domCache.lastValues.lastCustomerStatus` was never in the
  original's initial object literal (JS silently added it as a dynamic
  property on first write); strict mode requires it declared up front, so
  it's initialized to `null` — confirmed this can't be observed as a
  behavior change, since the first `updateCustomersList()` call always
  short-circuits past the code path that would read it.
- customers.ts's `if (customer.timer)` became `if (customer.timer !== null)`
  — `timer` only ever holds `null` or a live interval handle, so the checks
  are equivalent; strict mode just wants the explicit form.
- `window.showPage`/`renderTopBar`/`renderSidebar`/`ui`/`taskManager` were
  promoted from debug.ts's earlier loose/optional placeholders to required,
  correctly-shaped ambient types, since this batch's files call them
  unconditionally (no `typeof` guard) even though their owning files
  (`main.js`, `ui.js` itself) either haven't converted yet or just did.
  debug.ts's `typeof window.x !== 'undefined'` checks still compile fine
  against a required type.
- `customers.ts` makes `CustomersApi`/`Customer` the real, full types,
  upgrading insuranceClaims.ts's earlier partial placeholder. It also
  introduced partial `Task`/`TaskManagerApi`/`TaskAssignmentApi`/
  `PrescriptionsApi` for the three still-plain-JS modules it drives
  (`taskManager.js`, `taskAssignment.js`, `prescriptions.js`); `Task` uses a
  `[key: string]: unknown` index signature since different not-yet-converted
  task-creator files each attach different extra fields.

Verified more thoroughly than prior batches given the size: `build:ts`
clean, 8/8 Jest, 2/2 Playwright, plus a scripted before/after behavioral
comparison (`vm`-sandboxed old-vs-new, one script per logic-bearing
function) covering `ui.formatDate/formatTime/formatDateTime`,
`taskbars.createProgressBar` (percent/time-remaining/tooltip math),
`customers.adjustPatienceDecayRate` across all state/type combinations,
`customers.getRandomCustomerType`'s weighting boundaries, and full
`sideBar.renderSidebar()`/`topBar.renderTopBar()` DOM output including their
update functions — all byte-identical old vs. new. Also manually launched
the real Electron app via a Playwright driver script (reusing
`test/e2e/newGame.spec.js`'s launch pattern): started a new game; confirmed
the sidebar renders all 12 nav items plus Main Menu and its confirm-dialog
click path works; confirmed the top bar shows cash/income/pending-insurance/
time/username and the notifications bell opens/closes the panel; navigated
to Operations, spawned a real customer via `window.customers.generateCustomer()`,
and confirmed it renders correctly in the customer list; confirmed a task's
progress bar renders the correct tooltip/percent/time-remaining and advances
smoothly frame-to-frame (31% → 51% over 2 real seconds). No new console
errors — only the pre-existing, already-documented preload.js "path module
not available" noise.

17 of 47 files converted so far (30 remaining). `main/js/data/` is fully
converted except `employees.js`/`finances.js`; converting `customers.js`
this batch removes one of the three things blocking those two
(`window.gameState` from `main.js` and `prescriptions.js` still remain).

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

### 2026-08-15 — TypeScript migration: third batch (products, research, equipment, helpers)

Continued the migration. Converted `products.js`, `research.js`, `equipment.js`,
and `helpers.js` — the rest of `main/js/data/`'s leaf-ish files, chosen in
that order so each subsequent file's ambient dependencies were already
covered by the one before it (`products.js` needs `materialsData`;
`equipment.js` needs `researchData`, so `research.js` went first;
`helpers.js` needs bits of nearly everything, so it went last).

Two deliberate, behavior-preserving changes were needed to satisfy `strict`
mode, both verified to produce byte-identical output to the original:
- `helpers.ts`'s `calculateStartingWage` now explicitly initializes
  `minWage`/`maxWage` to `NaN` instead of leaving them implicitly
  `undefined` — TS's strict definite-assignment check would otherwise
  reject the "no role/skill level matched" fall-through path. Confirmed via
  a scripted side-by-side call with an unrecognized role: both old and new
  versions return the same `60000` fallback the same way (through the
  original's `NaN || 60000` trick, which still works — `NaN` is still
  falsy either way).
- `helpers.ts`'s `orderMaterialsForProduct` uses a non-null assertion on
  `document.querySelector('.inventory-page-container')` rather than adding
  a new null guard — preserves the original's behavior of throwing if
  called from any page other than Inventory (confirmed by triggering it
  from the Equipment page in the running app: throws identically in both
  old and new).
- `equipment.ts`'s 22 `isUnlocked: function() {...}` items became
  shorthand method syntax (`isUnlocked() {...}`) so TS could correctly
  infer `this` — no behavior change (regular method call semantics are
  identical either way), confirmed by calling `isUnlocked()` on every item
  before and after.

Verified more thoroughly than prior batches given the increased complexity:
`build:ts` clean, 8/8 Jest, 2/2 Playwright, plus four separate scripted
before/after comparisons (one per file) exercising the actual functions —
not just diffing static data — including `researchNextLevel()`'s side
effects (level-up + cash deduction) and `orderMaterialsForProduct()`'s
(cash deduction + transaction record). Manually launched the app and
visually confirmed the Research and Equipment pages render correctly and
that ordering materials from the Inventory page still works.

`main/js/data/` is now fully TypeScript except `employees.js` and
`finances.js`, both deferred — they pull in several still-untyped modules
outside `data/` (`main.js`'s `gameState`, `customers.js`, `prescriptions.js`,
`insuranceClaims.js`) and are high-traffic enough to warrant converting
their dependencies first. 7 of 47 files converted so far.

### 2026-08-15 — TypeScript migration: fourth batch (brandReputation, panel, modal, debug, insuranceClaims)

User asked to standardize future batches at 5 files each going forward.
Before picking files, checked which of the remaining 40 were actually
*loaded* — found 8 previously-undocumented dead files (`data.js`,
`dataInitialization.js`, `events.js`, `fallback.js`, `inventory.js`,
`ipcRenderer.js`, `ipcTypes.js`, `orders.js`), none referenced by any
`<script>` tag or `require`/`import`. Folded into "Known issues" above
rather than converting them — typing unreachable code can't be verified
against the running app and has no payoff. Also surfaced a new
silently-does-nothing bug in the process: `gameInitializer.js` calls
`window.runFallbackInitialization`, which only ever existed in the now-
confirmed-dead `fallback.js`.

Converted the 5 next leaf-most *live* files: `brandReputation.js`,
`main/components/panel.js`, `main/modals/modal.js`, `main/js/debug.js`, and
`main/js/insuranceClaims.js`. The last introduced the batch's only real
ambient-typing decisions: added `InsuranceClaim`/`InsuranceClaimsApi`/
`ClaimStats` types, a partial `CustomersApi` (customers.js is still plain
JS), extended `TransactionInput` with optional `customerId`/`prescriptionId`,
and narrowed `GameState.currentDate` from `string | Date` to `Date` — this
file calls `.getTime()` on it directly with no `new Date(...)` wrapper,
which needed the narrower type to compile; confirmed both that this matches
the actual runtime invariant (dates are revived before gameplay logic runs)
and that `new Date(aDateValue)` — helpers.ts's usage pattern — still
compiles fine against `Date`.

Verified the same way as prior batches: `build:ts` clean, 8/8 Jest, 2/2
Playwright, plus a scripted before/after behavioral comparison for all 5
files (using Jest's jsdom environment for the two DOM-touching ones,
panel.ts and modal.ts, after an early version of the comparison script hit
a `global.window` reassignment gotcha in that environment — jsdom's
`window`/`global` share identity, so replacing `global.window` wholesale
doesn't do what it looks like it does; setting properties directly on the
existing `window` object instead fixed it). Manually launched the app and
confirmed: the debug toggle tab renders correctly (from the 2026-08-15
"Save/load fixed" session's fix, now typed), `brandReputation`'s
`calcCustomers`/`gainReputation` work, the daily summary modal renders with
correct values, and `insuranceClaims`' API surface is live and callable —
no console errors.

12 of 47 files converted so far (39, once the 8 newly-found dead files are
excluded from the denominator — see `docs/revision.md` for the running
list). Going forward, batches are fixed at 5 files unless told otherwise.

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

Important Note: For the remainder of the transition from JS to TS:
1. Complete all remaining files in the next pass.
2. Test
3. We can then cleanup the files, notes, etc and prepare for development within the new structure.