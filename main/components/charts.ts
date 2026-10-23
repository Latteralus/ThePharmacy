// charts.js - the game's Chart.js charts, one look everywhere (Finances,
// Dashboard, Statistics). Series colours come from the --series-* tokens in
// fixed order; status colours are never used for a series. Thin rounded
// bars, 2px lines, hairline grid, a legend only when there are two or more
// series, and a tooltip on hover (findings section 9.1; the dataviz method).
//
// Chart.js is loaded by main.html after this file, so everything here looks
// it up when a chart is drawn. Without it (unit tests) nothing is drawn.

(function () {
    function token(name: string, fallback: string): string {
        const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return value || fallback;
    }

    function colours(): { series: string[]; surface: string; grid: string; muted: string } {
        return {
            series: [token('--series-1', '#2a78d6'), token('--series-2', '#eb6834')],
            surface: token('--surface', '#ffffff'),
            grid: token('--line', '#e3e5ec'),
            muted: token('--ink-muted', '#7a8294'),
        };
    }

    function tickFor(format: ChartFormat): (value: number) => string {
        if (format === 'money') {
            return (value) => {
                const abs = Math.abs(value);
                const sign = value < 0 ? '−' : '';
                if (abs >= 1000000) return `${sign}$${+(abs / 1000000).toFixed(1)}M`;
                if (abs >= 1000) return `${sign}$${+(abs / 1000).toFixed(1)}K`;
                return `${sign}$${abs}`;
            };
        }
        return (value) => window.fmt.int(value);
    }

    function show(format: ChartFormat, value: number): string {
        return format === 'money' ? window.fmt.money(value) : window.fmt.int(value);
    }

    function options(spec: ChartSpec, legend: boolean): Record<string, unknown> {
        const { grid, muted } = colours();
        const format = spec.format ?? 'number';
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: legend,
                    position: 'top',
                    align: 'start',
                    labels: { boxWidth: 10, boxHeight: 10, color: muted },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx: { dataset: { label: string }; raw: number }) =>
                            `${ctx.dataset.label}: ${show(format, ctx.raw)}`,
                    },
                },
            },
            scales: {
                x: { stacked: !!spec.stacked, grid: { display: false }, ticks: { color: muted, maxRotation: 0 } },
                y: {
                    stacked: !!spec.stacked,
                    beginAtZero: spec.type === 'bar' || spec.beginAtZero !== false,
                    suggestedMax: spec.suggestedMax,
                    grid: { color: grid },
                    border: { display: false },
                    ticks: { color: muted, callback: tickFor(format), maxTicksLimit: 6 },
                },
            },
        };
    }

    function dataset(spec: ChartSpec, series: ChartSeries, colour: string): ChartDataset {
        if (spec.type === 'line') {
            return {
                label: series.label,
                data: series.values,
                backgroundColor: colour,
                borderColor: colour,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
                tension: 0,
            };
        }
        if (spec.stacked) {
            // A 2px surface-coloured edge on top of each segment parts it
            // from the one above, instead of a border around it
            return {
                label: series.label,
                data: series.values,
                backgroundColor: colour,
                borderColor: colours().surface,
                borderWidth: { top: 2 },
                borderSkipped: 'bottom',
                maxBarThickness: 24,
            };
        }
        return {
            label: series.label,
            data: series.values,
            backgroundColor: colour,
            borderColor: colour,
            borderWidth: 0,
            borderRadius: { topLeft: 4, topRight: 4 },
            borderSkipped: 'bottom',
            maxBarThickness: 24,
        };
    }

    function chartData(spec: ChartSpec): ChartData {
        const { series } = colours();
        return {
            labels: spec.labels,
            datasets: spec.series.map((s, i) => dataset(spec, s, series[i % series.length])),
        };
    }

    window.charts = {
        // Draws the chart into canvas, or updates the one already there (same
        // series), without animating. Returns null if Chart.js isn't loaded.
        draw(existing, canvas, spec) {
            if (typeof Chart === 'undefined') return null;
            const data = chartData(spec);
            if (existing) {
                existing.data.labels = data.labels;
                data.datasets.forEach((ds, i) => {
                    if (existing.data.datasets[i]) existing.data.datasets[i].data = ds.data;
                });
                existing.update('none');
                return existing;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            return new Chart(ctx, { type: spec.type, data, options: options(spec, spec.series.length > 1) });
        },

        // A canvas in a fixed-height box, ready for draw()
        box(height) {
            const box = window.kit.el('div', 'chart-box');
            if (height) box.style.height = `${height}px`;
            const canvas = window.kit.el('canvas');
            box.appendChild(canvas);
            return { box, canvas };
        },
    };
})();
