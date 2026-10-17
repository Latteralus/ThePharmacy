import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // main/**/*.js is tsc output from the .ts sources (see .gitignore).
    ignores: ['main/**/*.js', 'node_modules/', 'dist/', 'test-results/', 'playwright-report/'],
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
