// /js/pages/equipmentPage.js - buy, repair and auto-purchase equipment.
//
// Auto-purchase settings apply as soon as they're changed (they used to be
// saved only by a purchase, findings U14). Purchases, wear, repairs and
// work starting or finishing update the rows in place; newly researched
// equipment redraws the table.

window.renderEquipmentPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;

    const root = kit.page(
        mainContent,
        'Equipment',
        'Products can only be compounded with all their equipment working. Each unit handles one compound at a time, and wears a little with each.',
    );

    const toolbar = el('div', 'toolbar');
    const search = el('input', 'input search');
    search.type = 'search';
    search.placeholder = 'Search equipment…';
    search.setAttribute('aria-label', 'Search equipment');
    toolbar.appendChild(search);
    root.appendChild(toolbar);

    const card = kit.card(undefined, { flush: true });
    root.appendChild(card.root);

    // equipment id -> quantity to buy, kept across searches
    const order = new Map<string, number>();

    const orderBar = el('div', 'order-bar');
    const summary = el('span', 'muted');
    const total = el('span', 'order-total');
    total.id = 'total-cost-value';
    const buy = kit.button('Buy equipment', 'primary', confirmPurchase);
    orderBar.append(summary, total, buy);
    root.appendChild(orderBar);

    let liveFields: Array<() => void> = [];

    // Which equipment the table was drawn for (research unlocks more)
    let renderedUnlocked = '';
    function unlockedIds(): string {
        return window.equipmentData
            .filter((eq) => window.research.isEquipmentUnlocked(eq.id))
            .map((eq) => eq.id)
            .join();
    }

    // Products the pharmacy carries that need this item
    function neededFor(eq: EquipmentItem): string[] {
        const unlocked = new Set(window.research.getUnlockedProducts());
        return window.productsData
            .filter((p) => unlocked.has(p.id) && p.equipmentNeeded.includes(eq.id))
            .map((p) => p.name);
    }

    function condition(eq: EquipmentItem): { fraction: number; tone: Tone } {
        const fraction = (eq.durability || 0) / 100;
        return { fraction, tone: fraction > 0.6 ? 'good' : fraction > 0.3 ? 'warn' : 'critical' };
    }

    function render(): void {
        card.body.innerHTML = '';
        liveFields = [];
        renderedUnlocked = unlockedIds();

        const table = kit.table([
            { label: 'Equipment' },
            { label: 'Price', num: true },
            { label: 'Owned', num: true },
            { label: 'In use', num: true, title: 'Compounds using it now, of how many it can take at once' },
            { label: 'Condition', width: '150px', title: 'Below 50% compounding slows down. At 0% it is broken.' },
            { label: 'Repair', className: 'actions' },
            { label: 'Buy', num: true },
            {
                label: 'Auto-buy below',
                num: true,
                title: 'Checked every game hour: buys more when you own fewer than this. 0 is off.',
            },
            { label: 'Auto-buy amount', num: true },
        ]);
        card.body.appendChild(table.root);

        const text = search.value.toLowerCase().trim();
        const items = window.equipmentData.filter(
            (eq) => window.research.isEquipmentUnlocked(eq.id) && (!text || eq.name.toLowerCase().includes(text)),
        );
        if (items.length === 0) table.empty('No equipment matches your search.');

        items.forEach((eq) => {
            const owned = el('span');
            const inUse = el('span');
            const cond = kit.meterCell(0, '');
            const repair = kit.button(
                'Repair',
                'secondary',
                () => {
                    const cost = window.production.repairCost(eq);
                    if (window.production.repairEquipment(eq.id)) {
                        window.toast(`Repaired ${eq.name} for ${fmt.money(cost)}.`, 'success');
                    } else {
                        window.toast(`Not enough cash to repair ${eq.name} (${fmt.money(cost)}).`, 'error');
                    }
                },
                { small: true },
            );

            const buyQty = kit.numberInput(order.get(eq.id) ?? 0, { min: 0, small: true, width: '64px' });
            buyQty.className += ' buy-qty-input';
            buyQty.setAttribute('aria-label', `Number of ${eq.name} to buy`);
            buyQty.addEventListener('input', () => {
                const value = parseInt(buyQty.value, 10);
                if (Number.isFinite(value) && value > 0) order.set(eq.id, value);
                else order.delete(eq.id);
                updateTotal();
            });

            const setting = (key: 'autoPurchaseThreshold' | 'autoPurchaseAmount', label: string): HTMLInputElement => {
                const input = kit.numberInput(eq[key] || 0, { min: 0, small: true, width: '64px' });
                input.setAttribute('aria-label', `${label} for ${eq.name}`);
                input.addEventListener('change', () => {
                    const value = parseInt(input.value, 10);
                    if (!Number.isFinite(value) || value < 0) {
                        window.toast(`${label} must be 0 or more.`, 'error');
                        input.value = String(eq[key] || 0);
                        return;
                    }
                    eq[key] = value;
                });
                return input;
            };

            const update = (): void => {
                owned.textContent = fmt.int(eq.owned);
                const slots = eq.owned * eq.capacity;
                inUse.textContent = eq.owned > 0 ? `${window.production.inUse(eq)} / ${fmt.int(slots)}` : '—';
                if (eq.owned > 0) {
                    const c = condition(eq);
                    const broken = eq.durability <= 0;
                    cond.set(c.fraction, broken ? 'Broken' : `${Math.round(eq.durability)}%`, c.tone);
                    cond.root.style.visibility = '';
                } else {
                    cond.root.style.visibility = 'hidden';
                }
                const cost = window.production.repairCost(eq);
                const worn = eq.owned > 0 && eq.durability < 100;
                repair.style.visibility = worn ? '' : 'hidden';
                const label = `Repair ${fmt.money(cost)}`;
                if (repair.textContent !== label) repair.textContent = label;
                repair.disabled = !worn || cost > window.financesData.cash;
                repair.title = worn ? `Back to 100% for ${fmt.money(cost)}` : '';
            };
            update();
            liveFields.push(update);

            const products = neededFor(eq);
            const name = kit.primaryCell(
                eq.name,
                products.length > 0
                    ? `Needed for ${products.length} product${products.length === 1 ? '' : 's'}`
                    : 'Not needed by anything you carry yet',
            );
            name.title = products.join('\n');

            const row = table.row([
                name,
                fmt.moneyWhole(eq.cost),
                owned,
                inUse,
                cond.root,
                repair,
                buyQty,
                setting('autoPurchaseThreshold', 'Auto-buy point'),
                setting('autoPurchaseAmount', 'Auto-buy amount'),
            ]);
            row.className = 'equipment-card';
            row.dataset.equipmentId = eq.id;
        });
        updateTotal();
    }

    function orderTotal(): number {
        let sum = 0;
        order.forEach((qty, id) => {
            const eq = window.equipmentData.find((e) => e.id === id);
            if (eq) sum += qty * eq.cost;
        });
        return sum;
    }

    function updateTotal(): void {
        const sum = orderTotal();
        let units = 0;
        order.forEach((qty) => (units += qty));
        summary.textContent = units > 0 ? `${units} item${units === 1 ? '' : 's'}` : 'Nothing to buy yet';
        total.textContent = fmt.money(sum);
        const short = sum > window.financesData.cash;
        total.className = short ? 'order-total critical-text' : 'order-total';
        buy.disabled = units === 0 || short;
    }

    function confirmPurchase(): void {
        const totalCost = orderTotal();
        if (totalCost <= 0) return;
        const paid = window.finances.transact({
            type: 'expense',
            category: 'equipment',
            amount: totalCost,
            description: 'Equipment purchase',
            requireFunds: true,
        });
        if (!paid) {
            window.toast('Not enough cash for this purchase.', 'error');
            return;
        }
        order.forEach((qty, id) => {
            const eq = window.equipmentData.find((e) => e.id === id);
            if (eq) window.production.addEquipment(eq, qty);
        });
        order.clear();
        render();
        window.toast(`Bought equipment for ${fmt.money(totalCost)}.`, 'success');
    }

    page.on('equipment', () => {
        if (unlockedIds() !== renderedUnlocked) render();
        else liveFields.forEach((update) => update());
    });
    // Compounds starting and finishing (in use); cash (what you can afford)
    page.on('tasks', () => liveFields.forEach((update) => update()));
    page.on('finances', () => {
        updateTotal();
        liveFields.forEach((update) => update());
    });
    search.addEventListener('input', render);

    render();
};
