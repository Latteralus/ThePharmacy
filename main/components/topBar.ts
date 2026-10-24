// topBar.js - the bar across the top: the pharmacy, its money, the clock
// with pause and speed (Space, 1-4), Save and notifications.

// Notifications. Timestamps are game time, like everything else the player
// reads in the game. They're saved with the game (Phase 10), so a load
// brings back that game's. updateUI finds the badge and list by id, so it
// does nothing until renderTopBar's element is on the page; renderTopBar
// draws the badge from unreadCount itself.
(function () {
    window.notifications = {
        items: [],
        unreadCount: 0,
        nextId: 1,

        add: function (message: string, type = 'info'): number {
            const notification: NotificationItem = {
                id: this.nextId++,
                message,
                type,
                timestamp: new Date(window.clock.now()),
                read: false,
            };

            this.items.unshift(notification); // Add to beginning of array
            this.unreadCount++;

            // Limit to most recent 50 notifications
            if (this.items.length > 50) {
                const dropped = this.items.pop()!;
                if (!dropped.read) this.unreadCount--;
            }

            this.updateUI();
            return notification.id;
        },

        restore: function (saved: SavedNotifications): void {
            this.items = saved.items;
            this.unreadCount = saved.items.filter((n) => !n.read).length;
            this.nextId = Math.max(saved.nextId, ...saved.items.map((n) => n.id + 1), 1);
            this.updateUI();
        },

        markAsRead: function (id: number): void {
            const notification = this.items.find((n) => n.id === id);
            if (notification && !notification.read) {
                notification.read = true;
                this.unreadCount--;
                this.updateUI();
            }
        },

        markAllAsRead: function (): void {
            this.items.forEach((n) => {
                n.read = true;
            });
            this.unreadCount = 0;
            this.updateUI();
        },

        updateUI: function (): void {
            const countElem = document.getElementById('notificationCount');
            if (countElem) showUnreadCount(countElem, this.unreadCount);

            const listElem = document.getElementById('notificationsList');
            if (listElem) {
                if (this.items.length === 0) {
                    listElem.innerHTML = '<p class="no-notifications">No new notifications</p>';
                } else {
                    listElem.innerHTML = '';

                    this.items.forEach((notification) => {
                        const notificationItem = document.createElement('div');
                        notificationItem.className = `notification-item ${notification.type} ${notification.read ? 'read' : 'unread'}`;

                        // textContent, not innerHTML - messages can carry
                        // player-supplied text (names, pharmacy name).
                        const messageEl = document.createElement('span');
                        messageEl.className = 'notification-message';
                        messageEl.textContent = notification.message;
                        const timeEl = document.createElement('span');
                        timeEl.className = 'notification-time';
                        timeEl.textContent = window.ui.formatTime(notification.timestamp);
                        notificationItem.append(messageEl, timeEl);

                        // Mark as read when clicked
                        notificationItem.addEventListener('click', () => {
                            this.markAsRead(notification.id);
                            notificationItem.classList.remove('unread');
                            notificationItem.classList.add('read');
                        });

                        listElem.appendChild(notificationItem);
                    });
                }
            }
        },
    };
})();

function showUnreadCount(countElem: HTMLElement, unreadCount: number): void {
    countElem.textContent = String(unreadCount);
    countElem.style.display = unreadCount > 0 ? 'block' : 'none';
}

// End day (#8): what's still going, and what ending now does to it.
function confirmEndDay(): void {
    const { customers, tasksInProgress } = window.timeEvents!.closingPreview();
    const parts: string[] = [];
    if (customers > 0) {
        parts.push(
            `${customers} ${customers === 1 ? 'customer is' : 'customers are'} still in the store and will leave unserved, ` +
                'which costs reputation, as at closing time.' +
                (window.gameState.frontOpen === false ? '' : ' Close the front first and let the line clear.'),
        );
    }
    if (tasksInProgress > 0) {
        parts.push(
            `${tasksInProgress} ${tasksInProgress === 1 ? 'task is' : 'tasks are'} in progress; they keep their progress and carry on tomorrow.`,
        );
    }
    if (parts.length === 0) parts.push('Nothing is in progress.');
    window.showConfirmModal(
        `${parts.join(' ')} Wages and utilities are charged for the full day.`,
        'End day',
        () => window.timeEvents!.endDayNow(),
        { title: 'End the day now?', danger: customers > 0 },
    );
}

// Space pauses, 1-4 pick a speed. Ignored while typing, with a modifier
// held, or while a dialog is open.
function handleTimeHotkeys(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName))) return;
    if (document.querySelector('.modal-backdrop')) return;

    if (event.code === 'Space') {
        event.preventDefault();
        window.toggleGamePause();
        window.ui.updateTime();
    } else if (/^Digit[1-4]$/.test(event.code)) {
        window.setGameSpeed(window.GAME_SPEEDS[Number(event.code.slice(5)) - 1]);
        window.ui.updateTime();
    }
}

let welcomed = false;

window.renderTopBar = function renderTopBar(): HTMLElement {
    const { el } = window.kit;

    // The first top bar of a session greets the player (in game time, so it
    // goes before the badge below is drawn).
    if (!welcomed) {
        welcomed = true;
        // A loaded game brings its notifications back (saved since Phase 10)
        const back = window.notifications!.items.length > 0;
        window.notifications!.add(back ? 'Welcome back to The Pharmacy!' : 'Welcome to The Pharmacy!', 'success');
    }

    const topBar = el('header', 'top-bar');

    // -------- The pharmacy --------
    const title = el('div', 'top-bar-title');
    const name = el('span', 'pharmacy-name', window.company.name || 'Your Pharmacy');
    name.id = 'pharmacyName';
    name.title = name.textContent!;
    title.appendChild(name);
    // The location on screen. With more than one (Phase 18), a switcher.
    const locations = window.company.locations;
    if (locations.length > 1) {
        const switcher = window.kit.select(
            locations.map((loc) => ({ value: loc.id, label: loc.name })),
            window.company.activeId,
            (id) => window.company.select(id),
        );
        switcher.id = 'locationSwitcher';
        switcher.className = 'location-switcher';
        switcher.setAttribute('aria-label', 'Location');
        title.appendChild(switcher);
    } else {
        const place = el('span', 'game-name', window.company.active()?.name ?? 'The Pharmacy');
        place.id = 'locationName';
        place.title = place.textContent!;
        title.appendChild(place);
    }
    topBar.appendChild(title);

    // -------- Money (ui.ts keeps these current on 'finances') --------
    const figures = el('div', 'top-bar-figures');
    const figure = (id: string, label: string, value: number, hint: string): void => {
        const box = el('div', 'top-figure');
        box.title = hint;
        const valueEl = el('span', 'top-figure-value', window.fmt.money(value));
        valueEl.id = id;
        box.append(el('span', 'top-figure-label', label), valueEl);
        figures.appendChild(box);
    };
    figure('currentCash', 'Cash', window.financesData.cash, 'Cash on hand');
    figure('dailyIncome', 'Income today', window.financesData.dailyIncome, 'Everything taken in since opening');
    figure(
        'dailyInsurance',
        'Insurance today',
        window.financesData.dailyInsurance,
        'Claimed from insurers today. Paid on payday, every other week.',
    );
    figure(
        'pendingInsurance',
        'Total insurance owed',
        window.financesData.pendingInsuranceIncome,
        'Claims filed and not yet paid by insurers',
    );
    topBar.appendChild(figures);

    topBar.appendChild(el('div', 'top-bar-spacer'));

    // -------- Clock, pause and speed --------
    const clock = el('div', 'top-bar-clock');

    const controls = el('div', 'time-controls');
    const pauseButton = el('button', 'icon-button');
    pauseButton.id = 'pauseButton';
    pauseButton.type = 'button';
    pauseButton.addEventListener('click', () => {
        window.toggleGamePause();
        window.ui.updateTime();
    });
    const speed = window.kit.segmented(
        window.GAME_SPEEDS.map((value, i) => ({ value, label: `${value}×`, title: `Speed ${value}× (key ${i + 1})` })),
        window.getGameSpeed(),
        (value) => {
            window.setGameSpeed(value);
            window.ui.updateTime();
        },
    );
    speed.root.id = 'speedControl';
    controls.append(pauseButton, speed.root);
    clock.appendChild(controls);

    const timeBox = el('div', 'top-figure');
    const gameTime = el('span', 'game-time', window.fmt.clock(window.gameState.currentDate));
    gameTime.id = 'gameTime';
    const gameDay = el('span', 'game-day');
    gameDay.id = 'gameDay';
    timeBox.append(gameTime, gameDay);
    clock.appendChild(timeBox);

    // -------- The store: open, front closed or closed (#8) --------
    const storeStatus = el('span');
    storeStatus.id = 'storeStatus';
    const frontButton = el('button', 'icon-button', 'Close front');
    frontButton.id = 'frontButton';
    frontButton.type = 'button';
    frontButton.addEventListener('click', () => {
        window.timeEvents?.setFrontOpen(window.gameState.frontOpen === false);
        window.ui.updateTime();
    });
    const endDayButton = el('button', 'icon-button', 'End day');
    endDayButton.id = 'endDayButton';
    endDayButton.type = 'button';
    endDayButton.title = 'End the day now: settle wages and overhead, and open tomorrow at 07:00';
    endDayButton.addEventListener('click', confirmEndDay);
    const store = el('div', 'store-controls');
    store.append(storeStatus, frontButton, endDayButton);
    clock.appendChild(store);
    topBar.appendChild(clock);

    // Pause, speed and the store follow the 'time' announcement, which the
    // render loop makes every frame.
    const showClockState = (): void => {
        const paused = !!window.gameState?.isPaused;
        const label = paused ? '▶ Resume' : '❚❚ Pause';
        if (pauseButton.textContent !== label) pauseButton.textContent = label;
        pauseButton.classList.toggle('paused', paused);
        pauseButton.title = paused ? 'Resume (Space)' : 'Pause (Space)';
        speed.set(window.getGameSpeed());

        const open = !!window.gameState?.isDayActive;
        const frontOpen = window.gameState?.frontOpen !== false;
        const status = !open ? 'Closed' : frontOpen ? 'Open' : 'Front closed';
        if (storeStatus.textContent !== status) {
            storeStatus.textContent = status;
            storeStatus.className = `pill ${!open ? 'critical' : frontOpen ? 'good' : 'warn'}`;
        }
        const frontLabel = frontOpen ? 'Close front' : 'Open front';
        if (frontButton.textContent !== frontLabel) {
            frontButton.textContent = frontLabel;
            frontButton.title = frontOpen
                ? 'Stop new customers coming in. Those inside are still served, and staff keep working.'
                : 'Let customers in again, from the next hour';
        }
        frontButton.disabled = !open;
        endDayButton.disabled = !open;
    };
    showClockState();
    window.ui.subscribe('time', showClockState);
    window.ui.updateTime();

    // Bound for as long as this bar is on the page
    const onKeyDown = (event: KeyboardEvent): void => {
        if (!topBar.isConnected) {
            document.removeEventListener('keydown', onKeyDown);
            return;
        }
        handleTimeHotkeys(event);
    };
    document.addEventListener('keydown', onKeyDown);

    // -------- Save and notifications --------
    const saveButton = el('button', 'icon-button save-button', 'Save');
    saveButton.type = 'button';
    saveButton.title = 'Save game (Ctrl+S)';
    saveButton.addEventListener('click', () => {
        if (typeof window.saveGame === 'function') {
            window.saveGame();
        } else {
            console.error('window.saveGame is not available');
        }
    });
    topBar.appendChild(saveButton);

    const notificationsButton = el('button', 'icon-button notifications-button', '🔔');
    notificationsButton.type = 'button';
    notificationsButton.title = 'Notifications';
    notificationsButton.setAttribute('aria-label', 'Notifications');
    const notificationCount = el('span', 'notification-count');
    notificationCount.id = 'notificationCount';
    showUnreadCount(notificationCount, window.notifications!.unreadCount);
    notificationsButton.appendChild(notificationCount);
    topBar.appendChild(notificationsButton);

    const panel = el('div', 'notifications-panel');
    panel.id = 'notificationsPanel';
    panel.style.display = 'none';
    const panelHeader = el('div', 'notifications-header');
    panelHeader.appendChild(el('h3', '', 'Notifications'));
    panelHeader.appendChild(
        window.kit.button('Mark all read', 'ghost', () => window.notifications!.markAllAsRead(), { small: true }),
    );
    panel.appendChild(panelHeader);
    const list = el('div', 'notifications-list');
    list.id = 'notificationsList';
    panel.appendChild(list);
    topBar.appendChild(panel);

    // Clicking anywhere else closes the panel
    const closePanel = (event: MouseEvent): void => {
        if (!panel.contains(event.target as Node) && !notificationsButton.contains(event.target as Node)) {
            panel.style.display = 'none';
            document.removeEventListener('mousedown', closePanel);
        }
    };
    notificationsButton.addEventListener('click', () => {
        const opening = panel.style.display === 'none';
        panel.style.display = opening ? 'flex' : 'none';
        if (opening) {
            window.notifications!.updateUI();
            document.addEventListener('mousedown', closePanel);
        } else {
            document.removeEventListener('mousedown', closePanel);
        }
    });

    return topBar;
};
