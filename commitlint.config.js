export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only changes
        'style',    // Code style changes (formatting, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Changes to build system or dependencies
        'ci',       // CI/CD configuration changes
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Reverts a previous commit
        'wip'       // Work in progress
      ]
    ],
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'shared',
        'devtools',
        'weakbimap',
        'build',
        'ci',
        'deps',
        'docs',
        'release',
        'test',
        'bench'
      ]
    ],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case']
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100]
  }
}