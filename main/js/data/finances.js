// improved-finances.js

// Globally configurable markup for suggested prices (default 35%)
window.globalMarkup = 1.35;

window.financesData = {
    cash: 10000,
    dailyIncome: 0,
    pendingInsuranceIncome: 0,
    pendingOrders: 0,
    completedOrders: 0,
    overhead: 500, // e.g., daily overhead (rent, utilities)
    transactions: [], // Transaction history
    revenue: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        total: 0
    },
    expenses: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        total: 0
    },
    profit: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        lastMonth: 0,
        total: 0
    },
    insuranceReimbursements: {
        pending: 0,
        received: 0,
        rejected: 0
    },
    expenseCategories: {
        wages: 0,
        materials: 0,
        overhead: 0,
        equipment: 0,
        research: 0,
        other: 0
    },
    revenueCategories: {
        prescriptions: 0,
        copays: 0,
        insurance: 0,
        other: 0
    },
    targetDailyRevenue: 1000, // Default target
    targetMonthlyRevenue: 30000 // Default target
};

window.finances = {
    // Apply daily costs (called at end of day)
    applyDailyCosts: function() {
        console.log("[finances.js] Applying daily costs...");
        
        // 1) Sum employee daily wages
        let totalWages = 0;
        window.employeesData.forEach(emp => {
            const dailyPay = emp.salary / 365;
            totalWages += dailyPay;

            // Add wage transaction
            window.finances.addTransaction({
                date: new Date(window.gameState.currentDate),
                type: 'expense',
                category: 'wages',
                amount: dailyPay,
                description: `Wage for ${emp.firstName} ${emp.lastName} (${emp.role})`,
            });
        });

        // Update expense category
        window.financesData.expenseCategories.wages += totalWages;

        // 2) Overhead
        const overheadCost = window.financesData.overhead;

        // Update expense category
        window.financesData.expenseCategories.overhead += overheadCost;

        // Add overhead transaction
        window.finances.addTransaction({
            date: new Date(window.gameState.currentDate),
            type: 'expense',
            category: 'overhead',
            amount: overheadCost,
            description: 'Daily overhead costs',
        });

        // 3) Subtract from cash
        const totalCost = totalWages + overheadCost;
        window.financesData.cash -= totalCost;

        // 4) Update expense tracking
        window.financesData.expenses.today += totalCost;
        window.financesData.expenses.thisWeek += totalCost;
        window.financesData.expenses.thisMonth += totalCost;
        window.financesData.expenses.total += totalCost;

        // 5) Process insurance claims at the end of the day
        this.processInsuranceClaims();

        // 6) Calculate profit metrics
        this.updateProfitMetrics();

        // 7) Update UI
        window.updateUI("finances");
        
        console.log(`[finances.js] Daily costs applied: Wages $${totalWages.toFixed(2)}, Overhead $${overheadCost.toFixed(2)}`);
    },

    // Call this whenever an order is completed
    completePrescription: function(customerId, prescriptionId) {
        const customer = window.customers.activeCustomers.find(c => c.id === customerId);
        const prescription = window.prescriptions.getPrescription(prescriptionId);

        if (!customer) {
            console.error(`[finances.js] Customer not found for ID: ${customerId}`);
            return;
        }

        if (!prescription) {
            console.error(`[finances.js] Prescription not found for ID: ${prescriptionId}`);
            return;
        }

        const product = window.productsData.find(p => p.id === prescription.productId);
        if (!product) {
            console.error(`[finances.js] Product not found for ID: ${prescription.productId}`);
            return;
        }

        const price = product.price * prescription.dosage;
        const copayPercentage = customer.insurance.copayPercentage;
        const copay = price * (copayPercentage / 100);

        // Deduct copay from customer
        window.financesData.cash += copay;
        window.financesData.dailyIncome += copay;
        
        // Update revenue categories
        window.financesData.revenueCategories.copays += copay;
        window.financesData.revenueCategories.prescriptions += price;

        // Update revenue metrics
        window.financesData.revenue.today += copay;
        window.financesData.revenue.thisWeek += copay;
        window.financesData.revenue.thisMonth += copay;
        window.financesData.revenue.total += copay;

        // Add copay transaction
        window.finances.addTransaction({
            date: new Date(window.gameState.currentDate),
            type: 'income',
            category: 'copay',
            amount: copay,
            description: `Copay for ${prescription.productName} (Prescription ID: ${prescription.id})`,
            customerId: customerId,
            prescriptionId: prescription.id
        });

        // Add insurance claim
        window.insuranceClaims.addClaim(customerId, prescriptionId, price, copay);

        // Update pending insurance income
        window.financesData.pendingInsuranceIncome += (price - copay);
        window.financesData.insuranceReimbursements.pending += (price - copay);

        // Add insurance income transaction (pending)
        window.finances.addTransaction({
            date: new Date(window.gameState.currentDate),
            type: 'income',
            category: 'insurance',
            amount: price - copay,
            description: `Pending insurance claim for ${prescription.productName} (Prescription ID: ${prescription.id})`,
            customerId: customerId,
            prescriptionId: prescription.id,
            pending: true
        });

        // Update prescription status to completed
        window.prescriptions.updatePrescriptionStatus(prescriptionId, 'completed');

        window.financesData.completedOrders++;

        console.log(`[finances.js] Order completed for customer ${customerId}. Copay: $${copay.toFixed(2)}, Price: $${price.toFixed(2)}`);

        // Update UI
        window.updateUI("finances");
        
        // Calculate new profit metrics
        this.updateProfitMetrics();
        
        return { copay, price };
    },

    // Process insurance claims and update finances
    processInsuranceClaims: function() {
        let totalClaimAmount = window.insuranceClaims.processAllClaims();
        
        // When claims are processed, update revenue metrics
        if (totalClaimAmount > 0) {
            window.financesData.revenue.today += totalClaimAmount;
            window.financesData.revenue.thisWeek += totalClaimAmount;
            window.financesData.revenue.thisMonth += totalClaimAmount;
            window.financesData.revenue.total += totalClaimAmount;
            
            // Update insurance categories
            window.financesData.revenueCategories.insurance += totalClaimAmount;
            window.financesData.insuranceReimbursements.received += totalClaimAmount;
            window.financesData.insuranceReimbursements.pending -= totalClaimAmount;
            
            console.log(`[finances.js] Processed insurance claims: $${totalClaimAmount.toFixed(2)}`);
        }

        // Update pendingInsuranceIncome (all claims have been processed)
        window.financesData.pendingInsuranceIncome = 0;

        // Update UI
        window.updateUI("finances");
    },

    // Add generic income (e.g., from a cash sale without insurance)
    addIncome: function(amount, category = 'other', description = 'Other income') {
        window.financesData.cash += amount;
        window.financesData.dailyIncome += amount;
        
        // Update revenue metrics
        window.financesData.revenue.today += amount;
        window.financesData.revenue.thisWeek += amount;
        window.financesData.revenue.thisMonth += amount;
        window.financesData.revenue.total += amount;
        
        // Update revenue category
        if (window.financesData.revenueCategories[category] !== undefined) {
            window.financesData.revenueCategories[category] += amount;
        } else {
            window.financesData.revenueCategories.other += amount;
        }

        // Add income transaction
        window.finances.addTransaction({
            date: new Date(window.gameState.currentDate),
            type: 'income',
            category: category,
            amount: amount,
            description: description
        });
        
        // Update profit metrics
        this.updateProfitMetrics();

        // Update UI
        window.updateUI("finances");
        
        console.log(`[finances.js] Added income: $${amount.toFixed(2)} (${category})`);
    },

    // Add an expense
    addExpense: function(amount, category = 'other', description = 'Other expense') {
        if (window.financesData.cash < amount) {
            console.error(`[finances.js] Insufficient funds for expense: $${amount.toFixed(2)}`);
            return false;
        }
        
        window.financesData.cash -= amount;
        
        // Update expense metrics
        window.financesData.expenses.today += amount;
        window.financesData.expenses.thisWeek += amount;
        window.financesData.expenses.thisMonth += amount;
        window.financesData.expenses.total += amount;
        
        // Update expense category
        if (window.financesData.expenseCategories[category] !== undefined) {
            window.financesData.expenseCategories[category] += amount;
        } else {
            window.financesData.expenseCategories.other += amount;
        }

        // Add expense transaction
        window.finances.addTransaction({
            date: new Date(window.gameState.currentDate),
            type: 'expense',
            category: category,
            amount: amount,
            description: description
        });
        
        // Update profit metrics
        this.updateProfitMetrics();

        // Update UI
        window.updateUI("finances");
        
        console.log(`[finances.js] Added expense: $${amount.toFixed(2)} (${category})`);
        return true;
    },

    // Add a new transaction to the transactions array
    addTransaction: function(transaction) {
        // Make sure the transaction has a unique ID
        if (!transaction.id) {
            transaction.id = `trans-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }
        
        // Add the transaction
        window.financesData.transactions.push(transaction);
        
        // Keep transactions sorted by date (newest first)
        window.financesData.transactions.sort((a, b) => b.date - a.date);
        
        // Limit transaction history to prevent performance issues (keep last 1000)
        if (window.financesData.transactions.length > 1000) {
            window.financesData.transactions = window.financesData.transactions.slice(0, 1000);
        }
    },

    // Update a product's price (manually or by the user)
    updateProductPrice: function(productId, newPrice) {
        const product = window.productsData.find(p => p.id === productId);
        if (!product) {
            console.error(`[finances.js] Product not found: ${productId}`);
            return;
        }

        const oldPrice = product.price;
        product.price = newPrice;
        console.log(`[finances.js] Price for ${product.name} updated: $${oldPrice.toFixed(2)} -> $${newPrice.toFixed(2)}`);

        // Optionally re-render finances or inventory UI
        window.updateUI("finances");
        window.updateUI("inventory");
    },

    // Set all product prices to their suggested price
    setToSuggestedPrices: function() {
        let changeCount = 0;
        window.productsData.forEach(product => {
            const cost = window.calculateProductCost(product.id);
            const suggestedPrice = cost * window.globalMarkup;
            
            if (product.price !== suggestedPrice) {
                product.price = suggestedPrice;
                changeCount++;
            }
        });
        
        console.log(`[finances.js] Set ${changeCount} product prices to suggested markup (${(window.globalMarkup * 100 - 100).toFixed(0)}%)`);
        window.updateUI("inventory");
    },

    // Apply a markup to all product prices
    applyMarkupToAllProducts: function(markupPercentage) {
        const markupFactor = 1 + (markupPercentage / 100);

        window.productsData.forEach(product => {
            const cost = window.calculateProductCost(product.id);
            const newPrice = cost * markupFactor;
            product.price = newPrice;
        });
        
        // Update global markup for future reference
        window.globalMarkup = markupFactor;

        console.log(`[finances.js] Applied ${markupPercentage.toFixed(0)}% markup to all product prices.`);
        window.updateUI("inventory");
    },
    
    // Calculate and update profit metrics
    updateProfitMetrics: function() {
        // Today's profit
        window.financesData.profit.today = 
            window.financesData.revenue.today - window.financesData.expenses.today;
        
        // This week's profit
        window.financesData.profit.thisWeek = 
            window.financesData.revenue.thisWeek - window.financesData.expenses.thisWeek;
        
        // This month's profit
        window.financesData.profit.thisMonth = 
            window.financesData.revenue.thisMonth - window.financesData.expenses.thisMonth;
        
        // Total profit
        window.financesData.profit.total = 
            window.financesData.revenue.total - window.financesData.expenses.total;
    },
    
    // Reset daily stats (called at start of day)
    resetDailyStats: function() {
        window.financesData.dailyIncome = 0;
        window.financesData.revenue.today = 0;
        window.financesData.expenses.today = 0;
        window.financesData.profit.today = 0;
    },
    
    // Start a new week (reset weekly stats)
    startNewWeek: function() {
        window.financesData.revenue.thisWeek = 0;
        window.financesData.expenses.thisWeek = 0;
        window.financesData.profit.thisWeek = 0;
    },
    
    // Start a new month (move this month to last month, reset this month)
    startNewMonth: function() {
        window.financesData.revenue.lastMonth = window.financesData.revenue.thisMonth;
        window.financesData.expenses.lastMonth = window.financesData.expenses.thisMonth;
        window.financesData.profit.lastMonth = window.financesData.profit.thisMonth;
        
        window.financesData.revenue.thisMonth = 0;
        window.financesData.expenses.thisMonth = 0;
        window.financesData.profit.thisMonth = 0;
    },

    // --- Chart Data Functions ---

    // Get chart data for daily sales (hourly breakdown for the current day)
    getDailySalesChartData: function() {
        const today = new Date(window.gameState.currentDate);
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const hourlySales = {};

        // Initialize hourly sales to 0
        for (let i = 0; i < 24; i++) {
            hourlySales[i] = 0;
        }

        // Aggregate sales by hour
        window.financesData.transactions
            .filter(t => t.type === 'income' && t.date >= startOfDay && t.date <= endOfDay)
            .forEach(t => {
                const hour = t.date.getHours();
                hourlySales[hour] += t.amount;
            });

        return {
            labels: Object.keys(hourlySales).map(hour => `${hour}:00`),
            datasets: [{
                label: 'Hourly Sales',
                data: Object.values(hourlySales),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        };
    },

    // Get chart data for monthly sales (daily breakdown for the current month)
    getMonthlySalesChartData: function() {
        const today = new Date(window.gameState.currentDate);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        const dailySales = {};

        // Initialize daily sales to 0 for each day of the month
        const daysInMonth = endOfMonth.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dailySales[i] = 0;
        }

        // Aggregate sales by day
        window.financesData.transactions
            .filter(t => t.type === 'income' && t.date >= startOfMonth && t.date <= endOfMonth)
            .forEach(t => {
                const day = t.date.getDate();
                dailySales[day] += t.amount;
            });

        return {
            labels: Object.keys(dailySales).map(day => `Day ${day}`),
            datasets: [{
                label: 'Daily Sales',
                data: Object.values(dailySales),
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        };
    },

    // Get chart data for monthly revenue/expenses/profit
    getMonthlyFinancialChartData: function() {
        const today = new Date(window.gameState.currentDate);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        const dailyRevenue = {};
        const dailyExpenses = {};
        const dailyProfit = {};

        // Initialize daily values to 0 for each day of the month
        const daysInMonth = endOfMonth.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            dailyRevenue[i] = 0;
            dailyExpenses[i] = 0;
            dailyProfit[i] = 0;
        }

        // Aggregate revenue by day
        window.financesData.transactions
            .filter(t => t.type === 'income' && t.date >= startOfMonth && t.date <= endOfMonth)
            .forEach(t => {
                const day = t.date.getDate();
                dailyRevenue[day] += t.amount;
            });

        // Aggregate expenses by day
        window.financesData.transactions
            .filter(t => t.type === 'expense' && t.date >= startOfMonth && t.date <= endOfMonth)
            .forEach(t => {
                const day = t.date.getDate();
                dailyExpenses[day] += t.amount;
            });

        // Calculate daily profit
        for (let i = 1; i <= daysInMonth; i++) {
            dailyProfit[i] = dailyRevenue[i] - dailyExpenses[i];
        }

        return {
            labels: Object.keys(dailyRevenue).map(day => `Day ${day}`),
            datasets: [
                {
                    label: 'Revenue',
                    data: Object.values(dailyRevenue),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Expenses',
                    data: Object.values(dailyExpenses),
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Profit',
                    data: Object.values(dailyProfit),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }
            ]
        };
    },

    // Get chart data for expense categories (pie chart)
    getExpenseCategoriesChartData: function() {
        const categories = Object.keys(window.financesData.expenseCategories);
        const values = Object.values(window.financesData.expenseCategories);

        // Generate colors for each category
        const backgroundColors = [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
        ];
        
        const borderColors = [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
        ];

        return {
            labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)), // Capitalize first letter
            datasets: [{
                label: 'Expense Categories',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        };
    },

    // Get chart data for revenue categories (pie chart)
    getRevenueCategoriesChartData: function() {
        const categories = Object.keys(window.financesData.revenueCategories);
        const values = Object.values(window.financesData.revenueCategories);

        // Generate colors for each category
        const backgroundColors = [
            'rgba(75, 192, 192, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)'
        ];
        
        const borderColors = [
            'rgba(75, 192, 192, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
        ];

        return {
            labels: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)), // Capitalize first letter
            datasets: [{
                label: 'Revenue Categories',
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        };
    },

    // Get total sales for a specific date
    getDailySales: function(date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        return window.financesData.transactions
            .filter(t => t.type === 'income' && t.date >= startOfDay && t.date <= endOfDay)
            .reduce((total, t) => total + t.amount, 0);
    },

    // Get total profit/loss for a specific date
    getDailyProfitLoss: function(date) {
        const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const income = window.financesData.transactions
            .filter(t => t.type === 'income' && t.date >= startOfDay && t.date <= endOfDay)
            .reduce((total, t) => total + t.amount, 0);

        const expenses = window.financesData.transactions
            .filter(t => t.type === 'expense' && t.date >= startOfDay && t.date <= endOfDay)
            .reduce((total, t) => total + t.amount, 0);

        return income - expenses;
    },
    
    // Get transactions filtered by criteria
    getFilteredTransactions: function(options = {}) {
        let filtered = [...window.financesData.transactions];
        
        // Filter by date range
        if (options.startDate) {
            filtered = filtered.filter(t => t.date >= options.startDate);
        }
        
        if (options.endDate) {
            filtered = filtered.filter(t => t.date <= options.endDate);
        }
        
        // Filter by type
        if (options.type) {
            filtered = filtered.filter(t => t.type === options.type);
        }
        
        // Filter by category
        if (options.category) {
            filtered = filtered.filter(t => t.category === options.category);
        }
        
        // Filter by minimum amount
        if (options.minAmount) {
            filtered = filtered.filter(t => t.amount >= options.minAmount);
        }
        
        // Filter by maximum amount
        if (options.maxAmount) {
            filtered = filtered.filter(t => t.amount <= options.maxAmount);
        }
        
        // Filter by search term (checks description)
        if (options.searchTerm) {
            const term = options.searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.description.toLowerCase().includes(term) ||
                (t.customerId && t.customerId.toLowerCase().includes(term)) ||
                (t.prescriptionId && t.prescriptionId.toLowerCase().includes(term))
            );
        }
        
        return filtered;
    },
    
    // Get financial summary object
    getFinancialSummary: function() {
        return {
            cash: window.financesData.cash,
            pendingInsurance: window.financesData.pendingInsuranceIncome,
            revenue: window.financesData.revenue,
            expenses: window.financesData.expenses,
            profit: window.financesData.profit,
            revenueCategories: window.financesData.revenueCategories,
            expenseCategories: window.financesData.expenseCategories,
            targetDailyRevenue: window.financesData.targetDailyRevenue,
            targetMonthlyRevenue: window.financesData.targetMonthlyRevenue,
            completedOrders: window.financesData.completedOrders
        };
    }
};

// Initialize financial system
(function() {
    console.log("[finances.js] Initializing financial system...");
    
    // Set all product prices on startup
    window.finances.setToSuggestedPrices();
})();