// The render side: change announcements and pages (ui.ts), the UI kit
// (components/kit.ts), charts, notifications, and dialogs (modals/modal.ts).
//
// Ambient typings for the window globals: every file is a classic
// <script> (no modules), and each module adds its own fields to Window.

interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor: string | string[];
    // A number, or per side ({ top: 2 })
    borderWidth: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>;
    // Any other Chart.js dataset option (borderRadius, maxBarThickness, ...)
    [option: string]: unknown;
}

interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

// charts.ts: what a chart shows. Series take --series-1, --series-2 in order.
type ChartFormat = 'money' | 'number';

interface ChartSeries {
    label: string;
    values: number[];
}

interface ChartSpec {
    type: 'bar' | 'line';
    labels: string[];
    series: ChartSeries[];
    format?: ChartFormat;
    stacked?: boolean;
    // Lines: false lets the y axis start above 0 (bars always start at 0)
    beginAtZero?: boolean;
    suggestedMax?: number;
}

interface ChartsApi {
    draw: (existing: Chart | null, canvas: HTMLCanvasElement, spec: ChartSpec) => Chart | null;
    box: (height?: number) => { box: HTMLDivElement; canvas: HTMLCanvasElement };
}

// Named NotificationItem, not Notification — that name is already lib.dom's
// browser Notification API and would silently declaration-merge with it.
interface NotificationItem {
    id: number;
    message: string;
    type: string;
    timestamp: Date;
    read: boolean;
}

interface NotificationsApi {
    items: NotificationItem[];
    unreadCount: number;
    // The id the next one gets (saved with the game, Phase 10)
    nextId: number;
    add: (message: string, type?: string) => number;
    // A save's notifications replace this session's
    restore: (saved: SavedNotifications) => void;
    markAsRead: (id: number) => void;
    markAllAsRead: () => void;
    updateUI: () => void;
}

// Colour roles for pills, meters and stat-tile subtitles. Status tones are
// for state and always sit next to a label or number.
type Tone = 'neutral' | 'info' | 'brand' | 'good' | 'warn' | 'critical';

// Task kinds, each with a fixed identity colour (--task-*).
type TaskKind = 'compound' | 'fill' | 'desk' | 'consult';

interface Formatters {
    money: (amount: number) => string; // $1,234.56
    moneyWhole: (amount: number) => string; // $1,235
    int: (n: number) => string; // 1,234
    pct: (fraction: number, digits?: number) => string; // 0.25 -> 25%
    signedPct: (fraction: number, digits?: number) => string; // +12% / −5%
    clock: (date: Date) => string; // 09:26
    day: (date: Date) => string; // Mon, Jan 2
    date: (date: Date) => string; // Jan 2, 2026
    duration: (gameMinutes: number) => string; // 12m / 1h 05m
}

interface PlayerWords {
    customerStage: (status: CustomerStatus) => { label: string; tone: Tone };
    // A ledger category ('overhead' -> 'Utilities and services'), whether it
    // has a label, and the order a P&L lists them in
    category: (key: string) => string;
    isCategory: (key: string) => boolean;
    REVENUE_CATEGORIES: string[];
    EXPENSE_CATEGORIES: string[];
    taskKind: (task: Task) => TaskKind;
    taskLabel: (task: Task) => string;
    taskStatus: (status: TaskStatus) => string;
    prescriptionStatus: (status: PrescriptionStatus) => string;
    departure: (reason: DepartureReason) => { label: string; tone: Tone };
    mood: (mood: number) => { label: string; tone: Tone };
}

type TableCell = Node | string | number | null | undefined;

interface TableColumn {
    label: string;
    num?: boolean;
    width?: string;
    title?: string;
    className?: string;
}

interface DataTable {
    root: HTMLDivElement;
    table: HTMLTableElement;
    tbody: HTMLTableSectionElement;
    row: (cells: TableCell[], className?: string) => HTMLTableRowElement;
    group: (label: string) => HTMLTableRowElement;
    empty: (text: string) => void;
    // A muted full-width row (a summary line inside the table).
    note: (text: string) => HTMLTableRowElement;
    clear: () => void;
}

interface Card {
    root: HTMLElement;
    body: HTMLDivElement;
    setCount: (count: number | string | null) => void;
}

interface StatTile {
    root: HTMLDivElement;
    set: (value: string, sub?: string, subTone?: Tone) => void;
}

interface MeterCell {
    root: HTMLDivElement;
    set: (fraction: number, text: string, tone?: Tone) => void;
}

interface Segmented<T> {
    root: HTMLDivElement;
    set: (value: T) => void;
}

interface Modal {
    root: HTMLDivElement;
    close: () => void;
}

interface Kit {
    el: <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) => HTMLElementTagNameMap[K];
    // A page root with its header, appended to container.
    page: (container: HTMLElement, title: string, subtitle?: string, actions?: Node[]) => HTMLDivElement;
    card: (title?: string, options?: { actions?: Node[]; flush?: boolean }) => Card;
    statTile: (label: string) => StatTile;
    meter: (fraction: number, tone?: Tone) => HTMLDivElement;
    setMeter: (meter: HTMLElement, fraction: number, tone?: Tone) => void;
    meterCell: (fraction: number, text: string, tone?: Tone) => MeterCell;
    pill: (text: string, tone?: Tone) => HTMLSpanElement;
    button: (
        label: string,
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost',
        onClick?: (event: MouseEvent) => void,
        options?: { small?: boolean; title?: string },
    ) => HTMLButtonElement;
    numberInput: (
        value: number | string,
        options?: {
            min?: number;
            max?: number;
            step?: number | string;
            width?: string;
            small?: boolean;
            label?: string;
        },
    ) => HTMLInputElement;
    select: <T extends string | number>(
        options: Array<{ value: T; label: string }>,
        current: T,
        onChange?: (value: string) => void,
    ) => HTMLSelectElement;
    checkbox: (
        label: string,
        checked: boolean,
        onChange: (checked: boolean) => void,
    ) => { root: HTMLLabelElement; input: HTMLInputElement };
    segmented: <T>(
        options: Array<{ value: T; label: string; title?: string }>,
        current: T,
        onChange: (value: T) => void,
    ) => Segmented<T>;
    tabs: (
        labels: string[],
        onChange: (index: number) => void,
    ) => { root: HTMLDivElement; select: (index: number) => void };
    table: (columns: TableColumn[]) => DataTable;
    swatch: (kind: TaskKind) => HTMLSpanElement;
    // Bold primary text with an optional muted line under it, for table cells.
    primaryCell: (primary: string, sub?: string) => HTMLSpanElement;
    modal: (options: {
        title: string;
        subtitle?: string;
        body: Node[];
        actions: Node[];
        className?: string;
        onEscape?: () => void;
    }) => Modal;
}

type ToastTone = 'info' | 'success' | 'warn' | 'error';

// What a system announces with window.updateUI(topic) when it changes
// state a page shows. 'inventory' covers product stock and prices and
// material stock.
type ChangeTopic =
    | 'time'
    | 'finances'
    | 'customers'
    | 'prescriptions'
    | 'tasks'
    | 'employees'
    | 'inventory'
    | 'equipment'
    | 'research';

// Handed to each page renderer by showPage, for as long as the page is shown.
interface PageScope {
    // Calls fn (once per frame at most) whenever `topic` is announced.
    on: (topic: ChangeTopic, fn: () => void) => void;
    // Calls fn when the player navigates away.
    onLeave: (fn: () => void) => void;
}

type PageRenderer = (container: HTMLElement, page: PageScope) => void;

interface UiApi {
    formatDate: (dateObj: Date) => string;
    formatTime: (dateObj: Date) => string;
    formatDateTime: (dateObj: Date) => string;
    updateTime: () => void;
    updateUI: (topic: ChangeTopic) => void;
    // Returns an unsubscribe function. Pages use PageScope.on instead.
    subscribe: (topic: ChangeTopic, fn: () => void) => () => void;
    // Handles queued announcements now instead of on the next frame (tests).
    flush: () => void;
    showPage: (pageName: string) => void;
}

// chart.js is loaded via a plain <script> tag (main.html), not imported, so
// TS has no ambient knowledge of it. Minimal shape covering only what
// financesPage.ts actually calls (`new Chart(ctx, {type, data, options})`).
declare class Chart {
    constructor(
        ctx: CanvasRenderingContext2D,
        config: { type: string; data: ChartData; options?: Record<string, unknown> },
    );
    data: ChartData;
    // 'none' redraws without animating
    update(mode?: string): void;
    destroy(): void;
}

interface Window {
    showDailySummaryModal: (onNextDay?: () => void) => void;
    // A closed day's summary from its record (the Dashboard's past days)
    showDayRecordModal: (day: number) => void;
    // Game over (bankruptcy), and the win (every goal reached)
    showGameOverModal: () => void;
    showVictoryModal: (onContinue?: () => void) => void;
    // Closes the daily summary, game-over or win dialog without acting on it (a load)
    closeSessionModals: () => void;
    // A dialog a load closes without acting on it (modal.ts): the daily
    // summary, a report at closing, game over and the win
    openSessionDialog: (options: Parameters<Kit['modal']>[0]) => Modal;
    showConfirmModal: (
        message: string,
        confirmLabel: string,
        onConfirm: () => void,
        options?: { title?: string; danger?: boolean },
    ) => void;
    // Required even though their owning file (main.js/game-bootstrap.js)
    // hasn't converted yet: sideBar.ts/topBar.ts/customers.ts call these
    // unconditionally (no typeof guard), so they must always be defined by
    // the time those files run — which script load order already guarantees
    // at runtime. debug.ts's `typeof window.x !== 'undefined'` checks still
    // compile fine against a required type.
    showPage: (pageName: string) => void;
    currentPage: string;
    notifications?: NotificationsApi;
    // Page renderers. showPage looks them up by name (`render${Page}Page`)
    // and passes each a PageScope for the time it's on screen.
    renderOperationsPage?: PageRenderer;
    renderInventoryPage?: PageRenderer;
    renderEquipmentPage?: PageRenderer;
    renderResearchPage?: PageRenderer;
    renderMarketplacePage?: PageRenderer;
    renderEmployeesPage?: PageRenderer;
    renderFinancesPage?: PageRenderer;
    renderSettingsPage?: PageRenderer;
    renderDashboardPage?: PageRenderer;
    renderCustomersPage?: PageRenderer;
    renderStatisticsPage?: PageRenderer;
    ui: UiApi;
    fmt: Formatters;
    words: PlayerWords;
    kit: Kit;
    charts: ChartsApi;
    toast: (message: string, tone?: ToastTone, options?: { sticky?: boolean }) => HTMLDivElement;
    renderTopBar: () => HTMLElement;
    renderSidebar: () => HTMLElement;
    updateActiveNavItem: (pageName: string) => void;
    updateUI: (topic: ChangeTopic) => void;
}
