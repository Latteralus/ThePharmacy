// /js/data/employees.js

window.employeesData = [
    {
        id: 'emp001',
        firstName: 'John',
        lastName: 'Doe',
        role: 'Pharmacist',
        salary: 85000,
        skills: {
            compounding: 70,
            dispensing: 85,
            customerService: 75,
            inventoryManagement: 60,
            sales: 50,
        },
        morale: 80, // 0=worst morale, 100=best morale
        mood: "😀", // Mood icon, updated dynamically
        hireDate: "2023-01-15", // Date the employee was hired
        currentTaskId: null     // ID of the task currently assigned to the employee
    },
    {
        id: 'emp002',
        firstName: 'Alice',
        lastName: 'Wong',
        role: 'Lab Technician',
        salary: 60000,
        skills: {
            compounding: 80,
            dispensing: 50,
            customerService: 40,
            inventoryManagement: 85,
            sales: 30,
        },
        morale: 90,
        mood: "😀",
        hireDate: "2023-05-20",
        currentTaskId: null
    },
    {
        id: 'emp003',
        firstName: 'Carlos',
        lastName: 'Garcia',
        role: 'Cashier',  // Changed from 'Sales Rep' to 'Cashier'
        salary: 70000,
        skills: {
            compounding: 20,
            dispensing: 30,
            customerService: 80,
            inventoryManagement: 50,
            sales: 90,
        },
        morale: 60,
        mood: "💤",
        hireDate: "2023-08-10",
        currentTaskId: null
    }
    // ... more employees (optional)
];

window.employees = {
    // Get an employee by ID
    getEmployeeById: function (employeeId) {
        return window.employeesData.find(employee => employee.id === employeeId);
    },

    // Get an employee's full name
    getEmployeeFullName: function (employee) {
        return `${employee.firstName} ${employee.lastName}`;
    },

    // Calculate employee efficiency (based on skills and morale)
    calculateEmployeeEfficiency: function (employee) {
        let skillSum = 0;
        let skillCount = 0;
        for (const skill in employee.skills) {
            skillSum += employee.skills[skill];
            skillCount++;
        }
        const avgSkill = skillSum / skillCount; 
        // We'll treat avgSkill ~ 0..100 as the general skill level
        return avgSkill; // Return 0..100 range if typical
    },

    /**
     * Calculates task completion time with:
     *  - Double time at 0 skill
     *  - Half time at 100 skill
     *  - Morale: +/- 5 min (0 morale => +5, 100 morale => -5)
     */
    calculateTaskCompletionTime: function (baseTime, employeeId, taskType) {
        const employee = this.getEmployeeById(employeeId);
        const skillFactor = this.calculateEmployeeEfficiency(employee); 
        // skillFactor ~ 0..100 typically

        // 1) Convert skillFactor => linear scale from 2.0 (worst) down to 0.5 (best)
        //    If skillFactor=0 => time multiplier=2
        //    If skillFactor=100 => time multiplier=0.5
        const skillPercent = Math.min(skillFactor, 100) / 100; // clamp at 100
        const skillMultiplier = 2 - 1.5 * skillPercent; 
        // e.g. skillPercent=0 => 2 - 0 => 2
        //      skillPercent=1 => 2 - 1.5 => 0.5

        let adjustedTime = baseTime * skillMultiplier;

        // 2) Apply task-specific skill
        //    (You might choose to further reduce or increase adjustedTime based on specific relevant skill)
        if (taskType === "compounding") {
            // Slight additional reduction if compounding is high
            const compSkill = employee.skills.compounding; // ~0..100
            const compPercent = Math.min(compSkill, 100) / 100; 
            // e.g. up to 25% reduction if compSkill=100
            adjustedTime *= (1 - (0.25 * compPercent));
        } 
        else if (taskType === "dispensing") {
            const disp = employee.skills.dispensing;
            const cust = employee.skills.customerService;
            const dispPercent = Math.min(disp + cust, 200) / 200; 
            // e.g. if disp+cust=200 => 1 => up to 25% reduction
            adjustedTime *= (1 - (0.25 * dispPercent));
        }
        // ... similarly handle other task types if desired

        // 3) Adjust for morale: range from +5 (worst morale=0) to -5 (best morale=100)
        const morale = employee.morale; // 0..100
        const moraleDelta = 5 - (morale / 100) * 10; 
        // e.g. morale=0 => +5, morale=100 => -5
        adjustedTime += moraleDelta;

        // 4) Ensure we never go below 1 minute
        if (adjustedTime < 1) adjustedTime = 1;

        // Round to a whole number if you like:
        adjustedTime = Math.round(adjustedTime);

        return adjustedTime;
    },

    // Update employee morale
    updateEmployeeMorale: function (employeeId, moraleChange) {
        const employee = this.getEmployeeById(employeeId);
        if (employee) {
            employee.morale = Math.max(0, Math.min(100, employee.morale + moraleChange));

            // Update mood icon
            if (employee.morale >= 90) {
                employee.mood = "😀";
            } else if (employee.morale >= 70) {
                employee.mood = "😐";
            } else if (employee.morale >= 50) {
                employee.mood = "💤";
            } else if (employee.morale >= 20) {
                employee.mood = "☹️";
            } else {
                employee.mood = "😡";
            }
        }
    },

    // Promote an employee
    promoteEmployee: function (employeeId, newSalary, newRole = null) {
        const employee = this.getEmployeeById(employeeId);
        if (employee) {
            employee.salary = newSalary;
            if (newRole) {
                employee.role = newRole;
            }
            // Increase morale a bit
            this.updateEmployeeMorale(employeeId, 10);
        }
    },

    // Update employee mood on task completion
    updateEmployeeMoodOnTaskCompletion: function (employeeId, taskType) {
        const employee = this.getEmployeeById(employeeId);
        if (employee) {
            if (taskType === 'fillPrescription') {
                this.updateEmployeeMorale(employeeId, 5);
            } else if (taskType === 'customerInteraction') {
                this.updateEmployeeMorale(employeeId, 3);
            } else if (taskType === 'consultation') {
                this.updateEmployeeMorale(employeeId, 2);
            } else if (taskType === 'production') {
                this.updateEmployeeMorale(employeeId, 5);
            }
        }
    },

    // Hire an employee
    hireEmployee: function (role, skillLevel) {
        const hiringFee = 500;
        if (window.financesData.cash >= hiringFee) {
            window.financesData.cash -= hiringFee;
            window.finances.addTransaction({
                date: new Date(window.gameState.currentDate),
                type: 'expense',
                category: 'hiring',
                amount: hiringFee,
                description: `Hiring fee for new ${skillLevel} ${role}`
            });

            // Generate candidates
            let candidates = [];
            for (let i = 0; i < 5; i++) {
                const skills = {};
                if (role === 'Pharmacist') {
                    skills.compounding = (skillLevel === 'Novice' ? 40 : (skillLevel === 'Intermediate' ? 60 : 80));
                    skills.dispensing = (skillLevel === 'Novice' ? 50 : (skillLevel === 'Intermediate' ? 70 : 90));
                    skills.customerService = (skillLevel === 'Novice' ? 40 : (skillLevel === 'Intermediate' ? 60 : 80));
                    skills.inventoryManagement = (skillLevel === 'Novice' ? 30 : (skillLevel === 'Intermediate' ? 50 : 70));
                    skills.sales = (skillLevel === 'Novice' ? 30 : (skillLevel === 'Intermediate' ? 50 : 70));
                } 
                else if (role === 'Lab Technician') {
                    skills.compounding = (skillLevel === 'Novice' ? 50 : (skillLevel === 'Intermediate' ? 70 : 90));
                    skills.dispensing = (skillLevel === 'Novice' ? 30 : (skillLevel === 'Intermediate' ? 50 : 70));
                    skills.customerService = (skillLevel === 'Novice' ? 20 : (skillLevel === 'Intermediate' ? 40 : 60));
                    skills.inventoryManagement = (skillLevel === 'Novice' ? 40 : (skillLevel === 'Intermediate' ? 60 : 80));
                    skills.sales = (skillLevel === 'Novice' ? 10 : (skillLevel === 'Intermediate' ? 20 : 30));
                }
                else if (role === 'Cashier') {
                    // Replaces 'Sales Rep'
                    skills.compounding = (skillLevel === 'Novice' ? 10 : (skillLevel === 'Intermediate' ? 20 : 30));
                    skills.dispensing = (skillLevel === 'Novice' ? 20 : (skillLevel === 'Intermediate' ? 40 : 60));
                    skills.customerService = (skillLevel === 'Novice' ? 50 : (skillLevel === 'Intermediate' ? 70 : 90));
                    skills.inventoryManagement = (skillLevel === 'Novice' ? 30 : (skillLevel === 'Intermediate' ? 50 : 70));
                    skills.sales = (skillLevel === 'Novice' ? 20 : (skillLevel === 'Intermediate' ? 40 : 60));
                }

                candidates.push({
                    id: window.helpers.generateNewEmployeeId(),
                    firstName: window.helpers.generateFirstName(),
                    lastName: window.helpers.generateLastName(),
                    role: role,
                    salary: window.helpers.calculateStartingWage(role, skillLevel),
                    skills: skills,
                    morale: 100,
                    mood: '😀',
                    hireDate: new Date(window.gameState.currentDate),
                    currentTaskId: null
                });
            }

            console.log("Candidates generated:", candidates);
            window.displayEmployeeCandidates(candidates);
        } 
        else {
            alert('Insufficient funds to hire a new employee.');
        }
    },

    // Add an employee to the employeesData array
    hireSelectedEmployee: function(employeeData) {
        window.employeesData.push(employeeData);
        window.updateUI("employees");
        alert(`Successfully hired ${employeeData.firstName} ${employeeData.lastName} as a ${employeeData.skillLevel} ${employeeData.role} with a salary of $${employeeData.salary.toFixed(2)}.`);
    },

    // Fire an employee
    fireEmployee: function (employeeId) {
        const employeeIndex = window.employeesData.findIndex(emp => emp.id === employeeId);
        if (employeeIndex > -1) {
            window.employeesData.splice(employeeIndex, 1);
            window.updateUI("employees");
            console.log(`Employee with ID ${employeeId} has been fired.`);
        } else {
            console.error(`Employee not found with ID: ${employeeId}`);
        }
    },

    // Update employee skills
    updateEmployeeSkills: function(employeeId, newSkills) {
        const employee = this.getEmployeeById(employeeId);
        if (!employee) {
            console.error('Employee not found!');
            return;
        }
        for (const skill in newSkills) {
            if (employee.skills.hasOwnProperty(skill)) {
                employee.skills[skill] = newSkills[skill];
            }
        }
        console.log('Employee skills updated:', employee.firstName, employee.lastName, employee.skills);
    }
};
