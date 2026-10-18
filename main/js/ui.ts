// ui.js - the render side of the game, kept apart from the simulation tick.
//
// Systems announce what changed with window.updateUI(topic) and never touch
// pages directly. Announcements are batched: each topic is handled once, on
// the next animation frame, however many times it was announced.
//
// Pages render through showPage, which gives each page a PageScope. A page
// subscribes to the topics it shows with page.on(topic, fn), and showPage
// drops those subscriptions (and runs page.onLeave cleanups) when the player
// navigates away, so a page that isn't on screen never refreshes itself.

window.ui = (function (): UiApi {
    // ---------------------------------------------------------
    // Change announcements
    // ---------------------------------------------------------
    const subscribers = new Map<ChangeTopic, Set<() => void>>();
    const queued = new Set<ChangeTopic>();
    let frameRequested = false;

    function changed(topic: ChangeTopic): void {
        queued.add(topic);
        if (!frameRequested) {
            frameRequested = true;
            requestAnimationFrame(flush);
        }
    }

    function subscribe(topic: ChangeTopic, fn: () => void): () => void {
        if (!subscribers.has(topic)) subscribers.set(topic, new Set());
        subscribers.get(topic)!.add(fn);
        return () => subscribers.get(topic)?.delete(fn);
    }

    // Handles everything announced since the last frame. A handler
    // subscribed to several of the topics runs once.
    function flush(): void {
        frameRequested = false;
        const topics = Array.from(queued);
        queued.clear();

        const due = new Map<() => void, ChangeTopic>();
        topics.forEach((topic) => {
            if (topic === 'time') updateTimeDisplay();
            if (topic === 'finances') updateFinancialDisplays();
            subscribers.get(topic)?.forEach((fn) => {
                if (!due.has(fn)) due.set(fn, topic);
            });
        });

        due.forEach((topic, fn) => {
            // An earlier handler may have navigated away (showPage), which
            // unsubscribes the old page's handlers.
            if (!subscribers.get(topic)?.has(fn)) return;
            try {
                fn();
            } catch (error) {
                console.error(`[ui.js] Error refreshing ${topic}:`, error);
            }
        });
    }

    // ---------------------------------------------------------
    // Top bar (always on screen, so not a page subscription)
    // ---------------------------------------------------------
    const elements = new Map<string, HTMLElement>();

    // Looks an element up again only once the cached one has left the page.
    function element(id: string): HTMLElement | null {
        const cached = elements.get(id);
        if (cached?.isConnected) return cached;
        const found = document.getElementById(id);
        if (found) elements.set(id, found);
        else elements.delete(id);
        return found;
    }

    function show(id: string, text: string): void {
        const el = element(id);
        if (el && el.textContent !== text) el.textContent = text;
    }

    function updateTimeDisplay(): void {
        if (!window.gameState?.currentDate) return;
        show('gameTime', formatDateTime(window.gameState.currentDate));
    }

    // Same "$X" format renderTopBar starts with (the icons are the labels).
    function updateFinancialDisplays(): void {
        if (!window.financesData) return;
        show('currentCash', `$${window.financesData.cash.toFixed(2)}`);
        show('dailyIncome', `$${window.financesData.dailyIncome.toFixed(2)}`);
        show('pendingInsurance', `$${window.financesData.pendingInsuranceIncome.toFixed(2)}`);
    }

    // ---------------------------------------------------------
    // Pages
    // ---------------------------------------------------------
    let leaveCurrentPage: (() => void) | null = null;

    function showPage(pageName: string): void {
        if (typeof window.updateActiveNavItem === 'function') {
            window.updateActiveNavItem(pageName);
        }

        const mainContent = document.querySelector<HTMLElement>('.main-content');
        if (!mainContent) {
            console.error('Main content container not found');
            return;
        }

        // Leave the previous page first, so nothing it subscribed to can
        // touch the new page's DOM.
        if (leaveCurrentPage) {
            leaveCurrentPage();
            leaveCurrentPage = null;
        }

        mainContent.innerHTML = '';
        window.currentPage = pageName;

        const cleanups: Array<() => void> = [];
        const page: PageScope = {
            on(topic, fn) {
                cleanups.push(subscribe(topic, fn));
            },
            onLeave(fn) {
                cleanups.push(fn);
            },
        };
        leaveCurrentPage = () => {
            cleanups.forEach((fn) => {
                try {
                    fn();
                } catch (error) {
                    console.error(`[ui.js] Error leaving page ${pageName}:`, error);
                }
            });
        };

        const rendererName = `render${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page`;
        const renderer = (window as unknown as Record<string, unknown>)[rendererName];
        if (typeof renderer !== 'function') {
            console.error(`Page renderer not found: ${rendererName}`);
            mainContent.innerHTML = `<div class="error-message">
                <h3>Page Not Found</h3>
                <p>The requested page "${pageName}" does not exist or is still under development.</p>
            </div>`;
            return;
        }

        try {
            (renderer as PageRenderer)(mainContent, page);
        } catch (error) {
            console.error(`Error rendering page ${pageName}:`, error);
            mainContent.innerHTML = `<div class="error-message">
                <h3>Error Loading Page</h3>
                <p>There was an error loading the ${pageName} page.</p>
                <pre>${(error as Error).message}</pre>
            </div>`;
        }
    }

    // --- Helper functions for formatting ---
    function formatDate(dateObj: Date): string {
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const excisedYear = dateObj.getFullYear();
        return `${mm}/${dd}/${excisedYear}`;
    }

    function formatTime(dateObj: Date): string {
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function formatDateTime(dateObj: Date): string {
        return `[${formatDate(dateObj)}] [${formatTime(dateObj)}]`;
    }

    return {
        formatDate,
        formatTime,
        formatDateTime,
        updateUI: changed,
        subscribe,
        flush,
        showPage,
        updateTime: () => changed('time'),
    };
})();

// Bare global aliases: game modules call window.updateUI(topic) and
// window.showPage(name) directly.
window.updateUI = function (topic: ChangeTopic): void {
    window.ui.updateUI(topic);
};
window.showPage = window.ui.showPage;
