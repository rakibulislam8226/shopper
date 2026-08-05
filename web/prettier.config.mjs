/**
 * Frontend Prettier configuration — self-contained (identical rules to the
 * backend's, kept separate on purpose so web/ has no outside dependencies).
 *
 * @type {import("prettier").Config}
 */
export default {
  singleQuote: true,
  semi: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
};
