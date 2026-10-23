// reports.js - monthly and yearly reports (Phase 10, #13).
//
// At the closing that ends a month, a report is written from that month's
// day records (records.ts): profit and loss by category and by location,
// customers, the balance sheet and loans as they stood, and highlights. The
// closing that ends December writes the year's too, from its months. They
// open after the daily summary (unless the player skips them; see
// timeEvents.endOfDay) and are kept for the whole game, so the Dashboard
// and Finances page can reopen them.
//
// They're also what keeps a long game's save small: once a month's report
// exists, ledger entries from before last month are dropped (pruneLedger),
// and day records over DAYS_KEPT days old are dropped with their customer
// counts kept in records.pruned (records.ts).

const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

function monthPeriod(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Whether today's closing is the month's last
function endsMonth(date: Date): boolean {
    const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return tomorrow.getMonth() !== date.getMonth();
}

function addInto(into: Record<string, number>, rows: Record<string, number> | undefined): void {
    Object.entries(rows ?? {}).forEach(([key, amount]) => {
        into[key] = (into[key] ?? 0) + amount;
    });
}

function sumValues(rows: Record<string, number>): number {
    return Object.values(rows).reduce((sum, n) => sum + n, 0);
}

function mergeLocations(lines: ReportLocationLine[]): ReportLocationLine[] {
    const byId = new Map<string, ReportLocationLine>();
    lines.forEach((line) => {
        const total = byId.get(line.id) ?? { id: line.id, name: line.name, revenue: 0, costs: 0, net: 0 };
        total.revenue += line.revenue;
        total.costs += line.costs;
        total.net += line.net;
        total.name = line.name;
        byId.set(line.id, total);
    });
    return Array.from(byId.values());
}

window.reports = (function (): ReportsApi {
    const api: ReportsApi = {
        list: [],

        closeDay() {
            const now = window.gameState.currentDate;
            if (!endsMonth(now)) return [];
            const written: PeriodReport[] = [];
            const month = buildMonth(now);
            if (month) {
                save(month);
                written.push(month);
            }
            if (now.getMonth() === 11) {
                const year = buildYear(now.getFullYear());
                if (year) {
                    save(year);
                    written.push(year);
                }
            }
            api.pruneLedger();
            window.records.pruneDays();
            return written;
        },

        find(kind, period) {
            return api.list.find((r) => r.kind === kind && r.period === period);
        },

        pruneLedger() {
            const now = window.gameState.currentDate;
            const keepFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
            const data = window.financesData;
            const before = data.transactions.length;
            data.transactions = data.transactions.filter((t) => t.date.getTime() >= keepFrom);
            return before - data.transactions.length;
        },
    };

    function save(report: PeriodReport): void {
        const existing = api.list.findIndex((r) => r.kind === report.kind && r.period === report.period);
        if (existing >= 0) api.list[existing] = report;
        else api.list.push(report);
    }

    function balanceNow(): PeriodReport['balance'] {
        const stakes = window.stakes;
        return {
            cash: window.financesData.cash,
            insuranceOwed: window.financesData.pendingInsuranceIncome,
            deposits: window.company.locations.reduce((sum, loc) => sum + loc.lease.deposit, 0),
            creditLine: stakes.loanBalance(),
            termLoans: stakes.termLoanBalance(),
        };
    }

    function loansNow(): ReportLoanLine[] {
        return (window.financesData.loans ?? []).map((loan) => ({
            name: loan.name,
            balance: loan.balance,
            monthlyPayment: loan.monthlyPayment,
            paymentsLeft: Math.max(0, loan.termMonths - loan.paymentsMade),
        }));
    }

    function buildMonth(now: Date): PeriodReport | null {
        const period = monthPeriod(now);
        const days = window.records.days.filter((d) => monthPeriod(new Date(d.date)) === period);
        if (days.length === 0) return null;

        const revenueByCategory: Record<string, number> = {};
        const costsByCategory: Record<string, number> = {};
        const customers: Partial<Record<DepartureReason, number>> = {};
        const lines: ReportLocationLine[] = [];
        const first = window.company.locations[0];
        days.forEach((d) => {
            addInto(revenueByCategory, d.revenueByCategory);
            addInto(costsByCategory, d.costsByCategory);
            addInto(customers as Record<string, number>, d.customers as Record<string, number>);
            // Records from before Phase 10 have no split: the first location's
            lines.push(
                ...(d.byLocation ?? [
                    { id: first.id, name: first.name, revenue: d.revenue, costs: d.costs, net: d.net },
                ]),
            );
        });

        // Principal repaid, from the ledger (the month's entries are all there
        // until pruneLedger runs, after this)
        const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        const principalRepaid = window.financesData.transactions
            .filter((t) => t.category === 'loan' && t.type === 'expense' && t.date.getTime() >= from)
            .reduce((sum, t) => sum + t.amount, 0);

        const ranked = [...days].sort((a, b) => b.net - a.net);
        const before = [...window.records.days].reverse().find((d) => d.day < days[0].day);
        const firstDay = days[0].day;
        const lastDay = days[days.length - 1].day;
        const revenue = sumValues(revenueByCategory);
        const costs = sumValues(costsByCategory);
        return {
            kind: 'month',
            period,
            label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`,
            firstDay,
            lastDay,
            daysOpen: days.length,
            revenueByCategory,
            costsByCategory,
            revenue,
            costs,
            net: revenue - costs,
            byLocation: mergeLocations(lines),
            customers,
            balance: balanceNow(),
            loans: loansNow(),
            principalRepaid,
            interestPaid: costsByCategory.interest ?? 0,
            highlights: {
                bestDay: { day: ranked[0].day, net: ranked[0].net },
                worstDay: { day: ranked[ranked.length - 1].day, net: ranked[ranked.length - 1].net },
                reputationStart: before?.reputation ?? days[0].reputation,
                reputationEnd: days[days.length - 1].reputation,
                staffStart: before?.staff ?? days[0].staff,
                staffEnd: days[days.length - 1].staff,
                goals: goalsBetween(firstDay, lastDay),
            },
        };
    }

    function buildYear(year: number): PeriodReport | null {
        const months = api.list.filter((r) => r.kind === 'month' && r.period.startsWith(`${year}-`));
        if (months.length === 0) return null;
        months.sort((a, b) => a.period.localeCompare(b.period));

        const revenueByCategory: Record<string, number> = {};
        const costsByCategory: Record<string, number> = {};
        const customers: Partial<Record<DepartureReason, number>> = {};
        months.forEach((m) => {
            addInto(revenueByCategory, m.revenueByCategory);
            addInto(costsByCategory, m.costsByCategory);
            addInto(customers as Record<string, number>, m.customers as Record<string, number>);
        });
        const bests = months.map((m) => m.highlights.bestDay).filter((d) => d !== undefined);
        const worsts = months.map((m) => m.highlights.worstDay).filter((d) => d !== undefined);
        const last = months[months.length - 1];
        const revenue = sumValues(revenueByCategory);
        const costs = sumValues(costsByCategory);
        return {
            kind: 'year',
            period: String(year),
            label: String(year),
            firstDay: months[0].firstDay,
            lastDay: last.lastDay,
            daysOpen: months.reduce((sum, m) => sum + m.daysOpen, 0),
            revenueByCategory,
            costsByCategory,
            revenue,
            costs,
            net: revenue - costs,
            byLocation: mergeLocations(months.flatMap((m) => m.byLocation)),
            customers,
            balance: last.balance,
            loans: last.loans,
            principalRepaid: months.reduce((sum, m) => sum + m.principalRepaid, 0),
            interestPaid: months.reduce((sum, m) => sum + m.interestPaid, 0),
            highlights: {
                bestDay: bests.sort((a, b) => b.net - a.net)[0],
                worstDay: worsts.sort((a, b) => a.net - b.net)[0],
                reputationStart: months[0].highlights.reputationStart,
                reputationEnd: last.highlights.reputationEnd,
                staffStart: months[0].highlights.staffStart,
                staffEnd: last.highlights.staffEnd,
                goals: months.flatMap((m) => m.highlights.goals),
            },
        };
    }

    function goalsBetween(firstDay: number, lastDay: number): string[] {
        return (window.goals?.list() ?? [])
            .filter((g) => g.reachedOn !== null && g.reachedOn >= firstDay && g.reachedOn <= lastDay)
            .map((g) => g.label);
    }

    return api;
})();
