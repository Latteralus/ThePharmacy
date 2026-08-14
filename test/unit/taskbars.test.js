/**
 * Regression tests for the consolidated tasking-engine progress bar
 * (main/js/taskbars.js is now the single system all pages render through).
 */

describe('taskbars.createProgressBar', () => {
  beforeEach(() => {
    jest.resetModules();
    require('../../main/js/taskbars.js');
  });

  test('exposes window.taskbars.createProgressBar', () => {
    expect(typeof window.taskbars).toBe('object');
    expect(typeof window.taskbars.createProgressBar).toBe('function');
  });

  test('never renders progress/time text with more than two decimal places', () => {
    // A task whose progress is a repeating fraction (1/3 minutes elapsed of
    // an 8-minute task) - the exact shape of value that used to leak
    // "1.000000000000"-style floats into the UI.
    const task = {
      id: 'task-1',
      type: 'compound',
      totalTime: 8,
      progress: 8 / 3,
    };

    const bar = window.taskbars.createProgressBar(task);
    const percentText = bar.querySelector('.progress-percent').textContent;
    const timeText = bar.querySelector('.time-remaining').textContent;

    expect(percentText).toMatch(/^\d+%$/);
    expect(timeText).toMatch(/^\d+:\d{2} remaining$/);

    // Belt-and-suspenders: no run of 3+ decimal digits anywhere in the bar's
    // visible text (covers the percent/time text plus the tooltip).
    expect(bar.textContent).not.toMatch(/\.\d{3,}/);
    expect(bar.title).not.toMatch(/\.\d{3,}/);
  });

  test('clamps percent to 100% when progress exceeds totalTime', () => {
    const task = { id: 'task-2', type: 'fillPrescription', totalTime: 5, progress: 5.7 };
    const bar = window.taskbars.createProgressBar(task);
    expect(bar.querySelector('.progress-percent').textContent).toBe('100%');
  });
});
