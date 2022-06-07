const { packagesScope, workspaceScope } = require('./.commit-scope.json');

const scopes = [...workspaceScope, ...(packagesScope ?? [])];

module.exports = {
  extends: ['@commitlint/config-conventional', 'cz'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'scope-enum': [2, 'always', scopes],
    'type-enum': [
      2,
      'always',
      ['build', 'chore', 'ci', 'docs', 'feat', 'fix', 'merge', 'perf', 'refactor', 'release', 'revert', 'style', 'test'],
    ],
  },
};