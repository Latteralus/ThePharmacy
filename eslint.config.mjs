import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // build/ is tsc output from the .ts sources (see .gitignore).
    ignores: ['build/', 'node_modules/', 'dist/', 'test-results/', 'playwright-report/'],
  },

  js.configs.recommended,

  // Renderer: TypeScript compiled to classic <script> files that share the
  // window global, so top-level declarations are intentionally global.
  {
    files: ['main/**/*.ts'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      sourceType: 'script',
      globals: globals.browser,
    },
    rules: {
      // tsc already resolves identifiers across the shared global scope.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { vars: 'local', args: 'none', caughtErrors: 'none', ignoreRestSiblings: true },
      ],
    },
  },

  // Cash only changes through finances.transact(), which also keeps the
  // ledger, period totals and categories in step.
  {
    files: ['main/**/*.ts'],
    ignores: ['main/js/data/finances.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          // window.financesData.cash = / += / -=, or a local financesData.cash
          selector:
            "AssignmentExpression[left.property.name='cash']:matches([left.object.property.name='financesData'], [left.object.name='financesData'])",
          message: 'Change cash with window.finances.transact(), not by assigning it.',
        },
        {
          selector:
            "UpdateExpression[argument.property.name='cash']:matches([argument.object.property.name='financesData'], [argument.object.name='financesData'])",
          message: 'Change cash with window.finances.transact(), not by assigning it.',
        },
      ],
    },
  },

  // One clock (finding A1): the game schedules on window.clock, in game
  // minutes, so pause and speed apply. Pages refresh on window.updateUI
  // announcements (PageScope.on), not on timers. The dev-only debug overlay
  // and the save file's wall-clock timestamp are the exceptions.
  {
    files: ['main/**/*.ts'],
    ignores: ['main/js/debug.ts', 'main/js/saveFile.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'setInterval', message: 'Use window.clock.every() (game minutes) or a PageScope subscription.' },
        { name: 'setTimeout', message: 'Use window.clock.after() (game minutes) or a PageScope subscription.' },
        // These block the renderer, and with it the game loop (findings L14/U19)
        { name: 'alert', message: 'Use window.toast(message, tone).' },
        { name: 'confirm', message: 'Use window.showConfirmModal(message, label, onConfirm).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'setInterval', message: 'Use window.clock.every() (game minutes).' },
        { object: 'window', property: 'setTimeout', message: 'Use window.clock.after() (game minutes).' },
        { object: 'window', property: 'alert', message: 'Use window.toast(message, tone).' },
        { object: 'window', property: 'confirm', message: 'Use window.showConfirmModal(message, label, onConfirm).' },
        { object: 'Date', property: 'now', message: 'Use window.clock.now() (game time), or window.nextId() for ids.' },
      ],
    },
  },

  // Electron main/preload, configs, and tests: CommonJS on Node.
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    files: ['test/unit/**/*.js'],
    languageOptions: {
      globals: { ...globals.jest, ...globals.browser },
    },
  },
  {
    files: ['test/e2e/**/*.js'],
    languageOptions: {
      globals: globals.browser,
    },
  },
);
