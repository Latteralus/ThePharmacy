// taskbars.js
// The single progress-bar system for task UI. Pages call
// window.taskbars.createProgressBar(task) to build the element, and
// window.updateTaskProgressBars (called every frame by main.js's render loop)
// moves every bar on screen to its task's current progress. task.progress
// already advances every simulation step, so there's nothing to interpolate.
//
// Bars take their task kind's identity colour (--task-* in style.css) and
// show the game time left at the worker's speed (taskManager.minutesLeft);
// the percentage is in the tooltip.

(function () {
    function fraction(task: Task): number {
        if (!(task.totalTime > 0)) return 0;
        return Math.min(1, Math.max(0, task.progress / task.totalTime));
    }

    // Game minutes left, as the player reads it: "<1m left", "3m left", "1h 05m left"
    function timeLeft(task: Task): string {
        const remaining = window.taskManager?.minutesLeft
            ? window.taskManager.minutesLeft(task)
            : Math.max(0, task.totalTime - task.progress);
        if (remaining <= 0) return 'done';
        if (remaining < 1) return '<1m left';
        return `${window.fmt.duration(Math.ceil(remaining))} left`;
    }

    function tooltip(task: Task): string {
        const lines = [
            window.words.taskLabel(task),
            `${Math.round(fraction(task) * 100)}% · ${Math.round(task.progress)} of ${Math.round(task.totalTime)} minutes of work`,
        ];
        const rate = window.taskManager?.workRate?.(task) ?? 1;
        if (Math.abs(rate - 1) >= 0.01) lines.push(`Working at ${rate.toFixed(2)}× speed`);
        const customer = task.customerId ? window.customers?.getCustomerById?.(task.customerId) : undefined;
        if (customer) lines.push(`For ${customer.firstName} ${customer.lastName}`);
        return lines.join('\n');
    }

    function show(bar: HTMLElement, task: Task): void {
        const fill = bar.querySelector<HTMLElement>('.progress-fill');
        const text = bar.querySelector<HTMLElement>('.time-remaining');
        const width = `${+(fraction(task) * 100).toFixed(1)}%`;
        if (fill && fill.style.width !== width) fill.style.width = width;
        const left = timeLeft(task);
        if (text && text.textContent !== left) text.textContent = left;
    }

    function updateTaskProgressBars(): void {
        const bars = document.querySelectorAll<HTMLElement>('.task-progress-bar');
        if (bars.length === 0) return;
        const tasks = window.taskManager?.tasks ?? [];
        bars.forEach((bar) => {
            const task = tasks.find((t) => t.id === bar.dataset.taskId);
            if (task) show(bar, task);
        });
    }

    function createProgressBar(task: Task): HTMLDivElement {
        const bar = document.createElement('div');
        bar.className = `task-progress-bar kind-${window.words?.taskKind(task) ?? 'desk'}`;
        bar.dataset.taskId = task.id;
        bar.setAttribute('role', 'progressbar');

        const track = document.createElement('div');
        track.className = 'progress-track';
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        track.appendChild(fill);

        const text = document.createElement('span');
        text.className = 'time-remaining';

        bar.append(track, text);
        show(bar, task);
        bar.setAttribute('aria-valuenow', String(Math.round(fraction(task) * 100)));
        bar.title = tooltip(task);
        return bar;
    }

    window.updateTaskProgressBars = updateTaskProgressBars;
    window.taskbars = { createProgressBar };
})();
