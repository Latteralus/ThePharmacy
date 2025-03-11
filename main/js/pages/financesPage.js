// improved-financesPage.js (concise version)

window.renderFinancesPage = function(mainContent) {
    mainContent.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'finances-page-container';

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Financial Dashboard';
    container.appendChild(title);

    // Financial Summary Cards Section
    const summarySection = document.createElement('div');
    summarySection.className = 'financial-summary-section';
    
    // Create summary cards in a grid layout
    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'summary-grid';
    
    // Cash card
    const cashCard = createSummaryCard(
        'Cash on Hand', 
        `$${window.financesData.cash.toFixed(2)}`,
        window.financesData.cash > 5000 ? 'good' : (window.financesData.cash > 1000 ? 'neutral' : 'warning')
    );
    summaryGrid.appendChild(cashCard);
    
    // Today's Revenue card
    const todayRevenue = window.financesData.revenue?.today || 0;
    const revenueCard = createSummaryCard(
        'Today\'s Revenue', 
        `$${todayRevenue.toFixed(2)}`, 
        'neutral'
    );
    summaryGrid.appendChild(revenueCard);
    
    // Today's Profit card
    const todayProfit = window.financesData.profit?.today || 0;
    const profitCard = createSummaryCard(
        'Today\'s Profit', 
        `$${todayProfit.toFixed(2)}`,
        todayProfit > 0 ? 'good' : 'warning'
    );
    summaryGrid.appendChild(profitCard);
    
    // Pending Insurance card
    const pendingInsurance = window.financesData.pendingInsuranceIncome;
    const insuranceCard = createSummaryCard(
        'Pending Insurance', 
        `$${pendingInsurance.toFixed(2)}`,
        'neutral'
    );
    summaryGrid.appendChild(insuranceCard);
    
    summarySection.appendChild(summaryGrid);
    container.appendChild(summarySection);

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    const tabHeaders = ['Overview', 'Daily Report', 'Monthly Report', 'Transactions'];
    const tabContents = [];

    tabHeaders.forEach(headerText => {
        const tabHeader = document.createElement('button');
        tabHeader.className = 'tab';
        tabHeader.textContent = headerText;
        tabs.appendChild(tabHeader);

        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.style.display = 'none';
        container.appendChild(tabContent);
        tabContents.push(tabContent);

        tabHeader.addEventListener('click', () => {
            // Deactivate all tabs and hide content
            const allTabs = document.querySelectorAll('.tab');
            allTabs.forEach(tab => tab.classList.remove('active'));
            tabContents.forEach(content => content.style.display = 'none');

            // Activate clicked tab and show content
            tabHeader.classList.add('active');
            tabContent.style.display = 'block';
        });
    });

    // Default to Overview tab
    tabs.children[0].classList.add('active');
    tabContents[0].style.display = 'block';

    // --- Overview Tab Content ---
    const overviewContent = tabContents[0];
    
    // Revenue/Expense summary section
    const overviewGrid = document.createElement('div');
    overviewGrid.className = 'overview-grid';

    // Monthly breakdown
    const monthlyStatsCard = document.createElement('div');
    monthlyStatsCard.className = 'finance-card';
    monthlyStatsCard.innerHTML = `
        <h3>Monthly Performance</h3>
        <div class="stat-row">
            <div class="stat-label">Monthly Revenue:</div>
            <div class="stat-value">$${(window.financesData.revenue?.thisMonth || 0).toFixed(2)}</div>
        </div>
        <div class="stat-row">
            <div class="stat-label">Monthly Expenses:</div>
            <div class="stat-value">$${(window.financesData.expenses?.thisMonth || 0).toFixed(2)}</div>
        </div>
        <div class="stat-row highlight">
            <div class="stat-label">Monthly Profit:</div>
            <div class="stat-value ${(window.financesData.profit?.thisMonth || 0) >= 0 ? 'positive' : 'negative'}">
                $${(window.financesData.profit?.thisMonth || 0).toFixed(2)}
            </div>
        </div>
    `;
    overviewGrid.appendChild(monthlyStatsCard);
    
    // Pricing controls card
    const pricingCard = document.createElement('div');
    pricingCard.className = 'finance-card';
    pricingCard.innerHTML = `
        <h3>Pricing Controls</h3>
        <div class="control-group">
            <label for="global-markup">Global Markup:</label>
            <div class="input-group">
                <input type="number" id="global-markup" value="${((window.globalMarkup || 1.25) - 1) * 100}" min="0" max="200" step="5">
                <span class="input-suffix">%</span>
            </div>
            <button id="apply-markup-btn" class="action-button">Apply to All Products</button>
        </div>
        <div class="control-group">
            <button id="set-suggested-prices-btn" class="action-button">Set to Suggested Prices</button>
        </div>
    `;
    overviewGrid.appendChild(pricingCard);
    
    overviewContent.appendChild(overviewGrid);
    
    // Revenue vs Expenses Chart
    const chartSection = document.createElement('div');
    chartSection.className = 'chart-section';
    
    const chartTitle = document.createElement('h3');
    chartTitle.textContent = 'Monthly Financial Overview';
    chartSection.appendChild(chartTitle);
    
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'monthly-financials-chart';
    chartSection.appendChild(chartCanvas);
    
    overviewContent.appendChild(chartSection);

    // --- Daily Report Tab Content ---
    const dailyReportContent = tabContents[1];
    
    const dailySalesChartCanvas = document.createElement('canvas');
    dailySalesChartCanvas.id = 'dailySalesChart';
    dailyReportContent.appendChild(dailySalesChartCanvas);
    
    // Today's financial summary
    const todaySummary = document.createElement('div');
    todaySummary.className = 'today-summary';
    todaySummary.innerHTML = `
        <h3>Today's Financial Summary</h3>
        <div class="summary-table">
            <div class="summary-row">
                <div class="summary-category">Revenue:</div>
                <div class="summary-value">$${(window.financesData.revenue?.today || 0).toFixed(2)}</div>
            </div>
            <div class="summary-row">
                <div class="summary-category">Expenses:</div>
                <div class="summary-value">$${(window.financesData.expenses?.today || 0).toFixed(2)}</div>
            </div>
            <div class="summary-row">
                <div class="summary-category">Profit:</div>
                <div class="summary-value ${(window.financesData.profit?.today || 0) >= 0 ? 'positive' : 'negative'}">
                    $${(window.financesData.profit?.today || 0).toFixed(2)}
                </div>
            </div>
            <div class="summary-row">
                <div class="summary-category">Completed Orders:</div>
                <div class="summary-value">${window.financesData.completedOrders || 0}</div>
            </div>
        </div>
    `;
    dailyReportContent.appendChild(todaySummary);

    // --- Monthly Report Tab Content ---
    const monthlyReportContent = tabContents[2];
    
    const monthlySalesChartCanvas = document.createElement('canvas');
    monthlySalesChartCanvas.id = 'monthlySalesChart';
    monthlyReportContent.appendChild(monthlySalesChartCanvas);
    
    // Add monthly statistics
    const monthlyStats = document.createElement('div');
    monthlyStats.className = 'monthly-stats';
    monthlyStats.innerHTML = `
        <h3>Monthly Statistics</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-title">Revenue</div>
                <div class="stat-value">$${(window.financesData.revenue?.thisMonth || 0).toFixed(2)}</div>
                <div class="stat-subtitle">vs Last Month: ${
                    window.financesData.revenue?.lastMonth > 0 ? 
                    ((window.financesData.revenue?.thisMonth / window.financesData.revenue?.lastMonth - 1) * 100).toFixed(1) + '%' :
                    'N/A'
                }</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Expenses</div>
                <div class="stat-value">$${(window.financesData.expenses?.thisMonth || 0).toFixed(2)}</div>
                <div class="stat-subtitle">vs Last Month: ${
                    window.financesData.expenses?.lastMonth > 0 ? 
                    ((window.financesData.expenses?.thisMonth / window.financesData.expenses?.lastMonth - 1) * 100).toFixed(1) + '%' :
                    'N/A'
                }</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Profit</div>
                <div class="stat-value ${(window.financesData.profit?.thisMonth || 0) >= 0 ? 'positive' : 'negative'}">
                    $${(window.financesData.profit?.thisMonth || 0).toFixed(2)}
                </div>
                <div class="stat-subtitle">Profit Margin: ${
                    window.financesData.revenue?.thisMonth > 0 ?
                    ((window.financesData.profit?.thisMonth / window.financesData.revenue?.thisMonth) * 100).toFixed(1) + '%' :
                    '0%'
                }</div>
            </div>
        </div>
    `;
    monthlyReportContent.appendChild(monthlyStats);

    // --- Transactions Tab Content ---
    const transactionsContent = tabContents[3];
    
    // Add a basic filter
    const transactionFilter = document.createElement('div');
    transactionFilter.className = 'transaction-filter';
    transactionFilter.innerHTML = `
        <div class="filter-row">
            <div class="filter-group">
                <label for="transaction-type">Type:</label>
                <select id="transaction-type">
                    <option value="">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                </select>
            </div>
            <div class="filter-group">
                <label for="transaction-search">Search:</label>
                <input type="text" id="transaction-search" placeholder="Search transactions...">
            </div>
            <button id="apply-transaction-filter" class="filter-button">Filter</button>
        </div>
    `;
    transactionsContent.appendChild(transactionFilter);
    
    // Transactions table
    const transactionsTable = document.createElement('table');
    transactionsTable.className = 'transactions-table';
    transactionsTable.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody id="transactions-tbody">
            ${generateTransactionRows(window.financesData.transactions || [], 20)}
        </tbody>
    `;
    transactionsContent.appendChild(transactionsTable);

    container.appendChild(tabs);
    mainContent.appendChild(container);

    // Initialize charts
    initializeCharts();
    
    // Add event listeners for interactive elements
    addEventListeners();

    // ===== Helper Functions =====
    
    // Create a financial summary card
    function createSummaryCard(title, value, status) {
        const card = document.createElement('div');
        card.className = `summary-card ${status}`;
        
        const cardTitle = document.createElement('div');
        cardTitle.className = 'card-title';
        cardTitle.textContent = title;
        
        const cardValue = document.createElement('div');
        cardValue.className = 'card-value';
        cardValue.textContent = value;
        
        card.appendChild(cardTitle);
        card.appendChild(cardValue);
        
        return card;
    }
    
    // Generate transaction table rows
    function generateTransactionRows(transactions, limit = 20) {
        if (!transactions || transactions.length === 0) {
            return '<tr><td colspan="5">No transactions found</td></tr>';
        }
        
        // Sort transactions by date (newest first)
        const sortedTransactions = [...transactions].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        // Take only the first 'limit' transactions
        const limitedTransactions = sortedTransactions.slice(0, limit);
        
        return limitedTransactions.map(t => `
            <tr class="${t.type}">
                <td>${formatDate(t.date)}</td>
                <td>${capitalizeFirstLetter(t.type)}</td>
                <td>${capitalizeFirstLetter(t.category)}</td>
                <td class="${t.type === 'income' ? 'positive' : 'negative'}">
                    $${t.amount.toFixed(2)}
                </td>
                <td>${t.description}</td>
            </tr>
        `).join('');
    }
    
    // Format date
    function formatDate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()} ${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
    }
    
    // Pad with zero
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }
    
    // Capitalize first letter
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    // Initialize chart.js charts
    function initializeCharts() {
        // Monthly Financials Chart
        const monthlyFinancialsCtx = document.getElementById('monthly-financials-chart')?.getContext('2d');
        if (monthlyFinancialsCtx) {
            const chartData = window.finances.getMonthlyFinancialChartData();
            new Chart(monthlyFinancialsCtx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Revenue, Expenses & Profit'
                        }
                    }
                }
            });
        }
        
        // Daily Sales Chart
        const dailySalesCtx = document.getElementById('dailySalesChart')?.getContext('2d');
        if (dailySalesCtx) {
            const dailySalesData = window.finances.getDailySalesChartData();
            new Chart(dailySalesCtx, {
                type: 'line',
                data: dailySalesData,
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Hourly Sales for Today'
                        }
                    }
                }
            });
        }
        
        // Monthly Sales Chart
        const monthlySalesCtx = document.getElementById('monthlySalesChart')?.getContext('2d');
        if (monthlySalesCtx) {
            const monthlySalesData = window.finances.getMonthlySalesChartData();
            new Chart(monthlySalesCtx, {
                type: 'bar',
                data: monthlySalesData,
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Daily Sales for This Month'
                        }
                    }
                }
            });
        }
    }
    
    // Add event listeners
    function addEventListeners() {
        // Apply markup button
        const applyMarkupBtn = document.getElementById('apply-markup-btn');
        if (applyMarkupBtn) {
            applyMarkupBtn.addEventListener('click', function() {
                const markupInput = document.getElementById('global-markup');
                const markup = parseFloat(markupInput.value);
                
                if (!isNaN(markup) && markup >= 0) {
                    window.finances.applyMarkupToAllProducts(markup);
                    alert(`Applied ${markup}% markup to all products.`);
                } else {
                    alert('Please enter a valid markup percentage.');
                }
            });
        }
        
        // Set suggested prices button
        const suggestedPricesBtn = document.getElementById('set-suggested-prices-btn');
        if (suggestedPricesBtn) {
            suggestedPricesBtn.addEventListener('click', function() {
                window.finances.setToSuggestedPrices();
                alert('All product prices set to suggested values.');
            });
        }
        
        // Transaction filter button
        const filterBtn = document.getElementById('apply-transaction-filter');
        if (filterBtn) {
            filterBtn.addEventListener('click', function() {
                const typeFilter = document.getElementById('transaction-type').value;
                const searchFilter = document.getElementById('transaction-search').value.toLowerCase();
                
                // Filter transactions
                let filteredTransactions = window.financesData.transactions || [];
                
                if (typeFilter) {
                    filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
                }
                
                if (searchFilter) {
                    filteredTransactions = filteredTransactions.filter(t => 
                        t.description.toLowerCase().includes(searchFilter) ||
                        t.category.toLowerCase().includes(searchFilter)
                    );
                }
                
                // Update the table
                const tbody = document.getElementById('transactions-tbody');
                if (tbody) {
                    tbody.innerHTML = generateTransactionRows(filteredTransactions, 20);
                }
            });
        }
    }

    // Add CSS styling
    const style = document.createElement('style');
    style.textContent = `
        .finances-page-container {
            padding: 20px;
        }
        
        .financial-summary-section {
            margin-bottom: 20px;
        }
        
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .summary-card {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 15px;
            display: flex;
            flex-direction: column;
        }
        
        .summary-card.good {
            border-left: 4px solid #4caf50;
        }
        
        .summary-card.warning {
            border-left: 4px solid #ff9800;
        }
        
        .summary-card.neutral {
            border-left: 4px solid #2196f3;
        }
        
        .card-title {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .card-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid #ddd;
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
        }
        
        .tab.active {
            border-bottom-color: #1a237e;
            color: #1a237e;
            font-weight: bold;
        }
        
        .tab-content {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 20px;
        }
        
        .overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .finance-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 15px;
        }
        
        .finance-card h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
            font-size: 18px;
        }
        
        .stat-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .stat-row.highlight {
            border-top: 1px solid #eee;
            padding-top: 8px;
            font-weight: bold;
        }
        
        .positive {
            color: #4caf50;
        }
        
        .negative {
            color: #f44336;
        }
        
        .chart-section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 15px;
            margin-bottom: 20px;
            height: 300px;
        }
        
        .chart-section h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
            font-size: 18px;
        }
        
        .control-group {
            margin-bottom: 15px;
        }
        
        .input-group {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .input-group input {
            width: 80px;
            padding: 5px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .input-suffix {
            margin-left: 5px;
        }
        
        .action-button {
            background-color: #1a237e;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .today-summary, .monthly-stats {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 15px;
            margin-top: 20px;
        }
        
        .summary-table {
            width: 100%;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        
        .summary-category {
            font-weight: bold;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .stat-card {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .stat-title {
            color: #666;
            margin-bottom: 8px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .stat-subtitle {
            font-size: 12px;
            color: #666;
        }
        
        .transaction-filter {
            margin-bottom: 15px;
        }
        
        .filter-row {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .filter-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .filter-group select, .filter-group input {
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .filter-button {
            background-color: #1a237e;
            color: white;
            border: none;
            padding: 6px 15px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .transactions-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .transactions-table th, .transactions-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .transactions-table th {
            background-color: #f9f9f9;
            font-weight: bold;
        }
        
        .transactions-table tr.income td:nth-child(4) {
            color: #4caf50;
        }
        
        .transactions-table tr.expense td:nth-child(4) {
            color: #f44336;
        }
    `;
    mainContent.appendChild(style);
};