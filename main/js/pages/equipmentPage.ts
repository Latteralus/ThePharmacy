// /js/pages/equipmentPage.js - buy equipment and set auto-purchase.
//
// Auto-purchase settings apply as soon as they're changed (they used to be
// saved only by a purchase, findings U14). Purchases and wear update owned
// and condition in place; newly researched equipment redraws the table.

window.renderEquipmentPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;

    const root = kit.page(mainContent, 'Equipment', 'Buy lab equipment and keep it stocked automatically.');

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
            .filter((eq) => eq.isUnlocked())
            .map((eq) => eq.id)
            .join();
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
            { label: 'Capacity', num: true },
            { label: 'Condition', width: '150px' },
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
            (eq) => eq.isUnlocked() && (!text || eq.name.toLowerCase().includes(text)),
        );
        if (items.length === 0) table.empty('No equipment matches your search.');

        items.forEach((eq) => {
            const owned = el('span');
            const cond = kit.meterCell(0, '');

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
                if (eq.owned > 0) {
                    const c = condition(eq);
                    cond.set(c.fraction, `${Math.round(eq.durability)}%`, c.tone);
                    cond.root.style.visibility = '';
                } else {
                    cond.root.style.visibility = 'hidden';
                }
            };
            update();
            liveFields.push(update);

            const row = table.row([
                eq.name,
                fmt.moneyWhole(eq.cost),
                owned,
                fmt.int(eq.capacity),
                cond.root,
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
            if (eq) eq.owned += qty;
        });
        order.clear();
        window.updateUI('equipment');
        render();
        window.toast(`Bought equipment for ${fmt.money(totalCost)}.`, 'success');
    }

    page.on('equipment', () => {
        if (unlockedIds() !== renderedUnlocked) render();
        else liveFields.forEach((update) => update());
    });
    page.on('finances', updateTotal);
    search.addEventListener('input', render);

    render();
};
