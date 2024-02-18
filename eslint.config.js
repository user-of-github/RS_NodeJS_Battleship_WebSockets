const stylisticJs = require('@stylistic/eslint-plugin-js');
const stylisticTs = require('@stylistic/eslint-plugin-ts');
const parserTs = require('@typescript-eslint/parser');

module.exports = [{
  plugins: {
    '@stylistic/js': stylisticJs,
    '@stylistic/ts': stylisticTs
  },
  files: [
    './src/**/*.js',
    './src/**/*.cjs',
    './src/**/*.mjs',
    './src/**/*.ts',
    './src/**/*.tsx',
    './index.ts'
  ],
  languageOptions: {
    parser: parserTs,
  },
  rules: {
    indent: ['error', 2, {
      SwitchCase: 1
    }],
    quotes: ['error', 'single'],
    semi: ['error', 'always']
  },

  ignores: [
    'build/*',
    'node_modules/*',
  ]
}];
