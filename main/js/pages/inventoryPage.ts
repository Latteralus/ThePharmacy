// /js/pages/inventoryPage.js - products (stock against target, prices
// against the market) and raw materials (stock and auto-order). Products are
// the ones research has unlocked: what customers can ask for.
//
// Typed values apply on change (Enter or leaving the field). Stock, prices
// and "can make" update in place on 'inventory', and a field the player is
// typing in is never overwritten.

window.renderInventoryPage = function (mainContent: HTMLElement, page: PageScope): void {
    const kit = window.kit;
    const { el } = kit;
    const { fmt } = window;

    const root = kit.page(
        mainContent,
        'Inventory',
        'Stock against your targets, and prices against what customers expect to pay.',
    );

    // --------------------- Toolbar ---------------------
    const toolbar = el('div', 'toolbar');
    const search = el('input', 'input search');
    search.type = 'search';
    search.placeholder = 'Search…';
    search.setAttribute('aria-label', 'Search inventory');

    const markupInput = kit.numberInput(Math.round((window.globalMarkup - 1) * 100), {
        min: 0,
        step: 5,
        width: '70px',
        label: 'Markup percent',
    });
    const applyMarkup = kit.button('Apply markup', 'secondary', () => {
        const markup = parseFloat(markupInput.value);
        if (window.finances.applyMarkupToAllProducts(markup)) {
            window.toast(`Every price set to cost + ${fmt.int(markup)}%.`, 'success');
        } else {
            window.toast('Enter a markup of 0% or more.', 'error');
        }
    });
    const suggested = kit.button(
        'Set to suggested',
        'secondary',
        () => {
            window.finances.setToSuggestedPrices();
            window.toast('Every price set to the suggested price.', 'success');
        },
        { title: 'Cost plus the current markup' },
    );
    const maxAllInput = kit.numberInput(5, { min: 0, width: '64px', label: 'Target stock for all products' });
    const applyMaxAll = kit.button('Set for all', 'secondary', () => {
        const value = parseInt(maxAllInput.value, 10);
        if (!Number.isFinite(value) || value < 0) {
            window.toast('Enter a target of 0 or more.', 'error');
            return;
        }
        window.productsData.forEach((product) => {
            product.maxInventory = value;
        });
        window.updateUI('inventory');
        window.toast(`Target stock set to ${value} for every product.`, 'success');
    });

    const markupField = el('label', 'field', 'Markup');
    markupField.append(markupInput, '%');
    const maxField = el('label', 'field', 'Target stock');
    maxField.appendChild(maxAllInput);
    // Pricing and target stock only apply to finished products
    const productControls = el('div', 'toolbar');
    productControls.append(
        el('span', 'divider'),
        markupField,
        applyMarkup,
        suggested,
        el('span', 'divider'),
        maxField,
        applyMaxAll,
    );
    toolbar.append(search, productControls);

    // --------------------- Tabs ---------------------
    const productsCard = kit.card(undefined, { flush: true });
    const materialsCard = kit.card(undefined, { flush: true });
    let showingProducts = true;
    const tabs = kit.tabs(['Finished products', 'Raw materials'], (index) => {
        showingProducts = index === 0;
        productsCard.root.style.display = showingProducts ? '' : 'none';
        materialsCard.root.style.display = showingProducts ? 'none' : '';
        productControls.style.display = showingProducts ? '' : 'none';
        render();
    });
    root.append(tabs.root, toolbar, productsCard.root, materialsCard.root);

    // Figures that change during play, updated in place on 'inventory'
    let liveFields: Array<() => void> = [];
    page.on('inventory', () => liveFields.forEach((update) => update()));
    page.on('equipment', () => liveFields.forEach((update) => update()));

    // Writes a value into an input unless the player is typing in it
    function setIdle(input: HTMLInputElement, value: string): void {
        if (document.activeElement !== input && input.value !== value) input.value = value;
    }

    function matches(name: string): boolean {
        const text = search.value.toLowerCase().trim();
        return !text || name.toLowerCase().includes(text);
    }

    // --------------------- Products ---------------------
    function stockState(product: Product): { fraction: number; text: string; tone: Tone } {
        const max = product.maxInventory || 0;
        const fraction = max > 0 ? product.inventory / max : product.inventory > 0 ? 1 : 0;
        const tone: Tone = product.inventory <= 0 ? 'critical' : fraction < 0.5 ? 'warn' : 'good';
        return { fraction, text: `${fmt.int(product.inventory)} / ${fmt.int(max)}`, tone };
    }

    // How customers react to the price (finances.quotePrice): everyone pays
    // up to market, fewer above it, nobody at 3x.
    function priceCue(product: Product): { text: string; className: string; title: string } {
        const market = window.finances.marketPrice(product.id);
        const ratio = market > 0 ? product.price / market : 1;
        const chance = window.finances.acceptanceChance(ratio);
        const text = fmt.signedPct(ratio - 1);
        const className = chance >= 1 ? 'good-text' : chance >= 0.5 ? 'warn-text' : 'critical-text';
        const title =
            chance >= 1
                ? 'At or below market: every customer pays.'
                : `${fmt.pct(chance)} of customers accept this price. Those who pay are less happy.`;
        return { text, className, title };
    }

    function renderProducts(): void {
        productsCard.body.innerHTML = '';
        liveFields = [];
        const table = kit.table([
            { label: 'Product' },
            { label: 'Stock', width: '150px', title: 'In stock / target. Lab technicians restock up to the target.' },
            { label: 'Target', num: true },
            { label: 'Cost', num: true, title: 'Materials for one unit at list price' },
            { label: 'Market', num: true, title: 'What customers expect to pay' },
            { label: 'Price', num: true },
            { label: 'vs market', num: true },
            {
                label: 'Can make',
                num: true,
                title: 'Units your raw materials cover, or the equipment you need first',
            },
            { label: 'Compound now', className: 'actions' },
        ]);
        productsCard.body.appendChild(table.root);

        const unlocked = new Set(window.research.getUnlockedProducts());
        const products = window.productsData.filter((p) => unlocked.has(p.id) && matches(p.name));
        if (products.length === 0) table.empty('No products match your search.');

        products.forEach((product) => {
            const stock = stockState(product);
            const stockCell = kit.meterCell(stock.fraction, stock.text, stock.tone);

            const maxInput = kit.numberInput(product.maxInventory || 0, { min: 0, small: true, width: '60px' });
            maxInput.setAttribute('aria-label', `Target stock for ${product.name}`);
            maxInput.addEventListener('change', () => {
                const value = parseInt(maxInput.value, 10);
                if (!Number.isFinite(value) || value < 0) {
                    window.toast('Target stock must be 0 or more.', 'error');
                    maxInput.value = String(product.maxInventory || 0);
                    return;
                }
                product.maxInventory = value;
                window.updateUI('inventory');
            });

            const priceInput = kit.numberInput(product.price.toFixed(2), {
                min: 0.01,
                step: 0.01,
                small: true,
                width: '84px',
            });
            priceInput.setAttribute('aria-label', `Price for ${product.name}`);
            priceInput.addEventListener('change', () => {
                if (!window.finances.updateProductPrice(product.id, parseFloat(priceInput.value))) {
                    window.toast('Enter a price above $0.', 'error');
                    priceInput.value = product.price.toFixed(2);
                }
            });

            const cue = el('span');
            const canMake = el('span');

            const qtyInput = kit.numberInput(1, { min: 1, small: true, width: '52px' });
            qtyInput.setAttribute('aria-label', `Units of ${product.name} to compound`);
            const compound = kit.button(
                'Compound',
                'secondary',
                () => {
                    const quantity = parseInt(qtyInput.value, 10);
                    if (!Number.isFinite(quantity) || quantity < 1) {
                        window.toast('Enter at least 1 unit.', 'error');
                        return;
                    }
                    if (!window.production.canMake(product)) {
                        window.toast(
                            `${product.name} can't be made: ${window.production.missingEquipmentText(product)}.`,
                            'error',
                        );
                        return;
                    }
                    window.production.createCompoundTask(product, quantity);
                    window.toast(`Queued ${quantity} × ${product.name} for the lab.`, 'success');
                },
                { small: true },
            );
            const compoundCell = el('span', 'toolbar');
            compoundCell.style.justifyContent = 'flex-end';
            compoundCell.append(qtyInput, compound);

            const update = (): void => {
                const s = stockState(product);
                stockCell.set(s.fraction, s.text, s.tone);
                setIdle(maxInput, String(product.maxInventory || 0));
                setIdle(priceInput, product.price.toFixed(2));
                const c = priceCue(product);
                cue.textContent = c.text;
                cue.className = c.className;
                cue.title = c.title;
                if (window.production.canMake(product)) {
                    canMake.className = '';
                    canMake.textContent = fmt.int(window.helpers.calculatePotentialProduction(product.id));
                    canMake.title = '';
                    compound.disabled = false;
                } else {
                    const missing = window.production.missingEquipment(product);
                    const broken = missing.some((item) => item.owned >= 1);
                    canMake.className = broken ? 'critical-text' : 'warn-text';
                    canMake.textContent = broken ? 'Equipment broken' : 'Needs equipment';
                    canMake.title = window.production.missingEquipmentText(product);
                    compound.disabled = true;
                }
            };
            update();
            liveFields.push(update);

            const cost = window.calculateProductCost(product.id);
            const row = table.row([
                product.name,
                stockCell.root,
                maxInput,
                fmt.money(cost),
                fmt.money(window.finances.marketPrice(product.id)),
                priceInput,
                cue,
                canMake,
                compoundCell,
            ]);
            row.className = 'product-row';
            row.dataset.productId = product.id;
        });
    }

    // --------------------- Materials ---------------------
    function renderMaterials(): void {
        materialsCard.body.innerHTML = '';
        liveFields = [];
        const table = kit.table([
            { label: 'Material' },
            { label: 'Unit price', num: true },
            { label: 'In stock', num: true },
            { label: '' },
            { label: 'Reorder below', num: true, title: 'Checked every game hour. 0 turns auto-order off.' },
            { label: 'Reorder amount', num: true, title: 'Bought at Marketplace prices, bulk discounts included' },
        ]);
        materialsCard.body.appendChild(table.root);

        const materials = window.materialsData.filter((m) => matches(m.name));
        if (materials.length === 0) table.empty('No materials match your search.');

        materials.forEach((material) => {
            const stock = el('span');
            const status = el('span');

            const settingInput = (key: 'autoOrderThreshold' | 'autoOrderAmount', label: string): HTMLInputElement => {
                const input = kit.numberInput(material[key] || 0, { min: 0, small: true, width: '76px' });
                input.setAttribute('aria-label', `${label} for ${material.name}`);
                input.addEventListener('change', () => {
                    const value = parseInt(input.value, 10);
                    if (!Number.isFinite(value) || value < 0) {
                        window.toast(`${label} must be 0 or more.`, 'error');
                        input.value = String(material[key] || 0);
                        return;
                    }
                    material[key] = value;
                    update();
                });
                return input;
            };
            const thresholdInput = settingInput('autoOrderThreshold', 'Reorder point');
            const amountInput = settingInput('autoOrderAmount', 'Reorder amount');

            const update = (): void => {
                stock.textContent = fmt.int(material.inventory);
                const threshold = material.autoOrderThreshold || 0;
                const amount = material.autoOrderAmount || 0;
                status.innerHTML = '';
                if (threshold > 0 && amount > 0) {
                    status.appendChild(
                        material.inventory < threshold
                            ? kit.pill('Reorder due', 'warn')
                            : kit.pill('Auto-order on', 'info'),
                    );
                } else if (material.inventory <= 0) {
                    status.appendChild(kit.pill('Out of stock', 'critical'));
                }
            };
            update();
            liveFields.push(update);

            const row = table.row([
                material.name,
                fmt.money(material.cost),
                stock,
                status,
                thresholdInput,
                amountInput,
            ]);
            row.className = 'material-row';
            row.dataset.materialId = material.id;
        });
    }

    function render(): void {
        if (showingProducts) renderProducts();
        else renderMaterials();
    }

    search.addEventListener('input', render);
    tabs.select(0);
};
