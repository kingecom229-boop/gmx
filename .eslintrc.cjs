/* eslint-env node */
/**
 * Configuration ESLint (format « eslintrc », ESLint 8).
 * `npm run lint` échouait faute de fichier de configuration : toute la
 * vérification statique promise par le README était donc inopérante.
 */
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  settings: { react: { version: '18.3' } },
  ignorePatterns: ['dist/', 'dist-server/', 'node_modules/', 'coverage/', '*.config.js', 'tests/setup.ts'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    eqeqeq: ['error', 'smart'],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
  },
  overrides: [
    {
      // La couche d'accès aux données traverse une frontière PostgREST
      // dynamique : le typage lâche y est assumé et documenté.
      files: ['server/src/**/*.ts'],
      rules: { '@typescript-eslint/no-explicit-any': 'off' },
    },
    {
      // Scripts en ligne de commande : la sortie console est le seul canal.
      files: ['scripts/**/*.ts'],
      rules: { 'no-console': 'off' },
    },
  ],
};
