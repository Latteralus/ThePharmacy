// sideBar.js - reputation and navigation.
//
// Only pages with something behind them are listed. Dashboard, Customers
// and Statistics came back in Phase 8 with the history (records.ts) behind
// them; Orders and Marketing were placeholders (findings U7) and stay out.
// Company and Building arrived with the company model (Phase 10).

interface NavItemDef {
    label: string;
    pageName: string;
    icon: string;
}

const NAV_SECTIONS: Array<{ title: string; items: NavItemDef[] }> = [
    {
        title: 'Store',
        items: [
            { label: 'Dashboard', pageName: 'dashboard', icon: '📋' },
            { label: 'Operations', pageName: 'operations', icon: '🏥' },
            { label: 'Customers', pageName: 'customers', icon: '🧾' },
            { label: 'Building', pageName: 'building', icon: '🏢' },
        ],
    },
    {
        title: 'Stock',
        items: [
            { label: 'Inventory', pageName: 'inventory', icon: '📦' },
            { label: 'Marketplace', pageName: 'marketplace', icon: '🛒' },
            { label: 'Equipment', pageName: 'equipment', icon: '⚗️' },
        ],
    },
    {
        title: 'Business',
        items: [
            { label: 'Company', pageName: 'company', icon: '🏛️' },
            { label: 'Employees', pageName: 'employees', icon: '👥' },
            { label: 'Finances', pageName: 'finances', icon: '💰' },
            { label: 'Statistics', pageName: 'statistics', icon: '📈' },
            { label: 'Research', pageName: 'research', icon: '🔬' },
        ],
    },
    { title: 'Game', items: [{ label: 'Settings', pageName: 'settings', icon: '⚙️' }] },
];

window.renderSidebar = function renderSidebar(): HTMLElement {
    const { el } = window.kit;
    const sidebar = el('aside', 'sidebar');

    // Reputation, 0-100 (brandReputation clamps it)
    const reputation = el('div', 'sidebar-reputation');
    reputation.title = 'Rises with happy customers, falls when they leave unhappy, unserved or over price.';
    const repRow = el('div', 'rep-row');
    const repValue = el('span', 'rep-value');
    repValue.id = 'sidebar-reputation';
    repRow.append(el('span', 'rep-label', 'Reputation'), repValue);
    const repMeter = window.kit.meter(0);
    reputation.append(repRow, repMeter);
    sidebar.appendChild(reputation);

    let shownReputation = -1;
    const showReputation = (): void => {
        const score = Math.round(window.brandReputation?.reputationScore ?? 0);
        if (score === shownReputation) return;
        shownReputation = score;
        repValue.textContent = `${score} / 100`;
        window.kit.setMeter(repMeter, score / 100);
    };
    showReputation();
    // Reputation moves when customers leave; the 'time' tick catches anything else.
    window.ui.subscribe('customers', showReputation);
    window.ui.subscribe('time', showReputation);

    const nav = el('nav', 'nav-links');
    NAV_SECTIONS.forEach((section) => {
        nav.appendChild(el('div', 'nav-category', section.title));
        section.items.forEach(({ label, pageName, icon }) => {
            const item = el('div', 'nav-item');
            item.id = `${pageName}-nav-item`;
            item.setAttribute('role', 'button');
            item.tabIndex = 0;
            item.append(el('span', 'nav-icon', icon), el('span', 'nav-label', label));
            item.addEventListener('click', () => window.showPage(pageName));
            item.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') window.showPage(pageName);
            });
            nav.appendChild(item);
        });
    });
    sidebar.appendChild(nav);

    const mainMenu = el('div', 'nav-item logout-button');
    mainMenu.append(el('span', 'nav-icon', '⏏'), el('span', 'nav-label', 'Main Menu'));
    mainMenu.addEventListener('click', () => {
        window.showConfirmModal(
            'Return to the main menu? Anything since your last save will be lost.',
            'Main Menu',
            () => {
                window.location.href = 'index.html';
            },
            { danger: true },
        );
    });
    sidebar.appendChild(mainMenu);

    return sidebar;
};

window.updateActiveNavItem = function (pageName: string): void {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    document.getElementById(`${pageName}-nav-item`)?.classList.add('active');
};
