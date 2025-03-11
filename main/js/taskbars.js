// optimized-taskbars.js
// Enhanced progress bars with smooth animations using requestAnimationFrame

(function() {
    // Task type colors - customize as needed
    const taskTypeColors = {
        'fillPrescription': '#4caf50', // Green
        'customerInteraction': '#2196f3', // Blue
        'consultation': '#9c27b0', // Purple
        'compound': '#ff9800', // Orange
        'production': '#795548', // Brown
        'default': '#607d8b' // Gray (fallback)
    };

    // Store tasks with their progress state for interpolation
    const progressTracker = new Map();
    
    // Timestamps to track when tasks were last updated
    let lastSystemUpdate = 0;

    // Initialize enhanced task progress bars
    function initEnhancedTaskBars() {
        console.log("[enhanced-taskbars] Initializing enhanced progress bars");
        
        // Add necessary CSS to the page
        addTaskBarStyles();
        
        // Perform initial progress bar setup
        updateTaskProgressBars();
        
        // Expose the update function globally so it can be called from the main render loop
        window.updateTaskProgressBars = smoothUpdateTaskProgressBars;
        
        // Set current time as base for interpolation
        lastSystemUpdate = performance.now();
    }
    
    // Update function called by the main render loop (every frame)
    function smoothUpdateTaskProgressBars() {
        // The current timestamp for interpolation
        const now = performance.now();
        
        // Calculate time since last system update (for interpolation)
        const timeSinceLastUpdate = now - lastSystemUpdate;
        
        // Find all task progress bars in the DOM
        const progressBars = document.querySelectorAll('.task-progress-bar');
        
        progressBars.forEach(progressBar => {
            const taskId = progressBar.dataset.taskId;
            if (!taskId) return;
            
            // Get the task from the global task manager
            const task = window.taskManager?.tasks?.find(t => t && t.id === taskId);
            
            // If task exists and is in progress, update its visual progress
            if (task && task.status === 'inProgress') {
                // Get tracked state or create new entry
                if (!progressTracker.has(taskId)) {
                    progressTracker.set(taskId, {
                        lastProgress: task.progress,
                        lastUpdate: now,
                        velocity: task.totalTime > 0 ? 1 / task.totalTime : 0, // Units per minute
                        totalTime: task.totalTime
                    });
                }
                
                const trackedState = progressTracker.get(taskId);
                
                // Calculate interpolated progress
                // We know the rate of progress (velocity) so we can predict where it should be now
                const elapsedMinutes = timeSinceLastUpdate / 60000; // Convert ms to minutes
                const predictedProgress = Math.min(
                    task.totalTime, 
                    task.progress + (elapsedMinutes * trackedState.velocity)
                );
                
                // Update the visual elements
                updateProgressBarUI(progressBar, predictedProgress, task);
            } 
            // If task is complete or no longer exists, remove from tracker
            else if (!task || task.status !== 'inProgress') {
                progressTracker.delete(taskId);
                
                // If task is complete, set to 100%
                if (task && task.status === 'completed') {
                    const progressFill = progressBar.querySelector('.progress-fill');
                    const progressPercent = progressBar.querySelector('.progress-percent');
                    
                    if (progressFill) progressFill.style.width = '100%';
                    if (progressPercent) progressPercent.textContent = '100%';
                }
            }
        });
    }
    
    // Update the actual progress bar UI elements with the current progress
    function updateProgressBarUI(progressBar, currentProgress, task) {
        // Get the elements
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressPercent = progressBar.querySelector('.progress-percent');
        const timeRemaining = progressBar.querySelector('.time-remaining');
        
        // Calculate percentage and apply color based on task type
        const percent = Math.min(100, Math.max(0, Math.round((currentProgress / task.totalTime) * 100)));
        const color = taskTypeColors[task.type] || taskTypeColors.default;
        
        // Update fill width with CSS transition applied in the CSS
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
            progressFill.style.backgroundColor = color;
        }
        
        // Update percentage text
        if (progressPercent) {
            progressPercent.textContent = `${percent}%`;
        }
        
        // Update time remaining
        if (timeRemaining) {
            const remainingTime = Math.max(0, task.totalTime - currentProgress);
            const minutes = Math.floor(remainingTime);
            const seconds = Math.floor((remainingTime - minutes) * 60);
            timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
        }
    }
    
    // Recreates all task progress bars when the task data changes
    // This is called less frequently, typically when task status changes
    function updateTaskProgressBars() {
        // Update timestamp for interpolation base
        lastSystemUpdate = performance.now();
        
        // Only proceed if the task manager exists and has tasks
        if (!window.taskManager || !window.taskManager.tasks) {
            return;
        }
        
        // Get tasks in progress
        const activeTasks = window.taskManager.tasks.filter(t => 
            t && t.status === 'inProgress' && t.assignedTo
        );
        
        // Update our progress tracker with the latest real data
        activeTasks.forEach(task => {
            if (progressTracker.has(task.id)) {
                const trackedState = progressTracker.get(task.id);
                
                // Update the tracker with the latest actual progress
                trackedState.lastProgress = task.progress;
                trackedState.lastUpdate = lastSystemUpdate;
                trackedState.totalTime = task.totalTime;
                trackedState.velocity = task.totalTime > 0 ? 1 / task.totalTime : 0;
            } else {
                // Create new tracker entry
                progressTracker.set(task.id, {
                    lastProgress: task.progress,
                    lastUpdate: lastSystemUpdate,
                    velocity: task.totalTime > 0 ? 1 / task.totalTime : 0,
                    totalTime: task.totalTime
                });
            }
        });
        
        // Clean up tracked tasks that are no longer active
        for (const taskId of progressTracker.keys()) {
            if (!activeTasks.some(t => t.id === taskId)) {
                progressTracker.delete(taskId);
            }
        }
        
        // Update employee task displays
        updateEmployeeTaskDisplays();
        
        // Update standalone task displays
        updateStandaloneTaskDisplays();
    }
    
    // Update task displays within employee cards
    function updateEmployeeTaskDisplays() {
        const employeeTaskElements = document.querySelectorAll('.employee-card .task-section, .task-info');
        
        employeeTaskElements.forEach(taskElement => {
            const employeeCard = taskElement.closest('[data-employee-id], .employee-card');
            if (!employeeCard) return;
            
            const employeeId = employeeCard.dataset?.employeeId || 
                               employeeCard.querySelector('.employee-id')?.textContent || 
                               getEmployeeIdFromContext(employeeCard);
            
            if (!employeeId) return;
            
            const employee = window.employeesData?.find(e => e && e.id === employeeId);
            if (!employee || !employee.currentTaskId) return;
            
            const task = window.taskManager?.tasks?.find(t => t && t.id === employee.currentTaskId);
            if (!task) return;
            
            // Replace the existing progress bar with our enhanced version
            try {
                replaceProgressBar(taskElement, task);
            } catch (error) {
                console.error(`[enhanced-taskbars] Error replacing progress bar: ${error.message}`);
            }
        });
    }
    
    // Extract employee ID from surrounding context if not explicitly marked
    function getEmployeeIdFromContext(element) {
        // Try to find by name match
        const nameElement = element.querySelector('h3, .employee-name, strong');
        if (nameElement) {
            const nameText = nameElement.textContent;
            
            // Find employee by full name match
            if (window.employeesData) {
                for (const emp of window.employeesData) {
                    if (!emp) continue;
                    const fullName = `${emp.firstName} ${emp.lastName}`;
                    if (nameText.includes(fullName)) {
                        return emp.id;
                    }
                }
            }
        }
        
        return null;
    }
    
    // Update standalone task displays
    function updateStandaloneTaskDisplays() {
        const taskEntries = document.querySelectorAll('.task-entry, [class*="task-item"]');
        
        taskEntries.forEach(taskEntry => {
            const taskId = taskEntry.dataset?.taskId || getTaskIdFromContext(taskEntry);
            if (!taskId) return;
            
            const task = window.taskManager?.tasks?.find(t => t && t.id === taskId);
            if (!task || task.status !== 'inProgress') return;
            
            // Replace the existing progress bar with our enhanced version
            try {
                replaceProgressBar(taskEntry, task);
            } catch (error) {
                console.error(`[enhanced-taskbars] Error replacing progress bar: ${error.message}`);
            }
        });
    }
    
    // Extract task ID from context if not explicitly marked
    function getTaskIdFromContext(element) {
        // Look for a task ID in the text content
        const text = element.textContent;
        
        // Common task ID patterns
        const patterns = [
            /task-[\w\d-]+/i,
            /taskId:\s*([\w\d-]+)/i,
            /task ID:\s*([\w\d-]+)/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[0] || match[1];
        }
        
        return null;
    }
    
    // Replace a basic progress bar with our enhanced version
    function replaceProgressBar(container, task) {
        // Look for existing progress elements
        const existingProgress = container.querySelector('progress');
        const existingProgressContainer = container.querySelector('.progress-container');
        
        // If we already replaced this with our custom bar, just update it
        const existingCustomBar = container.querySelector('.task-progress-bar');
        if (existingCustomBar) {
            existingCustomBar.dataset.taskId = task.id;
            return;
        }
        
        // If there was a native progress bar, remove it along with its container
        if (existingProgress) {
            const parent = existingProgress.parentElement;
            if (parent && parent.classList.contains('progress-container')) {
                parent.remove();
            } else {
                existingProgress.remove();
            }
        }
        
        // Create our custom progress bar
        const customBar = createCustomProgressBar(task);
        
        // Find the right place to insert it
        // If there was a progress-container, insert at that position
        if (existingProgressContainer) {
            container.insertBefore(customBar, existingProgressContainer.nextSibling);
        } else {
            // Otherwise add it to the end of the container
            container.appendChild(customBar);
        }
    }
    
    // Create a custom progress bar for a task
    function createCustomProgressBar(task) {
        const percent = Math.min(100, Math.round((task.progress / task.totalTime) * 100));
        
        // Get the color based on task type
        const color = taskTypeColors[task.type] || taskTypeColors.default;
        
        // Create the container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'task-progress-bar';
        progressContainer.dataset.taskId = task.id;
        
        // Create the progress track and fill
        const progressTrack = document.createElement('div');
        progressTrack.className = 'progress-track';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = `${percent}%`;
        progressFill.style.backgroundColor = color;
        
        progressTrack.appendChild(progressFill);
        progressContainer.appendChild(progressTrack);
        
        // Add percentage text
        const progressPercent = document.createElement('div');
        progressPercent.className = 'progress-percent';
        progressPercent.textContent = `${percent}%`;
        progressContainer.appendChild(progressPercent);
        
        // Time remaining
        const timeRemaining = document.createElement('div');
        timeRemaining.className = 'time-remaining';
        const remainingTime = task.totalTime - task.progress;
        const minutes = Math.floor(remainingTime);
        const seconds = Math.floor((remainingTime - minutes) * 60);
        timeRemaining.textContent = `${minutes}:${seconds.toString().padStart(2, '0')} remaining`;
        progressContainer.appendChild(timeRemaining);
        
        // Add a tooltip with task details - wrapped in try/catch to prevent errors
        try {
            progressContainer.title = createTaskTooltip(task);
        } catch (error) {
            console.error(`[enhanced-taskbars] Error creating tooltip: ${error.message}`);
            progressContainer.title = `Task: ${formatTaskType(task.type)} - Progress: ${percent}%`;
        }
        
        return progressContainer;
    }
    
    // Create a tooltip for a task
    function createTaskTooltip(task) {
        let tooltip = `Task: ${formatTaskType(task.type)}\n`;
        tooltip += `Progress: ${Math.round((task.progress / task.totalTime) * 100)}%\n`;
        tooltip += `Time Elapsed: ${task.progress.toFixed(1)} minutes\n`;
        tooltip += `Total Time: ${task.totalTime} minutes\n`;
        
        if (task.type === 'fillPrescription' && task.prescriptionId) {
            tooltip += `Prescription ID: ${task.prescriptionId}\n`;
        }
        
        if (task.customerId) {
            // Safely get customer information
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
                console.error(`[enhanced-taskbars] Error getting customer info: ${error.message}`);
                tooltip += `Customer ID: ${task.customerId}\n`;
            }
        }
        
        if (task.productId) {
            tooltip += `Product: ${task.productName || task.productId}\n`;
        }
        
        return tooltip;
    }
    
    // Format task type for display
    function formatTaskType(type) {
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
    
    // Add CSS styles for the enhanced progress bars
    function addTaskBarStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Custom progress bar styles */
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
                background-color: #4caf50; /* Default color, will be overridden */
                width: 0%; /* Will be set dynamically */
                border-radius: 5px;
                transition: width 0.3s linear; /* Smooth transition between updates */
                will-change: width, transform;
                transform: translateZ(0); /* Force GPU acceleration */
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
            
            /* Tooltip improvements for all browsers */
            [title] {
                position: relative;
                cursor: help;
            }
            
            /* Ensure task entries in the operations page correctly show the ID */
            .task-entry {
                position: relative;
            }
            
            /* Animation for progress bars */
            @keyframes pulse {
                0% { opacity: 0.9; }
                50% { opacity: 1; }
                100% { opacity: 0.9; }
            }
            
            .progress-fill.active {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Connect to the task manager's update system
    function connectToTaskManager() {
        // Only proceed if task manager is available and has updateTasks function
        if (!window.taskManager || typeof window.taskManager.updateTasks !== 'function') {
            console.warn("[enhanced-taskbars] Task manager or updateTasks function not available");
            return;
        }
        
        // Store the original updateTasks function
        const originalUpdateTasks = window.taskManager.updateTasks;
        
        // Replace with our enhanced version
        window.taskManager.updateTasks = function(...args) {
            // Call the original function first
            let result;
            try {
                result = originalUpdateTasks.apply(this, args);
            } catch (error) {
                console.error(`[enhanced-taskbars] Error in original updateTasks: ${error.message}`);
                // Continue with our updates even if the original function fails
            }
            
            // Then update our progress tracking system
            try {
                updateTaskProgressBars();
            } catch (error) {
                console.error(`[enhanced-taskbars] Error updating progress bars: ${error.message}`);
            }
            
            return result;
        };
        
        console.log("[enhanced-taskbars] Connected to task manager system");
    }
    
    // Initialize when the page loads
    window.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the operations page and delay a bit to ensure the UI is rendered
        setTimeout(() => {
            try {
                initEnhancedTaskBars();
                
                // Connect to the task manager once it's available
                if (window.taskManager) {
                    connectToTaskManager();
                } else {
                    // Wait for task manager to be available
                    const checkInterval = setInterval(() => {
                        if (window.taskManager) {
                            connectToTaskManager();
                            clearInterval(checkInterval);
                        }
                    }, 100);
                }
            } catch (error) {
                console.error(`[enhanced-taskbars] Error during initialization: ${error.message}`);
            }
        }, 500);
    });
    
    // Also initialize if the page changes to operations
    document.addEventListener('pageChanged', function(e) {
        if (e.detail && e.detail.page === 'operations') {
            setTimeout(() => {
                try {
                    initEnhancedTaskBars();
                } catch (error) {
                    console.error(`[enhanced-taskbars] Error initializing on page change: ${error.message}`);
                }
            }, 500);
        }
    });
    
    // Export the initialization function for manual use
    window.initEnhancedTaskBars = initEnhancedTaskBars;
    window.updateTaskProgressBarsSystem = updateTaskProgressBars;
    
    // Monitor for DOM mutations to update progress bars when new tasks appear
    function setupMutationObserver() {
        try {
            const observer = new MutationObserver((mutations) => {
                let needsUpdate = false;
                
                mutations.forEach(mutation => {
                    // Check if we added nodes that might contain task bars
                    if (mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (
                                    node.classList?.contains('task-entry') || 
                                    node.classList?.contains('employee-card') ||
                                    node.querySelector?.('.task-entry, .task-section, progress')
                                ) {
                                    needsUpdate = true;
                                    break;
                                }
                            }
                        }
                    }
                });
                
                if (needsUpdate) {
                    try {
                        updateTaskProgressBars();
                    } catch (error) {
                        console.error(`[enhanced-taskbars] Error updating progress bars after DOM mutation: ${error.message}`);
                    }
                }
            });
            
            // Start observing the document with the configured parameters
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
            
            console.log("[enhanced-taskbars] Mutation observer activated");
        } catch (error) {
            console.error(`[enhanced-taskbars] Error setting up mutation observer: ${error.message}`);
        }
    }
    
    // Setup the mutation observer after a short delay
    setTimeout(setupMutationObserver, 1000);
    
    // Monkey patch the showPage function to detect page changes
    try {
        const originalShowPage = window.showPage;
        if (originalShowPage && typeof originalShowPage === 'function') {
            window.showPage = function(pageName) {
                try {
                    originalShowPage(pageName);
                } catch (error) {
                    console.error(`[enhanced-taskbars] Error in original showPage: ${error.message}`);
                    // Continue with our event dispatch even if original function fails
                }
                
                // Dispatch a custom event for page changes
                try {
                    const event = new CustomEvent('pageChanged', { 
                        detail: { page: pageName } 
                    });
                    document.dispatchEvent(event);
                } catch (error) {
                    console.error(`[enhanced-taskbars] Error dispatching pageChanged event: ${error.message}`);
                }
            };
        }
    } catch (error) {
        console.error(`[enhanced-taskbars] Error patching showPage function: ${error.message}`);
    }
})();