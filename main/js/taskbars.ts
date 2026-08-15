// taskbars.js
// The single progress-bar system for task UI. Pages that need to show a
// task's progress call window.taskbars.createProgressBar(task) to build the
// element; this file's per-frame loop (window.updateTaskProgressBars, called
// from main.js's render loop) then interpolates and updates it in place
// between real taskManager ticks.

(function() {
    // Task type colors - customize as needed
    const taskTypeColors: Record<string, string> = {
        'fillPrescription': '#4caf50', // Green
        'customerInteraction': '#2196f3', // Blue
        'consultation': '#9c27b0', // Purple
        'compound': '#ff9800', // Orange
        'production': '#795548', // Brown
        'default': '#607d8b' // Gray (fallback)
    };

    // Per-task interpolation state, keyed by task id
    const progressTracker = new Map<string, { velocity: number }>();

    // Timestamp of the last interpolation frame
    let lastSystemUpdate = performance.now();

    // Called every animation frame (via window.updateTaskProgressBars) to
    // smoothly interpolate progress between real taskManager ticks.
    function smoothUpdateTaskProgressBars(): void {
        const now = performance.now();
        const timeSinceLastUpdate = now - lastSystemUpdate;
        lastSystemUpdate = now;

        const progressBars = document.querySelectorAll<HTMLElement>('.task-progress-bar');

        progressBars.forEach(progressBar => {
            const taskId = progressBar.dataset.taskId;
            if (!taskId) return;

            const task = window.taskManager?.tasks?.find(t => t && t.id === taskId);

            if (task && task.status === 'inProgress') {
                if (!progressTracker.has(taskId)) {
                    progressTracker.set(taskId, {
                        velocity: task.totalTime > 0 ? 1 / task.totalTime : 0 // Units per minute
                    });
                }

                const trackedState = progressTracker.get(taskId)!;
                const elapsedMinutes = timeSinceLastUpdate / 60000; // ms to minutes
                const predictedProgress = Math.min(
                    task.totalTime,
                    task.progress + (elapsedMinutes * trackedState.velocity)
                );

                updateProgressBarUI(progressBar, predictedProgress, task);
            }
            // If task is complete or no longer exists, remove from tracker
            else if (!task || task.status !== 'inProgress') {
                progressTracker.delete(taskId);

                if (task && task.status === 'completed') {
                    const progressFill = progressBar.querySelector<HTMLElement>('.progress-fill');
                    const progressPercent = progressBar.querySelector<HTMLElement>('.progress-percent');

                    if (progressFill) progressFill.style.width = '100%';
                    if (progressPercent) progressPercent.textContent = '100%';
                }
            }
        });
    }

    // Update the actual progress bar UI elements with the current progress
    function updateProgressBarUI(progressBar: HTMLElement, currentProgress: number, task: Task): void {
        const progressFill = progressBar.querySelector<HTMLElement>('.progress-fill');
        const progressPercent = progressBar.querySelector<HTMLElement>('.progress-percent');
        const timeRemaining = progressBar.querySelector<HTMLElement>('.time-remaining');

        const percent = Math.min(100, Math.max(0, Math.round((currentProgress / task.totalTime) * 100)));
        const color = taskTypeColors[task.type] || taskTypeColors.default;

        if (progressFill) {
            progressFill.style.width = `${percent}%`;
            progressFill.style.backgroundColor = color;
        }

        if (progressPercent) {
            progressPercent.textContent = `${percent}%`;
        }

        if (timeRemaining) {
            const remainingTime = Math.max(0, task.totalTime - currentProgress);
            const minutes = Math.floor(remainingTime);
            const seconds = Math.floor((remainingTime - minutes) * 60);
            timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
        }
    }

    // Build a progress bar element for a task. Callers (operationsPage,
    // employeesPage, ...) insert this directly into their rendered markup;
    // smoothUpdateTaskProgressBars picks it up automatically on the next frame.
    function createProgressBar(task: Task): HTMLDivElement {
        const percent = Math.min(100, Math.round((task.progress / task.totalTime) * 100));
        const color = taskTypeColors[task.type] || taskTypeColors.default;

        const progressContainer = document.createElement('div');
        progressContainer.className = 'task-progress-bar';
        progressContainer.dataset.taskId = task.id;

        const progressTrack = document.createElement('div');
        progressTrack.className = 'progress-track';

        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = `${percent}%`;
        progressFill.style.backgroundColor = color;

        progressTrack.appendChild(progressFill);
        progressContainer.appendChild(progressTrack);

        const progressPercent = document.createElement('div');
        progressPercent.className = 'progress-percent';
        progressPercent.textContent = `${percent}%`;
        progressContainer.appendChild(progressPercent);

        const timeRemaining = document.createElement('div');
        timeRemaining.className = 'time-remaining';
        const remainingTime = task.totalTime - task.progress;
        const minutes = Math.floor(remainingTime);
        const seconds = Math.floor((remainingTime - minutes) * 60);
        timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
        progressContainer.appendChild(timeRemaining);

        try {
            progressContainer.title = createTaskTooltip(task);
        } catch (error) {
            console.error(`[taskbars.js] Error creating tooltip: ${(error as Error).message}`);
            progressContainer.title = `Task: ${formatTaskType(task.type)} - Progress: ${percent}%`;
        }

        return progressContainer;
    }

    // Create a tooltip for a task
    function createTaskTooltip(task: Task): string {
        let tooltip = `Task: ${formatTaskType(task.type)}\n`;
        tooltip += `Progress: ${Math.round((task.progress / task.totalTime) * 100)}%\n`;
        tooltip += `Time Elapsed: ${task.progress.toFixed(1)} minutes\n`;
        tooltip += `Total Time: ${task.totalTime} minutes\n`;

        if (task.type === 'fillPrescription' && task.prescriptionId) {
            tooltip += `Prescription ID: ${task.prescriptionId}\n`;
        }

        if (task.customerId) {
            try {
                if (window.customers && typeof window.customers.getCustomerById === 'function') {
                    const customer = window.customers.getCustomerById(task.customerId);
                    if (customer) {
                        tooltip += `Customer: ${customer.firstName} ${customer.lastName}\n`;
                    } else {
                        tooltip += `Customer ID: ${task.customerId}\n`;
                    }
                } else {
                    tooltip += `Customer ID: ${task.customerId}\n`;
                }
            } catch (error) {
                console.error(`[taskbars.js] Error getting customer info: ${(error as Error).message}`);
                tooltip += `Customer ID: ${task.customerId}\n`;
            }
        }

        if (task.productId) {
            tooltip += `Product: ${task.productName || task.productId}\n`;
        }

        return tooltip;
    }

    // Format task type for display
    function formatTaskType(type: string | undefined): string {
        if (!type) return 'Unknown';

        switch (type) {
            case 'fillPrescription': return 'Filling Prescription';
            case 'customerInteraction': return 'Customer Interaction';
            case 'consultation': return 'Consultation';
            case 'compound': return 'Compounding';
            case 'production': return 'Production';
            default: return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }

    // Add CSS styles for the progress bars (injected once)
    function addTaskBarStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .task-progress-bar {
                margin: 10px 0;
                position: relative;
                font-size: 12px;
            }

            .progress-track {
                height: 10px;
                background-color: #f0f0f0;
                border-radius: 5px;
                overflow: hidden;
                position: relative;
                will-change: transform;
            }

            .progress-fill {
                height: 100%;
                background-color: #4caf50;
                width: 0%;
                border-radius: 5px;
                transition: width 0.3s linear;
                will-change: width, transform;
                transform: translateZ(0);
            }

            .progress-percent {
                position: absolute;
                top: -16px;
                right: 0;
                font-size: 12px;
                font-weight: bold;
                color: #333;
            }

            .time-remaining {
                margin-top: 4px;
                font-size: 11px;
                color: #666;
                text-align: right;
            }

            [title] {
                position: relative;
                cursor: help;
            }
        `;
        document.head.appendChild(style);
    }

    function init(): void {
        console.log("[taskbars] Initializing task progress bars");
        addTaskBarStyles();
        lastSystemUpdate = performance.now();
    }

    window.addEventListener('DOMContentLoaded', function() {
        try {
            init();
        } catch (error) {
            console.error(`[taskbars] Error during initialization: ${(error as Error).message}`);
        }
    });

    // Called every frame from main.js's render loop
    window.updateTaskProgressBars = smoothUpdateTaskProgressBars;

    // Public API for pages that render task progress
    window.taskbars = { createProgressBar };
})();
