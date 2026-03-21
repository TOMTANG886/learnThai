module.exports = {
  ignorePatterns: ['node_modules/', '.next/', 'out/', 'dist/', 'coverage/'],
  extends: ['next/core-web-vitals', 'eslint-config-prettier', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-console': 'warn',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  ],
}
