module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['webextension-polyfill'],
            importNames: ['default'],
            message:
              'Do not import webextension-polyfill directly. Use @/platform/browser instead.',
          },
        ],
        paths: [
          {
            name: 'webextension-polyfill',
            message:
              'Do not import webextension-polyfill directly outside src/platform/. Use @/platform/browser instead.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['src/platform/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
