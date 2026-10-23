// mainMenu.js - the main menu (index.html): a new game, loading a save,
// Settings, and Exit. Loaded with the UI kit, the lease listings and the
// bank's loan terms, and nothing else of the game.
//
// The new-game screen (Phase 10, #12): name the company, choose a property
// to lease and the lease's term, negotiate a startup loan if you want one,
// and see what the money has to cover before the first insurance payday.
// The game itself starts from these choices (gameInitializer.ts).

// gameInitializer.ts's STARTING_CASH (Phase 9, #1)
const MENU_STARTING_CASH = 100000;
// A starting crew for the money screen: a pharmacist, a lab technician and
// a cashier at about a new hire's pay (helpers.calculateStartingWage), with
// payroll taxes and benefits (finances.ts PAYROLL_LOAD)
const STARTING_CREW = [
    { role: 'Pharmacist', salary: 125000 },
    { role: 'Lab Technician', salary: 40000 },
    { role: 'Cashier', salary: 33000 },
];
const MENU_PAYROLL_LOAD = 1.25;
// Insurers pay every other week (insuranceClaims.ts PAYOUT_EVERY_DAYS)
const FIRST_PAYDAY = 14;
const MONTH_DAYS = 365 / 12;
const AREA_NAMES: Record<AreaType, string> = { urban: 'City', suburban: 'Suburbs', rural: 'Small town' };

(function () {
    const { el, button, table, pill, checkbox } = window.kit;
    const { fmt } = window;
    const api = window.gameAPI;

    const mainMenu = document.getElementById('main-menu')!;
    const newGamePanel = document.getElementById('new-game-panel')!;
    const loadGamePanel = document.getElementById('load-game-panel')!;

    function show(panel: HTMLElement | null): void {
        mainMenu.hidden = panel !== null;
        newGamePanel.hidden = panel !== newGamePanel;
        loadGamePanel.hidden = panel !== loadGamePanel;
        window.scrollTo(0, 0);
    }

    // A yes/no question (modal.ts's showConfirmModal isn't loaded here)
    function confirmBox(title: string, message: string, label: string, onYes: () => void): void {
        const cancel = button('Cancel', 'secondary');
        const yes = button(label, 'danger');
        yes.classList.add('solid');
        const dialog = window.kit.modal({
            title,
            body: [el('p', '', message)],
            actions: [cancel, yes],
            onEscape: () => dialog.close(),
        });
        cancel.addEventListener('click', () => dialog.close());
        yes.addEventListener('click', () => {
            dialog.close();
            onYes();
        });
        cancel.focus();
    }

    // ---------------------------------------------------------
    // The new-game screen
    // ---------------------------------------------------------
    const choice = {
        listing: window.properties.listings[0],
        leaseYears: 3,
        borrow: false,
        loan: { amount: 100000, termYears: 7, guarantee: false, collateral: false } as LoanTerms,
    };

    const form = el('form', 'stack');
    form.id = 'new-game-form';
    form.noValidate = true;

    function section(number: number, title: string, intro?: string): HTMLElement {
        const card = window.kit.card(`${number}. ${title}`);
        if (intro) card.body.appendChild(el('p', 'muted', intro));
        form.appendChild(card.root);
        return card.body;
    }

    // 1. The name
    const nameSection = section(1, 'Your pharmacy');
    const nameField = el('div', 'form-field');
    const nameLabel = el('label', '', 'Name');
    nameLabel.htmlFor = 'pharmacy-name';
    const nameInput = el('input', 'input');
    nameInput.id = 'pharmacy-name';
    nameInput.type = 'text';
    nameInput.maxLength = 40;
    nameInput.placeholder = 'Mountain Care';
    nameInput.required = true;
    nameField.append(nameLabel, nameInput);
    nameSection.appendChild(nameField);

    // 2. The property
    const propertySection = section(
        2,
        'Choose a property to lease',
        'Every property comes as built: a front store for customers, a dispensing counter, a lab, storage shelves and a ' +
            'refrigerator. More floor space holds more equipment and stock; busier streets bring more customers and cost more.',
    );
    const grid = el('div', 'listing-grid');
    propertySection.appendChild(grid);
    const listingCards = new Map<string, HTMLButtonElement>();
    window.properties.listings.forEach((listing) => {
        const card = el('button', 'listing-card');
        card.type = 'button';
        card.dataset.listing = listing.id;
        const head = el('div', 'listing-head');
        head.append(el('h4', '', listing.address), pill(AREA_NAMES[listing.area], 'info'));
        const zones = listing.building.zones;
        const shelves = window.properties.shelves(listing.building);
        const facts = el('dl', 'definition-grid small');
        const rows: Array<[string, string]> = [
            ['Building', `${listing.building.type}, ${fmt.int(listing.building.sqft)} sq ft`],
            ['Front store', `${fmt.int(zones.frontStore)} sq ft`],
            ['Lab', `${fmt.int(zones.lab)} sq ft`],
            ['Storage', `${fmt.int(zones.storage)} sq ft, ${fmt.int(shelves)} shelves`],
            [
                'Customers',
                `About ${fmt.pct(window.properties.trafficFactor(listing.footTraffic, listing.competitors))} of a typical suburban store's`,
            ],
            [
                'Competition',
                listing.competitors === 0
                    ? 'No other pharmacy within a mile'
                    : `${listing.competitors} other ${listing.competitors === 1 ? 'pharmacy' : 'pharmacies'} within a mile`,
            ],
        ];
        rows.forEach(([label, value]) => facts.append(el('dt', '', label), el('dd', '', value)));
        const rent = el('div', 'listing-rent', `${fmt.moneyWhole(window.properties.monthlyRent(listing, 3))} a month`);
        rent.appendChild(el('span', 'muted small', ' on a 3-year lease'));
        card.append(head, facts, rent, el('p', 'muted small', listing.description));
        card.addEventListener('click', () => {
            choice.listing = listing;
            update();
        });
        grid.appendChild(card);
        listingCards.set(listing.id, card);
    });

    // 3. The lease
    const leaseSection = section(
        3,
        'Sign the lease',
        'A longer lease is cheaper a month. The deposit is a month’s rent, held by the landlord until the lease ends; ' +
            'the first month’s rent is due when you sign, and then on the 1st of each month. At the end the lease ' +
            'renews for the same term, with the rent up 3% a year.',
    );
    const leaseTerm = window.kit.segmented(
        window.properties.LEASE_YEARS.map((years) => ({
            value: years,
            label: `${years} year${years === 1 ? '' : 's'}`,
        })),
        choice.leaseYears,
        (years) => {
            choice.leaseYears = years;
            update();
        },
    );
    leaseTerm.root.id = 'lease-term';
    const leaseLine = el('p');
    leaseSection.append(leaseTerm.root, leaseLine);

    // 4. The startup loan
    const loanSection = section(
        4,
        'Negotiate a startup loan',
        'Optional. Repaid monthly from the 1st of next month, over 5 to 10 years. A longer term, or borrowing more than ' +
            'the $100,000 you put in, costs more interest; a personal guarantee, or the equipment as collateral, costs ' +
            'less. The bank’s line of credit (up to $50,000, day to day) is there either way.',
    );
    const borrow = checkbox('Borrow from the bank', choice.borrow, (on) => {
        choice.borrow = on;
        update();
    });
    borrow.input.id = 'take-loan';
    const loanFields = el('div', 'loan-fields');
    const amountField = el('div', 'form-field');
    const amountLabel = el('label', '');
    amountLabel.htmlFor = 'loan-amount';
    const amountInput = el('input', 'range');
    amountInput.id = 'loan-amount';
    amountInput.type = 'range';
    amountInput.min = String(window.lending.AMOUNT_STEP);
    amountInput.step = String(window.lending.AMOUNT_STEP);
    amountInput.addEventListener('input', () => {
        choice.loan.amount = Number(amountInput.value);
        update();
    });
    amountField.append(amountLabel, amountInput);
    const termSelect = window.kit.select(
        Array.from({ length: window.lending.MAX_TERM_YEARS - window.lending.MIN_TERM_YEARS + 1 }, (_, i) => {
            const years = window.lending.MIN_TERM_YEARS + i;
            return { value: years, label: `${years} years` };
        }),
        choice.loan.termYears,
        (value) => {
            choice.loan.termYears = Number(value);
            update();
        },
    );
    termSelect.id = 'loan-term';
    termSelect.setAttribute('aria-label', 'Loan term');
    const guarantee = checkbox('Personal guarantee: you’re liable if the business can’t repay', false, (on) => {
        choice.loan.guarantee = on;
        update();
    });
    guarantee.input.id = 'loan-guarantee';
    const collateral = checkbox('Offer the equipment as collateral', false, (on) => {
        choice.loan.collateral = on;
        update();
    });
    collateral.input.id = 'loan-collateral';
    const offers = el('div', 'stack loan-offers');
    offers.append(termSelect, guarantee.root, collateral.root);
    const quoteBox = el('div');
    loanFields.append(amountField, offers, quoteBox);
    loanSection.append(borrow.root, loanFields);

    // 5. The money
    const moneySection = section(5, 'The money');
    const moneyBox = el('div', 'columns');
    const moneyNote = el('div', 'callout warn');
    moneySection.append(moneyBox, moneyNote);

    const actions = el('div', 'toolbar menu-actions');
    const back = button('Back', 'secondary', () => show(null));
    back.id = 'new-game-back';
    const start = button('Open the pharmacy', 'primary');
    start.type = 'submit';
    start.classList.add('start-button');
    actions.append(back, start);
    form.appendChild(actions);
    newGamePanel.appendChild(form);

    function loanTerms(): LoanTerms | null {
        return choice.borrow ? { ...choice.loan } : null;
    }

    function update(): void {
        listingCards.forEach((card, id) => {
            const selected = id === choice.listing.id;
            card.classList.toggle('selected', selected);
            card.setAttribute('aria-pressed', String(selected));
        });

        // The lease
        const rent = window.properties.monthlyRent(choice.listing, choice.leaseYears);
        leaseTerm.set(choice.leaseYears);
        leaseLine.textContent =
            `${choice.listing.address}: ${fmt.moneyWhole(rent)} a month for ${choice.leaseYears} ` +
            `year${choice.leaseYears === 1 ? '' : 's'}, and a ${fmt.moneyWhole(rent)} deposit.`;

        // The loan: the cap is the bank's for this property
        const max = window.lending.maxAmount('retail', choice.listing, choice.leaseYears);
        amountInput.max = String(max);
        choice.loan.amount = Math.min(max, Math.max(window.lending.AMOUNT_STEP, choice.loan.amount));
        amountInput.value = String(choice.loan.amount);
        amountLabel.textContent = `Borrow ${fmt.moneyWhole(choice.loan.amount)} (the bank lends up to ${fmt.moneyWhole(max)} for this property)`;
        loanFields.hidden = !choice.borrow;
        const terms = loanTerms();
        const quote = terms ? window.lending.quote(terms) : null;
        quoteBox.innerHTML = '';
        if (quote && terms) {
            const rate = table([{ label: 'Interest rate' }, { label: '', num: true }]);
            quote.parts.forEach((part) =>
                rate.row([
                    part.label,
                    `${part.points > 0 && part.label !== 'Base rate' ? '+' : ''}${part.points.toFixed(2)}%`,
                ]),
            );
            rate.row(['Your rate', fmt.pct(quote.rate, 2)], 'total');
            rate.row(['Each month', fmt.money(quote.monthlyPayment)]);
            rate.row([`Interest over ${terms.termYears} years`, fmt.moneyWhole(quote.totalInterest)]);
            quoteBox.appendChild(rate.root);
        }

        // The money: day one, and a month
        const loanAmount = terms?.amount ?? 0;
        const dayOne = table([{ label: 'Day one' }, { label: '', num: true }]);
        dayOne.row(['Your money', fmt.moneyWhole(MENU_STARTING_CASH)]);
        if (loanAmount > 0) dayOne.row(['Startup loan', fmt.moneyWhole(loanAmount)]);
        dayOne.row(['Lease deposit', fmt.moneyWhole(-rent)]);
        dayOne.row(['First month’s rent', fmt.moneyWhole(-rent)]);
        const cash = MENU_STARTING_CASH + loanAmount - 2 * rent;
        dayOne.row(['Cash to open with', fmt.moneyWhole(cash)], 'total');
        dayOne.note('Then staff to hire, stock to buy and equipment to add.');

        const crew = STARTING_CREW.reduce((sum, c) => sum + c.salary, 0) * (MENU_PAYROLL_LOAD / 12);
        const services =
            window.properties.servicesPerDay(choice.listing.area, choice.listing.building.sqft) * MONTH_DAYS;
        const payment = quote?.monthlyPayment ?? 0;
        const month = table([{ label: 'A month' }, { label: '', num: true }]);
        month.row(['A pharmacist, a technician and a cashier', fmt.moneyWhole(crew)]);
        month.row(['Rent', fmt.moneyWhole(rent)]);
        month.row(['Utilities and services', fmt.moneyWhole(services)]);
        if (payment > 0) month.row(['Loan payment', fmt.moneyWhole(payment)]);
        const monthly = crew + rent + services + payment;
        month.row(['Before any sales', fmt.moneyWhole(monthly)], 'total');
        month.note('Plus materials to make what you sell.');

        moneyBox.innerHTML = '';
        moneyBox.append(dayOne.root, month.root);

        // How long the cash lasts with no sales, against the wait for the
        // first insurance payment
        const weeks = monthly > 0 ? (cash / monthly) * (MONTH_DAYS / 7) : 0;
        const enough = weeks >= (2 * FIRST_PAYDAY) / 7;
        moneyNote.className = `callout ${enough ? 'good' : 'warn'}`;
        moneyNote.textContent =
            'Insurers pay what they owe every other week, so the first insurance money comes at closing on day ' +
            `${FIRST_PAYDAY}. What you open with covers about ${weeks.toFixed(1)} weeks of these costs with no sales at ` +
            'all. ' +
            (enough
                ? 'That carries you past the first payday, with room for stock and equipment; a bigger crew or a ' +
                  'slow start shortens it, and the bank’s line of credit is there for a bad stretch.'
                : 'That’s cutting it close: a slow start could run the cash out before the insurers pay. A startup ' +
                  'loan, or a cheaper property, gives you more room.');
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        if (!name) {
            window.toast('Give your pharmacy a name.', 'warn');
            nameInput.focus();
            return;
        }
        const options: NewGameOptions = {
            pharmacyName: name,
            propertyId: choice.listing.id,
            leaseYears: choice.leaseYears,
            loan: loanTerms(),
        };
        start.disabled = true;
        api?.startNewGame?.(options)
            .then(() => {
                window.location.href = 'main.html?mode=new';
            })
            .catch((error) => {
                console.error('Error starting new game:', error);
                start.disabled = false;
                window.toast('The game could not be started.', 'error');
            });
    });

    update();

    // ---------------------------------------------------------
    // Load: every save, newest first, with its game's name
    // ---------------------------------------------------------
    const saveList = document.getElementById('save-list')!;

    async function listSaves(): Promise<void> {
        saveList.innerHTML = '';
        saveList.appendChild(el('p', 'muted', 'Reading saves…'));
        let saves: SaveSlotInfo[] = [];
        try {
            saves = (await api?.getSavedGames?.()) ?? [];
        } catch (error) {
            console.error('Error loading saved games:', error);
        }
        saveList.innerHTML = '';
        if (saves.length === 0) {
            saveList.appendChild(el('p', 'no-saves muted', 'No saved games yet.'));
            return;
        }
        const rows = table([
            { label: 'Game' },
            { label: 'Day', num: true },
            { label: 'Cash', num: true },
            { label: 'Saved', width: '170px' },
            { label: '', className: 'actions' },
        ]);
        saveList.appendChild(rows.root);
        saves.forEach((save) => {
            const name = el('span');
            name.appendChild(window.kit.primaryCell(save.companyName, save.name !== save.companyName ? save.name : ''));
            if (save.kind === 'auto') name.appendChild(pill('Autosave', 'info'));
            if (save.daysInRed > 0) name.appendChild(pill(`${save.daysInRed} in the red`, 'critical'));
            const remove = button(
                'Delete',
                'ghost',
                (event) => {
                    event.stopPropagation();
                    confirmBox(
                        'Delete this save?',
                        `Delete “${save.name}” (${save.companyName}, day ${save.day})? This can't be undone.`,
                        'Delete',
                        async () => {
                            await api?.deleteSavedGame?.(save.slot);
                            listSaves();
                        },
                    );
                },
                { small: true },
            );
            remove.classList.add('delete-button');
            const row = rows.row([
                name,
                fmt.int(save.day),
                el('span', save.cash < 0 ? 'critical-text' : '', fmt.money(save.cash)),
                save.lastSaved ? new Date(save.lastSaved).toLocaleString('en-US') : '—',
                remove,
            ]);
            row.classList.add('save-item');
            row.tabIndex = 0;
            const load = (): void => {
                api?.selectSave?.(save.slot)
                    .then(() => {
                        window.location.href = 'main.html?mode=load';
                    })
                    .catch((error) => {
                        console.error('Error loading game:', error);
                        window.toast('That save could not be loaded.', 'error');
                    });
            };
            row.addEventListener('click', load);
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') load();
            });
        });
    }

    // ---------------------------------------------------------
    // The menu
    // ---------------------------------------------------------
    document.getElementById('newGameBtn')!.addEventListener('click', () => {
        show(newGamePanel);
        nameInput.focus();
    });
    document.getElementById('loadGameBtn')!.addEventListener('click', () => {
        show(loadGamePanel);
        listSaves();
    });
    document.getElementById('settingsBtn')!.addEventListener('click', () => {
        window.location.href = 'settings.html';
    });
    document.getElementById('exitBtn')!.addEventListener('click', () => api?.quit?.());
    document.getElementById('load-game-back')!.addEventListener('click', () => show(null));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !document.querySelector('.modal-backdrop')) show(null);
    });

    if (!api) {
        mainMenu.innerHTML = '';
        mainMenu.appendChild(
            el('div', 'callout critical', 'This game runs in its own window: start it from the installed app.'),
        );
    }

    // Errors on the menu: log them, and say so
    window.addEventListener('error', (event) => {
        if (!event.error) return;
        console.error('Application error:', event.error);
        api?.logError?.({ message: String(event.error.message), stack: String(event.error.stack ?? '') });
        window.toast(`Something went wrong: ${event.error.message}`, 'error');
    });
})();
