// optimized-ui.js
// Enhanced UI system with performance improvements for real-time updates

window.ui = (function() {
    // Cache DOM references to minimize DOM lookups
    const domCache = {
        // Time display
        timeEl: null,
        
        // Financial displays
        cashEl: null,
        dailyIncomeEl: null,
        pendingInsuranceEl: null,
        completedOrdersEl: null,
        pendingOrdersEl: null,
        
        // Customer and prescription lists
        customersList: null,
        prescriptionsList: null,
        
        // Last updated values for change detection
        lastValues: {
            time: '',
            cash: -1,
            dailyIncome: -1,
            pendingInsurance: -1,
            completedOrders: -1,
            pendingOrders: -1,
            customerCount: -1,
            prescriptionCount: -1
        }
    };
    
    // Update batching to minimize DOM operations
    let updateQueue = new Set();
    let updateScheduled = false;

    // Initialize UI system and cache DOM elements
    function init() {
        console.log("[ui.js] Initializing UI system");
        
        // Initial cache of DOM elements
        refreshDomCache();
        
        // Add a mutation observer to update the DOM cache when the page changes
        const observer = new MutationObserver((mutations) => {
            let needsRefresh = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    // Important elements that might have been added
                    for (const node of mutation.addedNodes) {
                        if (node.id === 'gameTime' || 
                            node.id === 'currentCash' ||
                            node.id === 'customersList' || 
                            node.id === 'prescriptionsList') {
                            needsRefresh = true;
                            break;
                        }
                        
                        // Check for container divs that might hold our elements
                        if (node.nodeType === Node.ELEMENT_NODE && node.querySelector) {
                            if (node.querySelector('#gameTime, #currentCash, #customersList, #prescriptionsList')) {
                                needsRefresh = true;
                                break;
                            }
                        }
                    }
                }
                
                // If elements were removed, we might need to refresh
                if (mutation.removedNodes.length > 0) {
                    for (const node of mutation.removedNodes) {
                        if (node.id === 'gameTime' || 
                            node.id === 'currentCash' ||
                            node.id === 'customersList' || 
                            node.id === 'prescriptionsList') {
                            needsRefresh = true;
                            break;
                        }
                    }
                }
                
                if (needsRefresh) break;
            }
            
            if (needsRefresh) {
                refreshDomCache();
            }
        });
        
        // Start observing the document
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Refresh the DOM cache when the page changes
    function refreshDomCache() {
        domCache.timeEl = document.getElementById('gameTime');
        domCache.cashEl = document.getElementById('currentCash');
        domCache.dailyIncomeEl = document.getElementById('dailyIncome');
        domCache.pendingInsuranceEl = document.getElementById('pendingInsurance');
        domCache.completedOrdersEl = document.getElementById('ordersCompleted');
        domCache.pendingOrdersEl = document.getElementById('ordersPending');
        domCache.customersList = document.getElementById('customersList');
        domCache.prescriptionsList = document.getElementById('prescriptionsList');
    }
    
    // Schedule a batch update to minimize DOM operations
    function scheduleUpdate(updateType) {
        updateQueue.add(updateType);
        
        if (!updateScheduled) {
            updateScheduled = true;
            requestAnimationFrame(processUpdates);
        }
    }
    
    // Process all queued updates in a single animation frame
    function processUpdates() {
        // Process each update type in the queue
        updateQueue.forEach(updateType => {
            switch (updateType) {
                case 'time':
                    updateTimeDisplay();
                    break;
                case 'finances':
                    updateFinancialDisplays();
                    break;
                case 'customers':
                    updateCustomersList();
                    break;
                case 'prescriptions':
                    updatePrescriptionsList();
                    break;
                case 'operations':
                    if (window.renderOperationsPage && window.currentPage === 'operations') {
                        const mainContent = document.querySelector('.main-content');
                        if (mainContent) {
                            window.renderOperationsPage(mainContent);
                        }
                    }
                    break;
                case 'employees':
                    if (window.renderEmployees) {
                        window.renderEmployees();
                    }
                    break;
            }
        });
        
        // Clear the update queue and reset flag
        updateQueue.clear();
        updateScheduled = false;
    }
    
    // Update time display with efficient DOM operations
    function updateTimeDisplay() {
        if (!domCache.timeEl) return;
        
        const formatted = formatDateTime(window.gameState.currentDate);
        if (domCache.lastValues.time !== formatted) {
            domCache.timeEl.textContent = formatted;
            domCache.lastValues.time = formatted;
        }
    }
    
    // Update all financial displays with change detection
    function updateFinancialDisplays() {
        // Update cash display
        if (domCache.cashEl && window.financesData) {
            const cash = window.financesData.cash;
            if (domCache.lastValues.cash !== cash) {
                domCache.cashEl.textContent = `Cash: $${cash.toFixed(2)}`;
                domCache.lastValues.cash = cash;
            }
        }
        
        // Update daily income display
        if (domCache.dailyIncomeEl && window.financesData) {
            const dailyIncome = window.financesData.dailyIncome;
            if (domCache.lastValues.dailyIncome !== dailyIncome) {
                domCache.dailyIncomeEl.textContent = `Daily Income: $${dailyIncome.toFixed(2)}`;
                domCache.lastValues.dailyIncome = dailyIncome;
            }
        }
        
        // Update pending insurance display
        if (domCache.pendingInsuranceEl && window.financesData) {
            const pendingInsurance = window.financesData.pendingInsuranceIncome;
            if (domCache.lastValues.pendingInsurance !== pendingInsurance) {
                domCache.pendingInsuranceEl.textContent = `Pending Insurance: $${pendingInsurance.toFixed(2)}`;
                domCache.lastValues.pendingInsurance = pendingInsurance;
            }
        }
        
        // Update completed orders display
        if (domCache.completedOrdersEl && window.financesData) {
            const completedOrders = window.financesData.completedOrders;
            if (domCache.lastValues.completedOrders !== completedOrders) {
                domCache.completedOrdersEl.textContent = `Completed Orders: ${completedOrders}`;
                domCache.lastValues.completedOrders = completedOrders;
            }
        }
        
        // Update pending orders display
        if (domCache.pendingOrdersEl && window.financesData) {
            const pendingOrders = window.financesData.pendingOrders;
            if (domCache.lastValues.pendingOrders !== pendingOrders) {
                domCache.pendingOrdersEl.textContent = `Pending Orders: ${pendingOrders}`;
                domCache.lastValues.pendingOrders = pendingOrders;
            }
        }
    }
    
    // Update customers list with efficient rendering
    function updateCustomersList() {
        if (!domCache.customersList) return;
        if (!window.customers || !window.customers.activeCustomers) return;
        
        const customers = window.customers.activeCustomers;
        
        // Check if we need to update
        if (domCache.lastValues.customerCount === customers.length) {
            // Only update content if customers have changed
            // This is a simple heuristic - for more accuracy we could hash 
            // customer statuses, but this is good enough for most cases
            const firstCustomer = customers[0] || {};
            if (domCache.lastValues.lastCustomerStatus === firstCustomer.status) {
                return; // Skip update if nothing changed
            }
        }
        
        // Update tracking values
        domCache.lastValues.customerCount = customers.length;
        domCache.lastValues.lastCustomerStatus = customers[0]?.status || null;
        
        // Clear existing list
        domCache.customersList.innerHTML = '';

        if (customers.length === 0) {
            const noCustomersMessage = document.createElement('p');
            noCustomersMessage.textContent = 'No customers currently.';
            domCache.customersList.appendChild(noCustomersMessage);
            return;
        }

        // Use a document fragment for efficient DOM operations
        const fragment = document.createDocumentFragment();

        customers.forEach(customer => {
            const customerItem = document.createElement('div');
            customerItem.className = 'customer-item';
            customerItem.style.border = '1px solid #ddd';
            customerItem.style.borderRadius = '4px';
            customerItem.style.padding = '0.5rem';
            customerItem.style.marginBottom = '0.5rem';
            customerItem.style.backgroundColor = '#f9f9f9';

            const customerName = document.createElement('strong');
            customerName.textContent = `${customer.firstName} ${customer.lastName}`;
            customerItem.appendChild(customerName);

            // Make customer status more prominent
            const customerStatus = document.createElement('p');
            customerStatus.style.marginTop = '0.25rem';
            customerStatus.style.fontSize = '1.1em';
            customerStatus.textContent = `Status: ${customer.status}`;
            if (customer.status === 'awaitingConsultation') {
                customerStatus.style.color = 'orange';
            } else if (customer.status === 'readyForCheckout') {
                customerStatus.style.color = 'blue';
            } else if (customer.status === 'completed') {
                customerStatus.style.color = 'green';
            }
            customerItem.appendChild(customerStatus);

            // Display arrival time
            const arrivalTime = document.createElement('p');
            arrivalTime.textContent = `Arrived at: ${formatDateTime(new Date(customer.arrivedAt))}`;
            arrivalTime.style.fontSize = '0.9em';
            arrivalTime.style.color = 'grey';
            customerItem.appendChild(arrivalTime);

            fragment.appendChild(customerItem);
        });

        domCache.customersList.appendChild(fragment);
    }
    
    // Update prescriptions list with efficient rendering
    function updatePrescriptionsList() {
        if (!domCache.prescriptionsList) return;
        if (!window.prescriptions || !window.prescriptions.activePrescriptions) return;
        
        const prescriptions = window.prescriptions.activePrescriptions;
        
        // Check if we need to update
        if (domCache.lastValues.prescriptionCount === prescriptions.length) {
            // Only update content if prescriptions have changed
            // This is a simple heuristic - for more accuracy we could track 
            // individual prescription statuses, but this is good enough for most cases
            return; // Skip update if count hasn't changed
        }
        
        // Update tracking values
        domCache.lastValues.prescriptionCount = prescriptions.length;
        
        // Clear existing list
        domCache.prescriptionsList.innerHTML = '';

        if (prescriptions.length === 0) {
            const noPrescriptionsMessage = document.createElement('p');
            noPrescriptionsMessage.textContent = 'No active prescriptions.';
            domCache.prescriptionsList.appendChild(noPrescriptionsMessage);
            return;
        }

        // Use a document fragment for efficient DOM operations
        const fragment = document.createDocumentFragment();

        prescriptions.forEach(prescription => {
            const prescriptionItem = document.createElement('div');
            prescriptionItem.className = 'prescription-item';
            prescriptionItem.style.border = '1px solid #ddd';
            prescriptionItem.style.borderRadius = '4px';
            prescriptionItem.style.padding = '0.5rem';
            prescriptionItem.style.marginBottom = '0.5rem';
            prescriptionItem.style.backgroundColor = '#f9f9f9';

            // Prescription Details
            const prescriptionId = document.createElement('strong');
            prescriptionId.textContent = `ID: ${prescription.id}`;
            prescriptionItem.appendChild(prescriptionId);

            const productName = document.createElement('p');
            productName.textContent = `Product: ${prescription.productName}`;
            prescriptionItem.appendChild(productName);

            const status = document.createElement('p');
            status.textContent = `Status: ${prescription.status}`;
            if (prescription.status === 'pending') {
                status.style.color = 'orange';
            } else if (prescription.status === 'filled') {
                status.style.color = 'blue';
            }
            prescriptionItem.appendChild(status);

            // Initially hide detailed information
            const detailsDiv = document.createElement('div');
            detailsDiv.style.display = 'none';

            const dosage = document.createElement('p');
            dosage.textContent = `Dosage: ${prescription.dosage}`;
            detailsDiv.appendChild(dosage);

            const frequency = document.createElement('p');
            frequency.textContent = `Frequency: ${prescription.frequency}`;
            detailsDiv.appendChild(frequency);

            const doctorName = document.createElement('p');
            doctorName.textContent = `Doctor: ${prescription.doctorName}`;
            detailsDiv.appendChild(doctorName);

            prescriptionItem.appendChild(detailsDiv);

            // Add a button to toggle details
            const toggleButton = document.createElement('button');
            toggleButton.textContent = 'Show Details';
            toggleButton.style.marginTop = '0.5rem';
            toggleButton.addEventListener('click', () => {
                detailsDiv.style.display = detailsDiv.style.display === 'none' ? 'block' : 'none';
                toggleButton.textContent = detailsDiv.style.display === 'none' ? 'Show Details' : 'Hide Details';
            });
            prescriptionItem.appendChild(toggleButton);

            fragment.appendChild(prescriptionItem);
        });

        domCache.prescriptionsList.appendChild(fragment);
    }
    
    // --- Helper functions for formatting ---
    function formatDate(dateObj) {
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const excisedYear = dateObj.getFullYear();
        return `${mm}/${dd}/${excisedYear}`;
    }

    function formatTime(dateObj) {
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function formatDateTime(dateObj) {
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const excisedYear = dateObj.getFullYear();
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        return `[${mm}/${dd}/${excisedYear}] [${hours}:${minutes}]`;
    }
    
    // --- Public API ---
    return {
        // Initialize the UI system
        init,
        
        // Helper formatting functions
        formatDate,
        formatTime,
        formatDateTime,
        
        // Public update methods that use the batching system
        updateTime: function() {
            scheduleUpdate('time');
        },
        
        updateFinances: function() {
            scheduleUpdate('finances');
        },
        
        updateCustomers: function() {
            scheduleUpdate('customers');
        },
        
        updatePrescriptions: function() {
            scheduleUpdate('prescriptions');
        },
        
        // Updated window.updateUI function with batching
        updateUI: function(page = "") {
            if (page === "finances") {
                scheduleUpdate('finances');
            }
            
            if (page === "customers") {
                scheduleUpdate('customers');
            }
            
            if (page === "prescriptions") {
                scheduleUpdate('prescriptions');
            }
            
            if (page === "time") {
                scheduleUpdate('time');
            }
            
            if (page === "operations") {
                scheduleUpdate('operations');
            }
            
            if (page === "employees") {
                scheduleUpdate('employees');
            }
        },
        
        // Force an immediate update (for critical changes)
        forceUpdate: function(page) {
            switch (page) {
                case 'time':
                    updateTimeDisplay();
                    break;
                case 'finances':
                    updateFinancialDisplays();
                    break;
                case 'customers':
                    updateCustomersList();
                    break;
                case 'prescriptions':
                    updatePrescriptionsList();
                    break;
            }
        },
        
        // Re-cache DOM elements (call when page structure changes)
        refreshCache: refreshDomCache
    };
})();

// Initialize the UI system when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.ui.init();
});

// Listen for page changes to refresh the DOM cache
document.addEventListener('pageChanged', function() {
    // Wait a moment for the DOM to update
    setTimeout(() => window.ui.refreshCache(), 100);
});