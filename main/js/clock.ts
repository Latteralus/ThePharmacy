// clock.js - the one game clock and scheduler.
//
// Simulation code schedules work in game minutes here instead of using
// setInterval/setTimeout/Date.now(). Only main.ts's updateGameTime calls
// tick(), and it only runs while the day is active and the game isn't
// paused - so pause, game speed and the overnight gap apply to every
// scheduled job automatically.
//
// Time scale: at 1x, 1 real second = 1 game minute. Intervals converted from
// the old real-time timers keep their 1x duration (60 real seconds became
// 60 game minutes).

window.clock = (function (): ClockApi {
    interface Job {
        id: number;
        fn: () => void;
        delayMs: number;
        repeat: boolean;
        // Game time the job is next due. null until the first tick, for jobs
        // registered at script load, before gameState exists.
        dueAt: number | null;
    }

    const MINUTE_MS = 60 * 1000;
    const jobs = new Map<number, Job>();
    let nextId = 1;
    let lastTickAt: number | null = null;

    // Current game time in ms, or null before a game is set up.
    function gameTime(): number | null {
        const date = window.gameState?.currentDate;
        return date instanceof Date ? date.getTime() : null;
    }

    function now(): number {
        return gameTime() ?? 0;
    }

    function schedule(gameMinutes: number, fn: () => void, repeat: boolean): number {
        const delayMs = Math.max(0, gameMinutes) * MINUTE_MS;
        const t = gameTime();
        const job: Job = {
            id: nextId++,
            fn,
            // A repeating job needs a non-zero period or it would run every tick.
            delayMs: repeat ? Math.max(delayMs, 1) : delayMs,
            repeat,
            dueAt: t === null ? null : t + delayMs,
        };
        jobs.set(job.id, job);
        return job.id;
    }

    // Runs fn every `gameMinutes` of game time.
    function every(gameMinutes: number, fn: () => void): number {
        return schedule(gameMinutes, fn, true);
    }

    // Runs fn once, `gameMinutes` of game time from now.
    function after(gameMinutes: number, fn: () => void): number {
        return schedule(gameMinutes, fn, false);
    }

    function cancel(id: number): void {
        jobs.delete(id);
    }

    function tick(): void {
        const t = gameTime();
        if (t === null) return;

        // Time went backwards (an in-game load, a debug reset): shift every
        // job by the same amount so each keeps its remaining delay instead of
        // waiting out the gap.
        if (lastTickAt !== null && t < lastTickAt) {
            const shift = t - lastTickAt;
            jobs.forEach((job) => {
                if (job.dueAt !== null) job.dueAt += shift;
            });
        }
        lastTickAt = t;

        const due: Job[] = [];
        jobs.forEach((job) => {
            if (job.dueAt === null) {
                job.dueAt = t + job.delayMs;
            } else if (job.dueAt <= t) {
                due.push(job);
            }
        });
        due.sort((a, b) => a.dueAt! - b.dueAt!);

        for (const job of due) {
            // An earlier job in this tick may have cancelled it.
            if (!jobs.has(job.id)) continue;

            if (!job.repeat) {
                jobs.delete(job.id);
            } else {
                // Don't replay missed runs after a time jump (the overnight
                // skip, "+1 Hour"): run once and re-align to now.
                job.dueAt! += job.delayMs;
                if (job.dueAt! <= t) job.dueAt = t + job.delayMs;
            }

            try {
                job.fn();
            } catch (error) {
                console.error('[clock] Error in scheduled job:', error);
            }
        }
    }

    return { now, every, after, cancel, tick };
})();
