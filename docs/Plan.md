# Plan: Phases 9–12 — Store controls, staff automation, equipment lifecycle, scheduling

Status: agreed design, not started. Decisions were confirmed on 2026-10-23.
Each phase ships on its own: it is playable, tested and saved in its own save
version before the next one starts.

## Phases

| Phase | Theme                         | Items                                                             | Save |
| ----- | ----------------------------- | ----------------------------------------------------------------- | ---- |
| 9     | Store controls and staff rules | #1 Starting cash · #3 Role limits · #7 Overtime and Send home · #8 Open / close the store | v9   |
| 10    | Supply chain                  | #2 Order lead times · Role table · #4 Purchasing Agent            | v10  |
| 11    | Equipment lifecycle           | Per-unit equipment · #5 Contractor repairs · #6 Aging and the Equipment Technician | v11  |
| 12    | Scheduling                    | #9 Shifts, days off and the scheduler                             | v12  |

Item numbers (#1–#9) stay the same across revisions of this plan, so they can
be referenced in commits.

Automation is no longer a global switch. It lives in employees with specific
automation roles: the Purchasing Agent buys and the Equipment Technician
maintains. Without them, the player does the work by hand.

## Current behaviour that shapes the plan

- **Fallback assignment.** [taskAssignment.ts](../main/js/taskAssignment.ts) `findBestEmployeeForTask`
  gives any task except a restock to "any free employee" when nobody in the
  preferred role is free. That is how cashiers end up consulting, filling
  and compounding.
- **Role whitelist.** `normalizeEmployeeRoles` turns every role other than
  Pharmacist, Lab Technician and Cashier into Cashier on every assign pass.
  New roles must be added there first.
- **Lead time is unused.** Every material has `leadTime: 1`, but auto-orders
  (`timeEvents.autoOrderCheck`) and the Marketplace add stock immediately.
- **Clock jobs are not saved.** [clock.ts](../main/js/clock.ts) jobs live only in memory, so
  deliveries and contractor visits must be saved data with an arrival time,
  checked by the game loop, not `clock.after` callbacks.
- **Equipment is aggregated.** An item has `owned: n` and a single shared
  `durability`. Per-unit aging needs per-unit records.
- **Overtime today.** Pay is 1.5× past 8 hours a day ([finances.ts](../main/js/data/finances.ts)
  `OVERTIME_AFTER_HOURS`), and morale drops past 8 hours (`REST_HOURS`). Only
  time on a task counts as worked (`minutesWorkedToday`, in taskManager). No
  weekly total exists. Finances roll the week over on Sunday.
- **Wages are a flat daily amount** (salary × payroll load / 365), whatever
  hours are worked. Only overtime depends on hours.
- **The game day.** It runs 07:00–22:00, seven days a week, and the clock
  doesn't run overnight (`skipToNextDay` jumps to 07:00). `endOfDay` sends
  remaining customers home (reason `closing`), then charges wages and
  overhead, updates morale, records the day, checks goals and the bank, and
  shows the daily summary.

---

# Phase 9 — Store controls and staff rules

## #1 Fixed $50,000 starting cash

- Remove the Starting Capital select from [index.html](../index.html) and `startingCapital`
  from the form data.
- [gameInitializer.ts](../main/js/gameInitializer.ts): replace the low/medium/high branch with
  `const STARTING_CASH = 50000`.
- Remove `startingCapital` from `NewGameOptions` ([global.d.ts](../main/js/types/global.d.ts)), both
  default option objects in [game-bootstrap.ts](../main/js/game-bootstrap.ts), and
  [game-integration.js](../game-integration.js) if it passes it on.
- Update `test/e2e/newGame.spec.js` and any unit tests using `startingCapital`.
- Saves are unaffected.

## #3 Realistic role limits

There is no "anyone free" fallback for clinical or lab work. This follows US
practice: counselling is a pharmacist's job, technicians fill and compound
under a pharmacist, and front-desk clerks do neither.

| Task                          | Who (in order of preference)                    |
| ----------------------------- | ----------------------------------------------- |
| Check-in / checkout           | Cashier, then anyone free (everyone can ring up) |
| Consultation                  | Pharmacist only                                 |
| Fill prescription             | Lab Technician, then Pharmacist                 |
| Customer compound             | Lab Technician, then Pharmacist                 |
| Restock compound              | Lab Technician only (unchanged)                 |
| Place order (Phase 10)        | Purchasing Agent only                           |
| Maintain equipment (Phase 11) | Equipment Technician only                       |

The automation roles do no customer work.

- With no pharmacist on staff, consultations wait and customer patience
  takes over. Add a warning on the Employees page and the Dashboard ("No
  pharmacist on staff: customers can't get consultations") so this doesn't
  look like a bug. Do the same for "no one can fill or compound" when there
  is no Lab Technician or Pharmacist.
- Future idea, not planned: a pharmacist verification step on each fill.

## #7 Overtime, "Send home" and "Don't allow overtime"

### The rule (decided)

An hour is overtime if it's past **8 hours in a day** (as today), or past
**40 hours in the week** (new). The week runs Sunday to Saturday, matching
the finances week. Pay and morale both follow this one rule.

### Tracking

- Add to employees:
  - `minutesWorkedThisWeek`, which resets at the Sunday rollover alongside
    `finances.startNewWeek`
  - `straightMinutesThisWeek`: minutes this week that weren't daily overtime
- Both increase next to `minutesWorkedToday` in taskManager.

### Overtime hours for the day

No hour is counted twice:

```
dailyOT   = max(0, today − 8)
straight  = today − dailyOT                     (at most 8)
weeklyOT  = max(0, straightBefore + straight − 40) − max(0, straightBefore − 40)
overtime  = dailyOT + weeklyOT
```

`straightBefore` is the week's straight hours before today. For example, an
employee with 38 straight hours this week who then works 9 hours today has
1 hour of daily overtime and 6 of weekly overtime: 7 in total.

### Pay and morale

- **Pay:** `finances.overtimeHours` / `overtimePay` use the combined figure,
  still at `OVERTIME_RATE` (1.5×) and paid at closing. Update the Employees
  page help text and the README ("overtime at 1.5x past 8 hours a day or 40
  a week").
- **Morale:** `employees.endOfDay` charges `OVERWORK_LOSS_PER_HOUR` for each
  overtime hour (daily and weekly). The rested gain applies only on a day
  with no overtime.
- **Balance note:** until Phase 12 adds days off, staff work 7 days a week,
  so a busy employee reaches 40 hours around Friday. Wage costs and morale
  pressure rise in Phase 9. "Don't allow overtime" and Send home are the
  player's tools until schedules exist. Check the effect in the Phase 9
  balance pass.

### In overtime (indicator)

- An employee is in overtime while today > 8 hours or the week's straight
  hours > 40.
- An "Approaching overtime" warning shows from 7 hours today or 36 hours in
  the week.
- A notification fires the first time each day someone enters overtime,
  unless they're sent home automatically.

### Employees page

- An **Overtime** pill on the row.
- The hours column shows "7.5h today · 38.0h week", warn-coloured when
  approaching and critical in overtime.
- A **Send home** button on every working employee, highlighted in overtime.
- A **Don't allow overtime** toggle per employee, in their row or details
  menu. It is saved with the employee as `noOvertime`.

### Operations page

- An Overtime pill in the Staff table, with the same Send home button.
- The "Idle staff" tile excludes people sent home, and a "Sent home" count
  is added.

### Send home

- Sets `employee.offUntilDay = dayIndex + 1`. They are skipped by
  auto-assignment until the next opening.
- Their current task goes back in the queue with its progress, as
  `employees.removeEmployee` does today. A compound keeps its materials and
  a fill keeps its stock.
- A **Call back** button undoes it the same day.
- They're shown as "Sent home" on both pages.
- They are paid their normal day. Wages are a flat daily amount; sending
  them home only stops further overtime pay and morale loss.

### Don't allow overtime (automatic send home)

- When an employee with `noOvertime` reaches 8 hours today or 40 straight
  hours this week:
  - they get no new tasks (auto-assignment skips them from then on)
  - they finish the task they're on
  - when it completes, they're sent home as above
- Every minute past the limit while they finish counts as overtime, paid and
  charged to morale under the normal rule. The toggle limits overtime to the
  end of one task; it doesn't prevent it.
- While finishing, they show as "Finishing up, then going home" on the
  Employees and Operations pages.
- A quiet notification when they leave: "Sam Lee went home at their
  overtime limit (0.4h overtime)."
- An employee already idle at the limit goes home at once.
- On a busy day this can leave customer tasks without staff, which is the
  player's trade-off to make.

## #8 Open / close the store

The player gets two controls: close the front (staff keep working), or close
for the day (end the day now).

Decisions:

- When the front closes, customers already inside are served as normal.
- Closing during business hours costs no reputation. The only cost is the
  missed sales.
- The store reopens every morning at 07:00.
- Ending the day early pauses work overnight, the same as the 22:00 closing.

### Close the front / Open the front

- New saved flag `gameState.frontOpen` (default `true`), reset to `true` in
  `skipToNextDay`.
- While the front is closed:
  - `spawnCustomersForHour` brings in no one, returning refill customers
    included.
  - Closing calls `cancelPendingArrivals`, so the rest of this hour's batch
    doesn't walk in.
  - Customers already inside carry on through check-in, consultation, fill
    and checkout.
  - Staff keep working the queue: restocks, compounds, and from later phases
    orders and maintenance.
  - Hourly checks run as normal: restocks, auto-order, and from Phase 10
    deliveries.
- Reopening takes effect from the next hourly batch of customers.
- Wages and overhead are the normal flat daily charge. Overtime counts only
  the hours staff actually work.

### Close for the day (end the day now)

- Ends the day straight away: sets `isDayActive = false` and runs
  `timeEvents.endOfDay` (wages, overhead, morale, records, goals, the bank,
  the daily summary), then `skipToNextDay`. This is the same path as the 22:00
  check in [main.ts](../main/js/main.ts), including the `lastEndedDayIndex`
  guard against charging twice.
- In-progress tasks keep their progress and resume at the next opening, as
  they do after 22:00 today.
- From Phase 10, deliveries and contractor visits due later that day arrive
  at the next opening, because of the overnight jump.
- A confirmation dialog lists what's still going: customers inside, tasks in
  progress, and deliveries due today.
  - Customers still inside leave unserved through the existing
    `sendRemainingCustomersHome`, with the usual closing-time reputation
    penalty.
  - The dialog says how many will leave and suggests "Close the front first
    and let the line clear".

### UI

- Top bar, next to the clock and speed controls:
  - a status pill: **Open**, **Front closed** or **Closed**
  - a **Close front** / **Open front** toggle
  - an **End day** button, which opens the confirmation dialog
- Operations page: a "Front closed" banner above the Customers card while it
  applies.
- The daily summary and the day's record note "Front closed from 15:30" or
  "Closed early at 18:00", so Statistics can tell short days from slow ones
  (`records.recordDay` gains `frontClosedAt` and `closedEarlyAt`).

## Phase 9 save (v8 → v9)

- `gameState.frontOpen` (`true`)
- On employees:
  - `minutesWorkedThisWeek` and `straightMinutesThisWeek`. Migration: 0, so
    a save loaded mid-week under-counts that week once, which is acceptable.
  - `offUntilDay` (unset)
  - `noOvertime` (`false`)

## Phase 9 tests

- Assignment eligibility table, and that cashiers never consult, fill or
  compound (#3)
- Overtime formula: daily, weekly, and the no-double-count example above;
  week reset on Sunday (#7)
- Overtime pay and morale using the combined hours (#7)
- Send home and Call back: task released with progress kept; not assigned
  until the next day (#7)
- Don't allow overtime (#7):
  - no new tasks once at 8h / 40h
  - the current task finishes, then they're sent home
  - the minutes past the limit are paid as overtime
- Front closed: no arrivals, customers inside still served, reopens in the
  morning (#8)
- End day: settles exactly once and keeps task progress (#8)
- v8 → v9 migration
- e2e: new game without a capital choice (#1)

Balance pass: weekly overtime cost against the $50k start, with and without
"Don't allow overtime".

---

# Phase 10 — Supply chain

## #2 Order lead times (deliveries)

### Data

- New saved queue `gameState.deliveries: Delivery[]`:
  `{ id, kind: 'material' | 'equipment', itemId, quantity, cost, orderedAt, arrivesAt }`.
  Times are game-time numbers, so `reviveDates` needs no change.
- Payment is taken when the order is placed (`finances.transact`,
  `requireFunds`), so a delivery can never push cash negative later.
- A per-minute check delivers everything with `arrivesAt <= now`: it adds
  stock or units, sends a notification and calls `requestAutoAssign`.
- Overnight: anything due after closing, or after an early End day,
  arrives at the 07:00 opening, because the clock jumps.

### Lead times (starting values, to tune)

| Item                          | Lead time                          |
| ----------------------------- | ---------------------------------- |
| Excipients (`ing###`)         | 4 game hours                       |
| Active ingredients (`mat###`) | 6–8 game hours                     |
| Equipment                     | 1 day (next opening + a few hours) |

### Rules

- Auto-ordering counts stock on order: it orders when
  inventory + in transit < reorder point.
- Rebalance the material defaults (start 2,000 / reorder below 500 / order
  1,000), which were tuned for instant delivery. The reorder point has to
  cover usage during the lead time. Measure hourly use in a test run, then
  probably raise it to about 800.

### UI

- Marketplace: a Lead time column, and an "On the way" card listing open
  deliveries with ETAs.
- Inventory: an On order column for materials.
- Equipment: units on order show as "arriving ~09:00".

## Role table and new skills (groundwork for Phases 10 and 11)

- Replace the if/else skill and wage ladders in `employees.hireEmployee` and
  `helpers.calculateStartingWage` with one `ROLES` table. Each role holds its
  skills by level (Novice / Intermediate / Skilled), wage ranges, key skill,
  `ROLE_PAY` line, main task (for the Employees page Speed column) and
  description.
- Add `negotiation` and `maintenance` to `EmployeeSkills`. Both are added
  now, so Phase 11 needs no skill migration.
- Update `normalizeEmployeeRoles`, `keySkill`, `fairSalary`, the Employees
  page role select, help text and `MAIN_TASK`.
- `employees.taskSkill`: `placeOrder` uses negotiation and `maintain` uses
  maintenance.

Starting wages, from BLS-style figures (check these against current data
when implementing):

| Role                 | Novice  | Intermediate | Skilled |
| -------------------- | ------- | ------------ | ------- |
| Purchasing Agent     | $50–62k | $62–75k      | $75–95k |
| Equipment Technician | $42–52k | $52–64k      | $64–80k |

The Equipment Technician role is defined here but can't be hired until
Phase 11.

## #4 Purchasing Agent

### Behaviour

- With no Purchasing Agent working, nothing is bought automatically: neither
  materials nor equipment. The player orders by hand from the Marketplace and
  Equipment pages. An agent who has been sent home, or is off shift after
  Phase 12, doesn't order either.
- With an agent working, each hourly check gathers every material and piece
  of equipment below its reorder point, net of what's on order, into a
  `placeOrder` task for the agent. The task takes about 15–20 game minutes,
  faster with skill and morale through `workRate`. When it finishes, the
  orders are placed as deliveries (#2).
- Because ordering is a task, it counts toward the agent's hours, overtime
  and morale like anyone else's.

### Negotiation discount

- While an agent is on staff, every material and equipment order gets their
  discount, including the player's manual orders ("they place it for you").
  This is applied in `calculateMaterialCost` and the equipment order total.
- Curve: 0% at negotiation 40, rising in a straight line to 5% at 90 and
  above. It stacks with bulk discounts (at most 5%), for at most about 10%
  off.
- With several agents, the best negotiator's discount applies. Extra agents
  only spread the ordering work.
- The discount is shown on the order bar and in the ledger description
  ("incl. 3.2% negotiated").

### Marketplace "Purchasing" section

Shown when an agent is on staff. Otherwise a short card reads "Hire a
Purchasing Agent to automate ordering". The settings move here from Inventory
and Equipment, which keep read-only status pills.

- Per material: reorder point, reorder amount, on/off.
- Per equipment item: keep at least N units, plus buy amount (from the
  Equipment page).
- Cash floor: the agent won't place an order that leaves cash below $X.
- Daily spending cap: the agent stops ordering for the day after $Y.
- "Suggest" button (nice to have): sets a reorder point from the last few
  days' usage × lead time × a safety margin.
- Settings are kept, and saved, even with no agent. They just don't run.

## Phase 10 save (v9 → v10)

- `gameState.deliveries` (empty)
- `purchasingSettings` (cash floor and spending cap defaults)
- `negotiation` and `maintenance` on existing employees: low values (10–30
  by role)

## Phase 10 tests

- Delivery arrival, including across the overnight jump and an early End day
- Auto-order counting stock on order
- No auto-ordering without a working agent
- Discount curve, and that it applies to manual orders while an agent is on
  staff
- Cash floor and spending cap
- Role table: the existing roles generate the same skill and wage ranges as
  before
- v9 → v10 migration

Balance pass: reorder points against lead times; agent wage against the
discount it earns at typical order volumes.

---

# Phase 11 — Equipment lifecycle

## Per-unit equipment (refactor)

- `EquipmentItem` gains `units: EquipmentUnit[]`:
  `{ id, boughtOnDay, condition, maxCondition, repairs }`. `owned` becomes
  `units.length` (a getter or a derived helper). `capacity` stays per unit.
- A compound uses one free working unit, preferring the best condition. It
  wears that unit and is slowed by that unit's condition.
- Equipment deliveries (Phase 10) add new units.

## #5 Contractor repairs

- The Equipment page's Repair button becomes **Book contractor**, per unit:
  - cost = call-out fee (~$750) + ~60% of the item's price × wear (against
    25% today)
  - paid when booked
  - arrives after 6–12 game hours, often the next morning
- New saved queue `gameState.repairs: { id, equipmentId, unitId, cost, bookedAt, arrivesAt }[]`,
  using the same per-minute arrival check as deliveries. One booking per
  unit at a time.
- While waiting, the unit keeps working, and wearing, unless it's broken. On
  arrival it is restored to its current maximum condition, and its repair
  count goes up.
- The row shows "Contractor arrives ~09:00" in place of the button.
- Reword the broken and worn notifications in [production.ts](../main/js/production.ts)
  ("repair it on the Equipment page") to cover the contractor and the
  technician.

## #6 Aging, selling and the Equipment Technician

### Aging

- **maxCondition**: a repair can only restore a unit up to this, and it
  falls over the unit's life:
  `maxCondition = 100 − ageDays × AGE_LOSS − repairs × REPAIR_LOSS`, floored
  at about 20. Starting values: `AGE_LOSS = 0.25` (about −22 after 90 days)
  and `REPAIR_LOSS = 4`.
- **Breakdowns are chance-based**, not only at 0%. After each compound, a
  unit has a chance to break that is 0 above 80% condition and rises to
  about 5% per compound at 20%. An old unit whose maximum is 60% sits in the
  risky band even right after a repair.
- A broken unit is out of service until it's repaired.

### Selling

- New on the Equipment page. Resale = price × 50% × maxCondition / 100,
  halved if the unit is broken.
- A "Replace soon" hint appears when maxCondition < 50, with the numbers
  (expected breakdowns, resale value against a new unit's price) so the
  decision is clear.

### Equipment page

One summary row per item type (units, in use, average and worst condition),
expandable to its units (age, condition / max, repairs, Book contractor,
Sell).

### Equipment Technician

- When a working unit falls below the maintenance point, the technician gets
  a `maintain` task. The maintenance point defaults to 75%, is set on the
  Equipment page, and is shown when a technician is on staff.
  - The task takes 30–60 game minutes, faster with maintenance skill.
  - It restores condition by +25 to +50 by skill, never above maxCondition.
  - Parts cost about 5% of a contractor's price.
  - The unit is out of service during the work. `production.inUse` counts
    maintenance tasks, so a unit that's in use is maintained when it's free.
- **Broken units**: the technician can repair them, as a longer task (2–4
  game hours) with parts cost of about 15% of a contractor's. The contractor
  stays the fast, expensive option. Technician repairs also count toward
  `repairs` and lower maxCondition.
- Broken units come first, then the lowest condition.
- A technician who has been sent home, or is off shift after Phase 12, does
  no maintenance.

## Phase 11 save (v10 → v11)

- Equipment: each saved item's `owned` + `durability` becomes that many
  units, each with `condition = durability`, `maxCondition = 100`,
  `boughtOnDay = current day` and `repairs = 0`.
- `gameState.repairs` (empty)
- Maintenance point setting (75)

## Phase 11 tests

- Unit selection, wear and speed per unit
- Aging and maxCondition; breakdown odds with seeded randomness
- Resale value
- Contractor booking, arrival and the one-booking limit
- Technician maintenance and broken-unit repair; units out of service while
  worked on
- v10 → v11 migration

Balance pass: repair and resale prices, the breakdown curve, and the point
at which replacing beats repairing (aim for roughly 4–6 game months for a
heavily used unit).

---

# Phase 12 — Scheduling

## #9 Shifts, days off and the scheduler

This is an outline. The detailed design is done at the start of Phase 12,
after Phases 9–11 have been played.

### Scope

- **Weekly schedule per employee**: the days they work, and a shift
  (start–end) within 07:00–22:00 on each.
- **Shift templates**: Opening (07:00–15:00), Closing (14:00–22:00), Mid,
  and custom. Also "Copy last week".
- **Assignment respects schedules**: off-shift and day-off employees get no
  tasks. A task still in progress at shift end goes back in the queue, as
  with Send home.
- **Coverage view**: a week grid by hour and role that flags gaps (for
  example "No pharmacist 18:00–22:00 Tue" or "No one can fill Sunday
  morning"), and scheduled hours against 40 per employee.
- **Overtime from the schedule**: scheduled hours past 8 a day or 40 a week
  show as planned overtime, with its cost, before the week starts. "Don't
  allow overtime" blocks scheduling past the limits.
- **Defaults**: new hires get a 5-day, 8-hour default shift; existing staff
  get one in the migration.
- **Send home** becomes "End shift early".

### Questions for the start of Phase 12

1. **Pay model**: keep a flat daily wage paid every day, or pay for
   scheduled hours, so days off cost nothing? Paying for scheduled hours is
   more realistic but changes the wage balance.
2. **Staff preferences**: should employees have preferred days off or a max
   days in a row that affect morale?
3. **Auto-schedule**: should there be a "Fill gaps" button that drafts a
   schedule to cover each role during opening hours?

## Phase 12 save (v11 → v12)

Schedules on employees, with defaults from the migration.

---

## Decisions log

| Date       | Decision                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| 2026-10-23 | No auto-buying without a Purchasing Agent; settings move to the Marketplace (A) |
| 2026-10-23 | The negotiation discount applies to manual orders while an agent is on staff (B) |
| 2026-10-23 | Equipment purchases have a delivery lead time (C)                        |
| 2026-10-23 | The technician can fix broken items; units age, max condition drops, selling added (D) |
| 2026-10-23 | Strict, realistic role limits for fills and compounds too (E)            |
| 2026-10-23 | Overtime: past 8h a day (unchanged) or past 40h a week (new), for pay and morale |
| 2026-10-23 | Per-employee "Don't allow overtime" toggle: at the limit they take no new tasks, finish the current one, then go home; minutes past the limit are paid as overtime |
| 2026-10-23 | Shifts, days off and a scheduler, in their own later phase               |
| 2026-10-23 | Closing the front: customers inside are served, no reputation cost, reopens every morning, End day pauses work overnight |
