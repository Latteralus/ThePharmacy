// /js/pages/marketplacePage.js - buy raw materials. Quantities typed here
// survive stock changes (compounds taking materials, auto-orders), which
// update the stock column in place. Stock takes shelves in storage, and an
// order that won't fit is refused (building.ts, Phase 10).

window.renderMarketplacePage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;

    // Most materials share one discount ladder; show it once if they do.
    const tiersText = (mat: Material): string =>
        mat.bulkDiscounts.map((d) => `${Math.round(d.discount * 100)}% off ${fmt.int(d.minQuantity)}+`).join(' · ');
    const ladders = new Set(window.materialsData.map(tiersText));
    const sharedTiers = ladders.size === 1 ? [...ladders][0] : '';

    const root = kit.page(
        mainContent,
        'Marketplace',
        sharedTiers
            ? `Raw materials, delivered at once. Bulk discounts: ${sharedTiers}.`
            : 'Raw materials, delivered at once.',
    );

    const toolbar = el('div', 'toolbar');
    const search = el('input', 'input search');
    search.type = 'search';
    search.placeholder = 'Search materials…';
    search.setAttribute('aria-label', 'Search materials');
    toolbar.appendChild(search);
    root.appendChild(toolbar);

    const card = kit.card(undefined, { flush: true });
    root.appendChild(card.root);

    // The order: material id -> quantity, kept across searches
    const order = new Map<string, number>();

    const orderBar = el('div', 'order-bar');
    const shelves = el('span', 'muted');
    const summary = el('span', 'muted');
    const total = el('span', 'order-total');
    const clear = kit.button('Clear', 'ghost', () => {
        order.clear();
        render();
        updateTotal();
    });
    const buy = kit.button('Buy materials', 'primary', confirmPurchase);
    orderBar.append(shelves, summary, total, clear, buy);
    root.appendChild(orderBar);

    let stockCells: Array<() => void> = [];
    const lineCosts = new Map<string, HTMLElement>();

    function lineCost(mat: Material): number {
        const qty = order.get(mat.id) ?? 0;
        return qty > 0 ? window.calculateMaterialCost(mat.id, qty) : 0;
    }

    function render(): void {
        card.body.innerHTML = '';
        stockCells = [];
        lineCosts.clear();
        const columns: TableColumn[] = [
            { label: 'Material' },
            { label: 'Unit price', num: true },
            { label: 'In stock', num: true },
            { label: 'Order qty', num: true },
            { label: 'Line cost', num: true, title: 'With any bulk discount' },
        ];
        if (!sharedTiers) columns.splice(2, 0, { label: 'Bulk discounts' });
        const table = kit.table(columns);
        card.body.appendChild(table.root);

        const text = search.value.toLowerCase().trim();
        const materials = window.materialsData.filter((m) => !text || m.name.toLowerCase().includes(text));
        if (materials.length === 0) table.empty('No materials match your search.');

        materials.forEach((mat) => {
            const stock = el('span');
            const showStock = (): void => {
                stock.textContent = fmt.int(mat.inventory);
                stock.className = mat.inventory <= 0 ? 'critical-text' : '';
            };
            showStock();
            stockCells.push(showStock);

            const qty = kit.numberInput(order.get(mat.id) ?? 0, { min: 0, small: true, width: '84px' });
            qty.setAttribute('aria-label', `Quantity of ${mat.name}`);
            const cost = el('span');
            lineCosts.set(mat.id, cost);
            qty.addEventListener('input', () => {
                const value = parseInt(qty.value, 10);
                if (Number.isFinite(value) && value > 0) order.set(mat.id, value);
                else order.delete(mat.id);
                updateTotal();
            });

            const cells: TableCell[] = [mat.name, fmt.money(mat.cost), stock, qty, cost];
            if (!sharedTiers) cells.splice(2, 0, el('span', 'small muted', tiersText(mat)));
            const row = table.row(cells);
            row.className = 'material-row';
        });
        updateTotal();
    }

    function orderTotal(): number {
        let sum = 0;
        window.materialsData.forEach((mat) => {
            sum += lineCost(mat);
        });
        return sum;
    }

    function updateTotal(): void {
        window.materialsData.forEach((mat) => {
            const cell = lineCosts.get(mat.id);
            if (cell) cell.textContent = order.has(mat.id) ? fmt.money(lineCost(mat)) : '';
        });
        const sum = orderTotal();
        const lines = order.size;
        summary.textContent = lines > 0 ? `${lines} material${lines === 1 ? '' : 's'}` : 'Nothing in the order yet';
        total.textContent = fmt.money(sum);
        const short = sum > window.financesData.cash;
        total.className = short ? 'order-total critical-text' : 'order-total';
        total.title = short ? `More than your ${fmt.money(window.financesData.cash)} cash` : '';
        // Shelves the order needs, against those free
        const free = window.building.freeShelves();
        const needed = window.building.shelvesNeeded(order);
        const noRoom = needed > Math.max(0, free);
        shelves.textContent =
            needed > 0
                ? `Needs ${fmt.int(needed)} of ${fmt.int(Math.max(0, free))} shelves free`
                : `${fmt.int(Math.max(0, free))} shelves free`;
        shelves.className = noRoom ? 'critical-text' : 'muted';
        buy.disabled = lines === 0 || short || noRoom;
    }

    function confirmPurchase(): void {
        const totalCost = orderTotal();
        if (totalCost <= 0) return;
        const refusal = window.building.refuseMaterials(order);
        if (refusal) {
            window.toast(refusal, 'error');
            return;
        }
        const paid = window.finances.transact({
            type: 'expense',
            category: 'materials',
            amount: totalCost,
            description: 'Marketplace material purchase',
            requireFunds: true,
        });
        if (!paid) {
            window.toast('Not enough cash for this order.', 'error');
            return;
        }

        window.materialsData.forEach((mat) => {
            const qty = order.get(mat.id) ?? 0;
            if (qty > 0) mat.inventory += qty;
        });
        order.clear();

        // A compound waiting on these materials can start now
        window.taskAssignment.requestAutoAssign();
        window.updateUI('inventory');
        render();
        window.toast(`Bought materials for ${fmt.money(totalCost)}.`, 'success');
    }

    search.addEventListener('input', render);

    // Stock changes update the column in place, keeping typed quantities
    page.on('inventory', () => {
        stockCells.forEach((update) => update());
        updateTotal();
    });
    // The Buy button depends on cash
    page.on('finances', updateTotal);

    render();
};
