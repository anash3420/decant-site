import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '.vercel', 'server/.mongo', 'server/.uploads'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // `_`-prefixed names are deliberately unused (e.g. destructuring a field out)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // Shop + admin (browser, React)
  {
    files: ['client/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Context modules export a provider and its useX() hook together, the usual React pattern
  {
    files: ['client/src/context/*.tsx', 'client/src/admin/AuthContext.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // API, scripts, shared code and config files (Node)
  {
    files: ['server/**/*.ts', 'shared/**/*.ts', '*.js', 'scripts/*.mjs', 'client/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // Smoke tests poke at raw JSON responses; `any` is the honest type there
  {
    files: ['server/src/scripts/smoke*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
)
