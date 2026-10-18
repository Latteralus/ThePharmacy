// topBar.js - the bar across the top: the pharmacy, its money, the clock
// with pause and speed (Space, 1-4), Save and notifications.

// Notifications. Timestamps are game time, like everything else the player
// reads in the game. updateUI finds the badge and list by id, so it does
// nothing until renderTopBar's element is on the page; renderTopBar draws
// the badge from unreadCount itself.
(function () {
    let nextNotificationId = 1;
    window.notifications = {
        items: [],
        unreadCount: 0,

        add: function (message: string, type = 'info'): number {
            const notification: NotificationItem = {
                id: nextNotificationId++,
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

const GAME_SPEEDS = [0.5, 1, 2, 5];

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
        window.setGameSpeed(GAME_SPEEDS[Number(event.code.slice(5)) - 1]);
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
        window.notifications!.add('Welcome to The Pharmacy!', 'success');
    }

    const topBar = el('header', 'top-bar');

    // -------- The pharmacy --------
    const title = el('div', 'top-bar-title');
    const name = el('span', 'pharmacy-name', window.gameState.pharmacyName || 'Your Pharmacy');
    name.id = 'pharmacyName';
    name.title = name.textContent!;
    title.append(name, el('span', 'game-name', 'The Pharmacy'));
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
        'pendingInsurance',
        'Insurance owed',
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
        GAME_SPEEDS.map((value, i) => ({ value, label: `${value}×`, title: `Speed ${value}× (key ${i + 1})` })),
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

    const storeStatus = el('span');
    storeStatus.id = 'storeStatus';
    clock.appendChild(storeStatus);
    topBar.appendChild(clock);

    // Pause, speed and open/closed follow the 'time' announcement, which the
    // render loop makes every frame.
    const showClockState = (): void => {
        const paused = !!window.gameState?.isPaused;
        const label = paused ? '▶ Resume' : '❚❚ Pause';
        if (pauseButton.textContent !== label) pauseButton.textContent = label;
        pauseButton.classList.toggle('paused', paused);
        pauseButton.title = paused ? 'Resume (Space)' : 'Pause (Space)';
        speed.set(window.getGameSpeed());
        const open = !!window.gameState?.isDayActive;
        const status = open ? 'Open' : 'Closed';
        if (storeStatus.textContent !== status) {
            storeStatus.textContent = status;
            storeStatus.className = open ? 'pill good' : 'pill critical';
        }
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
