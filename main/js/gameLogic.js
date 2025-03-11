// gameLogic.js - Web Worker for Background Processing

// This file runs in a separate thread from the main UI
// It handles intensive calculations without blocking the UI thread

// Constants for simulation configuration
const CONFIG = {
    SIMULATION_SPEED: 1.0, // Default game speed multiplier
    GAME_MINUTE_IN_MS: 1000, // 1 second real time = 1 minute game time
    OPENING_HOUR: 7,   // Day starts at 7 AM
    CLOSING_HOUR: 22,  // Day ends at 10 PM
};

// Internal state storage
let state = {
    gameTime: null,
    employeeEfficiency: {}, // Cache for employee efficiency calculations
    inventoryLevels: {},    // Cache for inventory projection calculations
    customerPatience: {},   // Cache for customer patience projections
    simulationData: {       // Advanced simulation metrics
        avgWaitTime: 0,
        avgServiceTime: 0,
        dailyCapacity: 0,
        bottlenecks: []
    },
    calculationsInProgress: false
};

// Listen for messages from the main thread
self.addEventListener('message', function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            // Initialize state with data from main thread
            initializeState(data);
            break;
            
        case 'updateGameTime':
            // Update the current game time
            state.gameTime = new Date(data.currentTime);
            break;
            
        case 'updateEmployees':
            // Update employee data for efficiency calculations
            updateEmployeeData(data.employees);
            break;
            
        case 'updateInventory':
            // Update inventory data for projections
            updateInventoryData(data.inventory);
            break;
            
        case 'updateCustomers':
            // Update customer data for patience and service projections
            updateCustomerData(data.customers);
            break;
            
        case 'runSimulation':
            // Run a business simulation for projections
            runBusinessSimulation(data);
            break;
            
        case 'calculateEfficiency':
            // Calculate efficiency for a specific employee
            calculateEmployeeEfficiency(data.employeeId, data.taskType);
            break;
            
        case 'projectTaskCompletionTimes':
            // Project completion times for all active tasks
            projectTaskCompletionTimes(data.tasks);
            break;
            
        case 'analyzeBottlenecks':
            // Analyze system for bottlenecks
            analyzeSystemBottlenecks(data);
            break;
    }
});

// Initialize the worker state with data from main thread
function initializeState(data) {
    state.gameTime = new Date(data.currentTime);
    
    // Initialize other state properties as needed
    if (data.employees) updateEmployeeData(data.employees);
    if (data.inventory) updateInventoryData(data.inventory);
    if (data.customers) updateCustomerData(data.customers);
    
    // Send ready message back to main thread
    self.postMessage({
        type: 'initialized',
        success: true
    });
}

// Update employee data and recalculate efficiencies
function updateEmployeeData(employees) {
    // Store employee data for efficiency calculations
    employees.forEach(employee => {
        state.employeeEfficiency[employee.id] = {
            lastCalculated: Date.now(),
            baseEfficiency: calculateBaseEfficiency(employee),
            taskSpecificEfficiency: {}
        };
    });
    
    // Send updated efficiency data back to main thread
    self.postMessage({
        type: 'employeeEfficiencyUpdated',
        efficiencies: state.employeeEfficiency
    });
}

// Calculate base efficiency for an employee
function calculateBaseEfficiency(employee) {
    // Calculate average skill
    let skillSum = 0;
    let skillCount = 0;
    
    for (const skill in employee.skills) {
        skillSum += employee.skills[skill];
        skillCount++;
    }
    
    const avgSkill = skillCount > 0 ? skillSum / skillCount : 50;
    
    // Apply morale factor
    const moraleFactor = 0.5 + (employee.morale / 200); // 0.5 to 1.0 based on morale
    
    // Calculate base efficiency (0-100 scale)
    const baseEfficiency = avgSkill * moraleFactor;
    
    return baseEfficiency;
}

// Update inventory data and project usage
function updateInventoryData(inventory) {
    // Store inventory data
    state.inventoryLevels = {};
    
    // Process materials inventory
    if (inventory.materials) {
        inventory.materials.forEach(material => {
            state.inventoryLevels[material.id] = {
                current: material.inventory,
                projected: projectMaterialUsage(material)
            };
        });
    }
    
    // Process products inventory
    if (inventory.products) {
        inventory.products.forEach(product => {
            state.inventoryLevels[product.id] = {
                current: product.inventory,
                projected: projectProductUsage(product)
            };
        });
    }
    
    // Send updated inventory projections back to main thread
    self.postMessage({
        type: 'inventoryProjectionsUpdated',
        inventoryLevels: state.inventoryLevels
    });
}

// Project material usage rates based on current tasks
function projectMaterialUsage(material) {
    // Calculate rate of usage based on active production tasks
    // and determine when reordering will be necessary
    
    // This is a placeholder for the actual calculation
    return {
        daysRemaining: estimateDaysRemaining(material.inventory, material.usageRate || 10),
        reorderPoint: material.autoOrderThreshold || 100,
        reorderQuantity: material.autoOrderAmount || 500
    };
}

// Project product usage based on current customer demand
function projectProductUsage(product) {
    // Calculate rate of usage based on customer demand patterns
    // and determine when production should be scheduled
    
    // This is a placeholder for the actual calculation
    return {
        daysRemaining: estimateDaysRemaining(product.inventory, product.usageRate || 1),
        productionPoint: product.maxInventory / 2 || 2,
        productionQuantity: product.maxInventory || 5
    };
}

// Estimate days remaining based on current level and usage rate
function estimateDaysRemaining(currentLevel, usageRate) {
    if (!usageRate || usageRate <= 0) return 99; // No usage
    return Math.max(0, Math.floor(currentLevel / usageRate));
}

// Update customer data and project service needs
function updateCustomerData(customers) {
    // Store customer data
    state.customerPatience = {};
    
    customers.forEach(customer => {
        state.customerPatience[customer.id] = {
            initial: customer.patience,
            current: customer.patience,
            estimatedWaitTime: calculateEstimatedWaitTime(customer),
            willLeaveAt: predictCustomerDeparture(customer)
        };
    });
    
    // Send updated customer projections back to main thread
    self.postMessage({
        type: 'customerProjectionsUpdated',
        customerPatience: state.customerPatience
    });
}

// Calculate estimated wait time for a customer
function calculateEstimatedWaitTime(customer) {
    // Calculate how long a customer is likely to wait based on
    // their position in queue and current task processing rates
    
    // This is a placeholder for the actual calculation
    switch (customer.status) {
        case 'waitingForCheckIn':
            return 5; // 5 minutes
        case 'waitingForConsultation':
            return 8; // 8 minutes
        case 'waitingForFill':
            return 15; // 15 minutes
        case 'readyForCheckout':
            return 3; // 3 minutes
        default:
            return 0;
    }
}

// Predict when a customer will leave (either satisfied or impatient)
function predictCustomerDeparture(customer) {
    // Base calculation on customer type, patience, and status
    const now = state.gameTime ? state.gameTime.getTime() : Date.now();
    
    // Remaining patience in milliseconds
    const patienceMs = customer.patience * 1000;
    
    // Estimated time to complete service
    const waitTime = calculateEstimatedWaitTime(customer) * 60 * 1000;
    
    // Will they leave satisfied or impatient?
    if (waitTime < patienceMs) {
        // Will leave satisfied after service completes
        return {
            time: new Date(now + waitTime),
            reason: 'satisfied',
            estimatedCompletionSteps: getCompletionSteps(customer)
        };
    } else {
        // Will leave impatient before service completes
        return {
            time: new Date(now + patienceMs),
            reason: 'impatient',
            remainingSteps: getRemainingSteps(customer)
        };
    }
}

// Get completion steps for a customer journey
function getCompletionSteps(customer) {
    // Define the sequence of steps needed for this customer to complete service
    const allSteps = [
        'waitingForCheckIn',
        'waitingForConsultation',
        'waitingForFill',
        'readyForCheckout',
        'completed'
    ];
    
    // Find current position in the sequence
    const currentIndex = allSteps.indexOf(customer.status);
    if (currentIndex === -1) return allSteps;
    
    // Return remaining steps including current
    return allSteps.slice(currentIndex);
}

// Get remaining steps for a customer journey
function getRemainingSteps(customer) {
    return getCompletionSteps(customer);
}

// Run a comprehensive business simulation
function runBusinessSimulation(data) {
    // Avoid running multiple simulations simultaneously
    if (state.calculationsInProgress) {
        self.postMessage({
            type: 'simulationStatus',
            status: 'busy',
            message: 'A simulation is already in progress'
        });
        return;
    }
    
    state.calculationsInProgress = true;
    
    // Send status update to main thread
    self.postMessage({
        type: 'simulationStatus',
        status: 'started'
    });
    
    // Simulate business operations for the specified time period
    const results = simulateOperations(data);
    
    // Update internal state with simulation results
    state.simulationData = results;
    
    // Send results back to main thread
    self.postMessage({
        type: 'simulationCompleted',
        results: results
    });
    
    state.calculationsInProgress = false;
}

// Simulate business operations
function simulateOperations(data) {
    // Extract parameters for simulation
    const { duration, employees, customers, inventory, tasks } = data;
    
    // Initialize metrics
    let metrics = {
        processingCapacity: 0,
        customerThroughput: 0,
        averageWaitTime: 0,
        resourceUtilization: {},
        bottlenecks: [],
        inventoryProjection: {},
        estimatedProfit: 0
    };
    
    // Perform simulation calculations 
    // (placeholder - would be a complex system in reality)
    
    // Calculate processing capacity based on employees and their efficiencies
    if (employees) {
        let totalCapacity = 0;
        employees.forEach(employee => {
            const efficiency = calculateBaseEfficiency(employee);
            totalCapacity += efficiency / 100; // Convert to capacity units
            
            // Track utilization per employee
            metrics.resourceUtilization[employee.id] = {
                name: `${employee.firstName} ${employee.lastName}`,
                role: employee.role,
                utilization: Math.min(100, Math.random() * 100) // Placeholder calculation
            };
        });
        metrics.processingCapacity = totalCapacity;
    }
    
    // Analyze customer flow
    if (customers) {
        metrics.customerThroughput = customers.length / 8; // Customers per hour (8-hour day)
        metrics.averageWaitTime = 15 + (customers.length / employees.length) * 5; // Minutes
    }
    
    // Identify bottlenecks
    metrics.bottlenecks = findBottlenecks(employees, tasks);
    
    // Project inventory levels
    if (inventory) {
        metrics.inventoryProjection = projectInventoryForPeriod(inventory, duration);
    }
    
    // Estimate profit based on all factors
    metrics.estimatedProfit = estimateProfit(data);
    
    return metrics;
}

// Find operational bottlenecks
function findBottlenecks(employees, tasks) {
    const bottlenecks = [];
    
    // Identify employee role shortages
    const roles = {};
    const roleTasks = {};
    
    // Count employees by role
    if (employees) {
        employees.forEach(emp => {
            roles[emp.role] = (roles[emp.role] || 0) + 1;
        });
    }
    
    // Count tasks by required role
    if (tasks) {
        tasks.forEach(task => {
            const role = task.roleNeeded || 'unknown';
            roleTasks[role] = (roleTasks[role] || 0) + 1;
        });
    }
    
    // Calculate task-to-employee ratio for each role
    for (const role in roleTasks) {
        const employeeCount = roles[role] || 0;
        const taskCount = roleTasks[role];
        
        if (employeeCount === 0) {
            // Critical bottleneck - no employees for this role
            bottlenecks.push({
                type: 'criticalStaffShortage',
                role: role,
                tasks: taskCount,
                employees: 0,
                recommendation: `Hire at least one ${role} immediately.`
            });
        } else if (taskCount / employeeCount > 3) {
            // Moderate bottleneck - too many tasks per employee
            bottlenecks.push({
                type: 'staffShortage',
                role: role,
                tasks: taskCount,
                employees: employeeCount,
                ratio: taskCount / employeeCount,
                recommendation: `Consider hiring more ${role} staff.`
            });
        }
    }
    
    // Identify inventory bottlenecks
    if (state.inventoryLevels) {
        for (const itemId in state.inventoryLevels) {
            const item = state.inventoryLevels[itemId];
            if (item.projected && item.projected.daysRemaining < 1) {
                bottlenecks.push({
                    type: 'inventoryShortage',
                    itemId: itemId,
                    current: item.current,
                    recommendation: 'Order more immediately.'
                });
            }
        }
    }
    
    return bottlenecks;
}

// Project inventory levels for a specific period
function projectInventoryForPeriod(inventory, days) {
    const projection = {};
    
    // Materials projection
    if (inventory.materials) {
        inventory.materials.forEach(material => {
            const usageRate = material.usageRate || 10; // Default usage rate
            const projectedLevel = Math.max(0, material.inventory - (usageRate * days));
            
            projection[material.id] = {
                current: material.inventory,
                projected: projectedLevel,
                status: projectedLevel > material.autoOrderThreshold ? 'adequate' : 'low'
            };
        });
    }
    
    // Products projection
    if (inventory.products) {
        inventory.products.forEach(product => {
            const usageRate = product.usageRate || 1; // Default usage rate
            const projectedLevel = Math.max(0, product.inventory - (usageRate * days));
            
            projection[product.id] = {
                current: product.inventory,
                projected: projectedLevel,
                status: projectedLevel > (product.maxInventory / 4) ? 'adequate' : 'low'
            };
        });
    }
    
    return projection;
}

// Estimate profit based on all business factors
function estimateProfit(data) {
    // Extract relevant data
    const { customers, duration, employees } = data;
    
    // Estimate daily revenue
    let estimatedDailyRevenue = 0;
    if (customers) {
        // Assume average revenue per customer
        const avgRevenuePerCustomer = 50; // Placeholder value
        estimatedDailyRevenue = customers.length * avgRevenuePerCustomer;
    }
    
    // Estimate daily costs
    let estimatedDailyCosts = 0;
    if (employees) {
        // Calculate daily wage costs
        employees.forEach(emp => {
            estimatedDailyCosts += emp.salary / 365; // Daily wage
        });
    }
    
    // Add fixed overhead costs
    estimatedDailyCosts += 500; // Placeholder value
    
    // Calculate estimated profit
    const estimatedProfit = estimatedDailyRevenue - estimatedDailyCosts;
    
    return estimatedProfit * duration; // Total profit for the period
}

// Calculate employee efficiency for a specific task type
function calculateEmployeeEfficiency(employeeId, taskType) {
    // Get employee data from state
    const efficiencyData = state.employeeEfficiency[employeeId];
    if (!efficiencyData) {
        self.postMessage({
            type: 'employeeEfficiencyCalculated',
            employeeId: employeeId,
            taskType: taskType,
            efficiency: 50, // Default fallback
            error: 'Employee data not found'
        });
        return;
    }
    
    // Check if task-specific efficiency is already calculated recently
    if (efficiencyData.taskSpecificEfficiency[taskType] && 
        Date.now() - efficiencyData.taskSpecificEfficiency[taskType].lastCalculated < 5000) {
        // Use cached value if calculated within the last 5 seconds
        self.postMessage({
            type: 'employeeEfficiencyCalculated',
            employeeId: employeeId,
            taskType: taskType,
            efficiency: efficiencyData.taskSpecificEfficiency[taskType].value,
            cached: true
        });
        return;
    }
    
    // Calculate task-specific efficiency based on employee skills
    // This is a more intensive calculation that considers task type
    // along with specific employee skills, traits, etc.
    let taskEfficiency = efficiencyData.baseEfficiency;
    
    // Modify efficiency based on task type and relevant skills
    // This is a placeholder for a more complex calculation
    switch (taskType) {
        case 'fillPrescription':
            // Modify based on dispensing and compounding skills
            taskEfficiency *= 1.2; // Example modifier
            break;
        case 'customerInteraction':
            // Modify based on customer service skills
            taskEfficiency *= 1.1; // Example modifier
            break;
        case 'consultation':
            // Modify based on pharmaceutical knowledge
            taskEfficiency *= 1.3; // Example modifier
            break;
        case 'compound':
            // Modify based on compounding skills
            taskEfficiency *= 1.15; // Example modifier
            break;
    }
    
    // Cap at 100
    taskEfficiency = Math.min(100, taskEfficiency);
    
    // Cache the result
    efficiencyData.taskSpecificEfficiency[taskType] = {
        value: taskEfficiency,
        lastCalculated: Date.now()
    };
    
    // Send result back to main thread
    self.postMessage({
        type: 'employeeEfficiencyCalculated',
        employeeId: employeeId,
        taskType: taskType,
        efficiency: taskEfficiency
    });
}

// Project completion times for active tasks
function projectTaskCompletionTimes(tasks) {
    if (!tasks || tasks.length === 0) {
        self.postMessage({
            type: 'taskCompletionTimesProjected',
            projections: {}
        });
        return;
    }
    
    const projections = {};
    const now = state.gameTime ? state.gameTime.getTime() : Date.now();
    
    tasks.forEach(task => {
        if (task.status !== 'inProgress' || !task.assignedTo) {
            return; // Skip tasks that aren't in progress or assigned
        }
        
        // Get employee efficiency data
        const employeeEfficiency = state.employeeEfficiency[task.assignedTo];
        const efficiency = employeeEfficiency ? 
            (employeeEfficiency.taskSpecificEfficiency[task.type]?.value || employeeEfficiency.baseEfficiency) : 
            50; // Default fallback
        
        // Calculate remaining time based on progress and efficiency
        const progressPercent = task.progress / task.totalTime;
        const remainingPercent = 1 - progressPercent;
        
        // Adjust remaining time by efficiency factor
        // Higher efficiency = faster completion
        const efficiencyFactor = 1 - (efficiency - 50) / 100; // Range: 0.5 to 1.5
        const adjustedRemainingTime = task.totalTime * remainingPercent * efficiencyFactor;
        
        // Convert remaining time to milliseconds
        const remainingMs = adjustedRemainingTime * 60 * 1000;
        
        // Calculate projected completion time
        const completionTime = new Date(now + remainingMs);
        
        // Store projection
        projections[task.id] = {
            originalRemaining: task.totalTime * remainingPercent,
            adjustedRemaining: adjustedRemainingTime,
            completionTime: completionTime,
            efficiencyFactor: efficiencyFactor
        };
    });
    
    // Send projections back to main thread
    self.postMessage({
        type: 'taskCompletionTimesProjected',
        projections: projections
    });
}

// Analyze system for bottlenecks and performance issues
function analyzeSystemBottlenecks(data) {
    // This function performs a deep analysis of the entire system
    // to identify bottlenecks and performance issues
    
    const analysis = {
        systemUtilization: 0,
        customerFlow: {
            intake: 0,
            throughput: 0,
            turnAway: 0
        },
        bottlenecks: [],
        recommendations: []
    };
    
    // Calculate overall system utilization
    if (data.employees && data.employees.length > 0) {
        let totalUtilization = 0;
        data.employees.forEach(emp => {
            // Calculate utilization based on task assignment
            const isAssigned = emp.currentTaskId !== null;
            totalUtilization += isAssigned ? 1 : 0;
        });
        analysis.systemUtilization = (totalUtilization / data.employees.length) * 100;
    }
    
    // Calculate customer flow metrics
    if (data.customers) {
        analysis.customerFlow.intake = data.customers.length;
        analysis.customerFlow.throughput = Math.floor(data.customers.length * 0.8); // 80% completion rate (placeholder)
        analysis.customerFlow.turnAway = Math.floor(data.customers.length * 0.2); // 20% leaving without service (placeholder)
    }
    
    // Find bottlenecks (reusing previous function)
    analysis.bottlenecks = findBottlenecks(data.employees, data.tasks);
    
    // Generate recommendations based on bottlenecks
    analysis.bottlenecks.forEach(bottleneck => {
        analysis.recommendations.push(bottleneck.recommendation);
    });
    
    // Add overall system recommendations
    if (analysis.systemUtilization > 90) {
        analysis.recommendations.push('The system is operating at near capacity. Consider expanding staff.');
    } else if (analysis.systemUtilization < 50) {
        analysis.recommendations.push('The system may be overstaffed for current demand.');
    }
    
    // Send analysis back to main thread
    self.postMessage({
        type: 'bottleneckAnalysisCompleted',
        analysis: analysis
    });
}