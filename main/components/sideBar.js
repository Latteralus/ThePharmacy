// refined-sidebar.js with Settings page added

window.renderSidebar = function renderSidebar() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    // Navigation section
    const navLinks = document.createElement('nav');
    navLinks.className = 'nav-links';

    // Group navigation items by category
    const navCategories = {
        operations: [
            { label: 'Operations', pageName: 'operations', icon: '🏥' },
            { label: 'Customers', pageName: 'customers', icon: '👥' },
            { label: 'Orders', pageName: 'orders', icon: '📋' }
        ],
        inventory: [
            { label: 'Inventory', pageName: 'inventory', icon: '📦' },
            { label: 'Marketplace', pageName: 'marketplace', icon: '🛒' },
            { label: 'Equipment', pageName: 'equipment', icon: '⚗️' }
        ],
        management: [
            { label: 'Employees', pageName: 'employees', icon: '👨‍⚕️' },
            { label: 'Finances', pageName: 'finances', icon: '💰' }
        ],
        development: [
            { label: 'Research', pageName: 'research', icon: '🔬' },
            { label: 'Marketing', pageName: 'marketing', icon: '📢' },
            { label: 'Statistics', pageName: 'statistics', icon: '📊' }
        ],
        system: [
            { label: 'Settings', pageName: 'settings', icon: '⚙️' }
        ]
    };

    // Function to create nav items with icons
    function createNavItem(item) {
        const { label, pageName, icon } = item;
        
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.id = `${pageName}-nav-item`; // Add ID for easy access
        navItem.onclick = () => window.showPage(pageName);
        
        // Add icon
        if (icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'nav-icon';
            iconSpan.innerHTML = icon;
            navItem.appendChild(iconSpan);
        }
        
        // Add label
        const labelSpan = document.createElement('span');
        labelSpan.className = 'nav-label';
        labelSpan.textContent = label;
        navItem.appendChild(labelSpan);
        
        return navItem;
    }

    // Add category headers and items
    Object.entries(navCategories).forEach(([category, items], index) => {
        // Add category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'nav-category';
        categoryHeader.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        navLinks.appendChild(categoryHeader);
        
        // Add category items
        items.forEach(item => {
            navLinks.appendChild(createNavItem(item));
        });
    });

    sidebar.appendChild(navLinks);

    // Add reputation display at the bottom
    const reputationInfo = document.createElement('div');
    reputationInfo.className = 'reputation-info';
    reputationInfo.innerHTML = `
        <span class="info-label">Reputation:</span>
        <span class="info-value" id="sidebar-reputation">${window.brandReputation?.reputationScore || 0}</span>
    `;
    sidebar.appendChild(reputationInfo);
    
    // Add "Logout" Button at the very bottom
    const logoutButton = document.createElement('div');
    logoutButton.className = 'nav-item logout-button';
    
    const logoutIcon = document.createElement('span');
    logoutIcon.className = 'nav-icon';
    logoutIcon.innerHTML = '🚪';
    logoutButton.appendChild(logoutIcon);
    
    const logoutLabel = document.createElement('span');
    logoutLabel.className = 'nav-label';
    logoutLabel.textContent = 'Logout';
    logoutButton.appendChild(logoutLabel);
    
    logoutButton.onclick = () => {
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = '/logout';
        }
    };
    
    sidebar.appendChild(logoutButton);

    // Add CSS for the refined sidebar
    const style = document.createElement('style');
    style.textContent = `
        .sidebar {
            display: flex;
            flex-direction: column;
            background-color: var(--primary);
            color: white;
            height: 100%;
            overflow-y: auto;
            padding-top: 0.5rem;
        }
        
        .nav-links {
            flex: 1;
            display: flex;
            flex-direction: column;
            margin-bottom: 0.5rem;
        }
        
        .nav-category {
            padding: 0.5rem 1rem 0.25rem;
            margin-top: 0.5rem;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: rgba(255, 255, 255, 0.6);
            white-space: nowrap;
        }
        
        .nav-item {
            display: flex;
            align-items: center;
            padding: 0.5rem 1rem;
            margin: 0.125rem 0.5rem;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s ease;
            white-space: nowrap;
        }
        
        .nav-item:hover {
            background-color: var(--secondary);
        }
        
        .nav-item.active {
            background-color: var(--accent);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .nav-icon {
            margin-right: 0.75rem;
            font-size: 1rem;
            width: 1rem;
            opacity: 0.9;
            text-align: center;
        }
        
        .nav-label {
            flex: 1;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .reputation-info {
            display: flex;
            justify-content: space-between;
            margin: 0.5rem 1rem;
            padding: 0.5rem 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 0.9rem;
        }
        
        .info-label {
            color: rgba(255, 255, 255, 0.8);
        }
        
        .info-value {
            font-weight: 600;
        }
        
        .logout-button {
            margin: 0.5rem 1rem;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            justify-content: center;
        }
        
        .logout-button:hover {
            background-color: var(--danger);
        }
        
        /* Hide scrollbar but allow scrolling if needed */
        .sidebar::-webkit-scrollbar {
            width: 4px;
        }
        
        .sidebar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }
    `;
    
    document.head.appendChild(style);

    return sidebar;
};

// Update active nav item function
window.updateActiveNavItem = function(pageName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    const activeNavItem = document.getElementById(`${pageName}-nav-item`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
};

// Function to update sidebar reputation display
window.updateSidebarReputation = function() {
    const reputationElement = document.getElementById('sidebar-reputation');
    if (reputationElement && window.brandReputation) {
        reputationElement.textContent = Math.round(window.brandReputation.reputationScore);
    }
};