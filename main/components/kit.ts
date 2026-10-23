// kit.js - what every screen is built from (findings section 9.1).
//
//   window.fmt    one set of number/money/time formatters
//   window.words  the player's words for internal states (no raw ids or
//                 camelCase statuses on screen)
//   window.kit    plain-DOM components styled by main/css/style.css
//   window.toast  non-blocking messages, instead of alert()
//
// Pages build markup from these and never set colours inline or inject
// <style> blocks.

(function () {
    // ---------------------------------------------------------
    // Formatters
    // ---------------------------------------------------------
    const moneyFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const wholeMoneyFormat = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    });
    const intFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

    const pad = (n: number): string => String(n).padStart(2, '0');
    // Rounded to cents first, so -0 and -0.004 show as $0.00, not -$0.00
    const cents = (amount: number): number => (Number.isFinite(amount) ? Math.round(amount * 100) / 100 || 0 : 0);

    window.fmt = {
        money: (amount) => moneyFormat.format(cents(amount)),
        moneyWhole: (amount) => wholeMoneyFormat.format(Number.isFinite(amount) ? amount : 0),
        int: (n) => intFormat.format(Number.isFinite(n) ? n : 0),
        pct: (fraction, digits = 0) => `${((Number.isFinite(fraction) ? fraction : 0) * 100).toFixed(digits)}%`,
        signedPct: (fraction, digits = 0) => {
            const value = (Number.isFinite(fraction) ? fraction : 0) * 100;
            return `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}%`;
        },
        clock: (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`,
        day: (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        duration: (minutes) => {
            const total = Math.max(0, Math.round(minutes));
            if (total < 60) return `${total}m`;
            return `${Math.floor(total / 60)}h ${pad(total % 60)}m`;
        },
    };

    // ---------------------------------------------------------
    // Player words
    // ---------------------------------------------------------
    const STAGES: Record<CustomerStatus, { label: string; tone: Tone }> = {
        waitingForCheckIn: { label: 'Waiting for check-in', tone: 'neutral' },
        waitingForConsultation: { label: 'Waiting for consultation', tone: 'info' },
        waitingForFill: { label: 'Waiting for prescription', tone: 'info' },
        readyForCheckout: { label: 'Ready to pay', tone: 'good' },
        completed: { label: 'Done', tone: 'good' },
    };

    window.words = {
        customerStage: (status) => STAGES[status] ?? { label: String(status), tone: 'neutral' },

        taskKind(task) {
            if (task.type === 'compound') return 'compound';
            if (task.type === 'fillPrescription') return 'fill';
            if (task.type === 'consultation') return 'consult';
            return 'desk';
        },

        taskLabel(task) {
            const product = task.productName ?? 'product';
            switch (task.type) {
                case 'compound': {
                    const qty = task.quantityToMake ?? task.quantityNeeded;
                    const units = qty ? ` ×${qty}` : '';
                    return task.prescriptionId ? `Compound ${product}${units}` : `Restock ${product}${units}`;
                }
                case 'fillPrescription':
                    return `Fill ${product}`;
                case 'consultation':
                    return 'Consultation';
                case 'customerInteraction':
                    return task.interaction === 'checkout' ? 'Checkout' : 'Check-in';
                default:
                    return String(task.type);
            }
        },

        taskStatus(status) {
            switch (status) {
                case 'pending':
                    return 'Queued';
                case 'pending-dependent':
                    return 'Waiting on compound';
                case 'inProgress':
                    return 'In progress';
                case 'completed':
                    return 'Done';
                default:
                    return String(status);
            }
        },

        prescriptionStatus(status) {
            switch (status) {
                case 'pending':
                    return 'Being prepared';
                case 'filled':
                    return 'Ready';
                case 'completed':
                    return 'Collected';
                default:
                    return String(status);
            }
        },

        // Why a customer left (the visit log, Statistics)
        departure(reason) {
            switch (reason) {
                case 'served':
                    return { label: 'Served', tone: 'good' };
                case 'impatient':
                    return { label: 'Ran out of patience', tone: 'critical' };
                case 'price':
                    return { label: 'Refused the price', tone: 'warn' };
                case 'closing':
                    return { label: 'Still waiting at closing', tone: 'warn' };
                case 'unavailable':
                    return { label: 'Turned away', tone: 'neutral' };
                default:
                    return { label: 'Sent home', tone: 'neutral' };
            }
        },

        // Mood is 1-10. The bands match customers.updateReputationOnDeparture.
        mood(mood) {
            if (mood >= 8) return { label: 'Happy', tone: 'good' };
            if (mood >= 6) return { label: 'Content', tone: 'neutral' };
            if (mood >= 4) return { label: 'Annoyed', tone: 'warn' };
            return { label: 'Upset', tone: 'critical' };
        },
    };

    // ---------------------------------------------------------
    // Components
    // ---------------------------------------------------------
    function el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        className?: string,
        text?: string,
    ): HTMLElementTagNameMap[K] {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    const page: Kit['page'] = (container, title, subtitle, actions = []) => {
        const root = el('div', 'page');
        const header = el('div', 'page-header');
        const heading = el('div');
        heading.appendChild(el('h2', '', title));
        if (subtitle) heading.appendChild(el('p', '', subtitle));
        header.appendChild(heading);
        if (actions.length > 0) {
            const actionsEl = el('div', 'page-actions');
            actionsEl.append(...actions);
            header.appendChild(actionsEl);
        }
        root.appendChild(header);
        container.appendChild(root);
        return root;
    };

    const card: Kit['card'] = (title, options = {}) => {
        const root = el('section', 'card');
        let countEl: HTMLSpanElement | null = null;
        if (title) {
            const header = el('div', 'card-header');
            const heading = el('h3', '', title);
            countEl = el('span', 'card-count');
            heading.appendChild(countEl);
            header.appendChild(heading);
            if (options.actions?.length) {
                const actions = el('div', 'page-actions');
                actions.append(...options.actions);
                header.appendChild(actions);
            }
            root.appendChild(header);
        }
        const body = el('div', options.flush ? 'card-body flush' : 'card-body');
        root.appendChild(body);
        return {
            root,
            body,
            setCount(count) {
                if (countEl) countEl.textContent = count === null ? '' : String(count);
            },
        };
    };

    const statTile: Kit['statTile'] = (label) => {
        const root = el('div', 'stat');
        root.appendChild(el('div', 'stat-label', label));
        const value = el('div', 'stat-value');
        const sub = el('div', 'stat-sub');
        root.append(value, sub);
        return {
            root,
            set(text, subText = '', subTone) {
                if (value.textContent !== text) value.textContent = text;
                sub.textContent = subText;
                sub.className = subTone && subTone !== 'neutral' ? `stat-sub ${subTone}-text` : 'stat-sub';
            },
        };
    };

    const setMeter: Kit['setMeter'] = (meterEl, fraction, tone) => {
        const clamped = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
        meterEl.className =
            tone && tone !== 'neutral' && tone !== 'info' && tone !== 'brand' ? `meter ${tone}` : 'meter';
        (meterEl.firstChild as HTMLElement).style.width = `${+(clamped * 100).toFixed(1)}%`;
        meterEl.setAttribute('aria-valuenow', String(Math.round(clamped * 100)));
    };

    const meter: Kit['meter'] = (fraction, tone) => {
        const root = el('div', 'meter');
        root.setAttribute('role', 'meter');
        root.setAttribute('aria-valuemin', '0');
        root.setAttribute('aria-valuemax', '100');
        root.appendChild(el('div', 'meter-fill'));
        setMeter(root, fraction, tone);
        return root;
    };

    const meterCell: Kit['meterCell'] = (fraction, text, tone) => {
        const root = el('div', 'meter-cell');
        const bar = meter(fraction, tone);
        const label = el('span', 'meter-text', text);
        root.append(bar, label);
        return {
            root,
            set(f, t, newTone) {
                setMeter(bar, f, newTone);
                if (label.textContent !== t) label.textContent = t;
            },
        };
    };

    const pill: Kit['pill'] = (text, tone = 'neutral') => {
        return el('span', tone === 'neutral' ? 'pill' : `pill ${tone}`, text);
    };

    const button: Kit['button'] = (label, variant = 'secondary', onClick, options = {}) => {
        const classes = ['btn'];
        if (variant !== 'secondary') classes.push(`btn-${variant}`);
        if (options.small) classes.push('btn-sm');
        const node = el('button', classes.join(' '), label);
        node.type = 'button';
        if (options.title) node.title = options.title;
        if (onClick) node.addEventListener('click', onClick);
        return node;
    };

    const numberInput: Kit['numberInput'] = (value, options = {}) => {
        const input = el('input', `input num${options.small ? ' input-sm' : ''}`);
        input.type = 'number';
        input.value = String(value);
        if (options.min !== undefined) input.min = String(options.min);
        if (options.max !== undefined) input.max = String(options.max);
        input.step = String(options.step ?? 1);
        if (options.width) input.style.width = options.width;
        if (options.label) input.setAttribute('aria-label', options.label);
        return input;
    };

    const select: Kit['select'] = (options, current, onChange) => {
        const node = el('select', 'select');
        options.forEach((option) => {
            const opt = el('option', '', option.label);
            opt.value = String(option.value);
            opt.selected = option.value === current;
            node.appendChild(opt);
        });
        if (onChange) node.addEventListener('change', () => onChange(node.value));
        return node;
    };

    const segmented: Kit['segmented'] = (options, current, onChange) => {
        const root = el('div', 'seg');
        root.setAttribute('role', 'group');
        const buttons = options.map((option) => {
            const node = el('button', '', option.label);
            node.type = 'button';
            if (option.title) node.title = option.title;
            node.addEventListener('click', () => onChange(option.value));
            root.appendChild(node);
            return { node, value: option.value };
        });
        const set = (value: unknown) => {
            buttons.forEach((b) => {
                const active = b.value === value;
                b.node.classList.toggle('active', active);
                b.node.setAttribute('aria-pressed', String(active));
            });
        };
        set(current);
        return { root, set };
    };

    const tabs: Kit['tabs'] = (labels, onChange) => {
        const root = el('div', 'tabs');
        root.setAttribute('role', 'tablist');
        const buttons = labels.map((label, index) => {
            const node = el('button', '', label);
            node.type = 'button';
            node.setAttribute('role', 'tab');
            node.addEventListener('click', () => selectTab(index));
            root.appendChild(node);
            return node;
        });
        function selectTab(index: number): void {
            buttons.forEach((b, i) => {
                b.classList.toggle('active', i === index);
                b.setAttribute('aria-selected', String(i === index));
            });
            onChange(index);
        }
        return { root, select: selectTab };
    };

    const table: Kit['table'] = (columns) => {
        const root = el('div', 'table-scroll');
        const tableEl = el('table', 'data-table');
        const head = el('thead');
        const headRow = el('tr');
        columns.forEach((column) => {
            const th = el('th', column.num ? 'num' : '', column.label);
            if (column.width) th.style.width = column.width;
            if (column.title) th.title = column.title;
            headRow.appendChild(th);
        });
        head.appendChild(headRow);
        const tbody = el('tbody');
        tableEl.append(head, tbody);
        root.appendChild(tableEl);

        function cell(content: TableCell, column: TableColumn | undefined): HTMLTableCellElement {
            const td = el('td', column?.num ? 'num' : (column?.className ?? ''));
            if (content instanceof Node) td.appendChild(content);
            else if (content !== null && content !== undefined) td.textContent = String(content);
            return td;
        }

        return {
            root,
            table: tableEl,
            tbody,
            row(cells, className) {
                const tr = el('tr', className ?? '');
                cells.forEach((content, i) => tr.appendChild(cell(content, columns[i])));
                tbody.appendChild(tr);
                return tr;
            },
            group(label) {
                const tr = el('tr', 'group');
                const td = el('td', '', label);
                td.colSpan = columns.length;
                tr.appendChild(td);
                tbody.appendChild(tr);
                return tr;
            },
            empty(text) {
                const tr = el('tr');
                const td = el('td', 'empty', text);
                td.colSpan = columns.length;
                tr.appendChild(td);
                tbody.appendChild(tr);
            },
            note(text) {
                const tr = el('tr', 'note');
                const td = el('td', 'muted', text);
                td.colSpan = columns.length;
                tr.appendChild(td);
                tbody.appendChild(tr);
                return tr;
            },
            clear() {
                tbody.innerHTML = '';
            },
        };
    };

    const swatch: Kit['swatch'] = (kind) => {
        const node = el('span', `swatch kind-${kind}`);
        node.setAttribute('aria-hidden', 'true');
        return node;
    };

    const primaryCell: Kit['primaryCell'] = (primary, sub) => {
        const wrap = el('span');
        wrap.appendChild(el('span', 'primary', primary));
        if (sub) wrap.appendChild(el('span', 'sub', sub));
        return wrap;
    };

    // A modal dialog. Esc and the backdrop do nothing unless onEscape is
    // given (the daily summary has to be answered).
    const modal: Kit['modal'] = (options) => {
        const backdrop = el('div', `modal-backdrop${options.className ? ` ${options.className}` : ''}`);
        const box = el('div', 'modal');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        const header = el('div', 'modal-header');
        header.appendChild(el('h2', '', options.title));
        if (options.subtitle) header.appendChild(el('p', '', options.subtitle));
        box.appendChild(header);
        const body = el('div', 'modal-body');
        body.append(...options.body);
        box.appendChild(body);
        const actions = el('div', 'modal-actions');
        actions.append(...options.actions);
        box.appendChild(actions);
        backdrop.appendChild(box);

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && options.onEscape) {
                event.stopPropagation();
                options.onEscape();
            }
        };
        const close = () => {
            document.removeEventListener('keydown', onKey, true);
            backdrop.remove();
        };
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(backdrop);
        return { root: backdrop, close };
    };

    window.kit = {
        el,
        page,
        card,
        statTile,
        meter,
        setMeter,
        meterCell,
        pill,
        button,
        numberInput,
        select,
        segmented,
        tabs,
        table,
        swatch,
        primaryCell,
        modal,
    };

    // ---------------------------------------------------------
    // Toasts: a CSS animation fades each one out and removes it, so no timer
    // is involved (and hovering holds it).
    // ---------------------------------------------------------
    window.toast = function toast(message, tone = 'info', options = {}) {
        let stack = document.querySelector<HTMLElement>('.toast-stack');
        if (!stack) {
            stack = el('div', 'toast-stack');
            stack.setAttribute('role', 'status');
            stack.setAttribute('aria-live', 'polite');
            document.body.appendChild(stack);
        }
        const node = el('div', `toast ${tone}${options.sticky ? ' sticky' : ''}`);
        if (tone === 'error' || tone === 'warn') node.style.animationDuration = '8s';
        node.appendChild(el('span', 'toast-message', message));
        const close = el('button', 'toast-close', '✕');
        close.type = 'button';
        close.setAttribute('aria-label', 'Dismiss');
        close.addEventListener('click', () => node.remove());
        node.appendChild(close);
        node.addEventListener('animationend', () => node.remove());
        stack.appendChild(node);
        // Keep the newest few
        while (stack.children.length > 4) stack.firstElementChild!.remove();
        return node;
    };
})();
