import {
  checkFilesExist,
  cleanup,
  ensureNxProject,
  readFile,
  readJson,
  runCommandAsync,
  runNxCommandAsync,
} from '@nrwl/nx-plugin/testing';
describe('cz e2e', () => {
  beforeAll(() => {
    cleanup();
  });

  beforeEach(() => {
    ensureNxProject('@nx-club/cz', 'dist/packages/cz');
  });

  describe('@nx-club/cz:init', () => {
    it('should initialize @nx-club/cz', async () => {
      // simulation husky install
      await runCommandAsync('mkdir .husky');

      await runNxCommandAsync(`generate @nx-club/cz:init`);
      // check configuration
      expect(() => checkFilesExist('.versionrc.json', '.commit-scope.json', 'commitlint.config.js', '.cz-config.js', '.lintstagedrc.js')).not.toThrow();
      // check devDependencies
      const packageJson = readJson('package.json');
      expect(packageJson.devDependencies['@nx-club/cz']).toBeTruthy();
      expect(packageJson.devDependencies.husky).toBeTruthy();
      expect(packageJson.devDependencies['is-ci']).toBeTruthy();
      expect(packageJson.devDependencies['commitizen']).toBeTruthy();
      expect(packageJson.devDependencies['commitlint-config-cz']).toBeTruthy();
      expect(packageJson.devDependencies['cz-conventional-changelog']).toBeTruthy();
      expect(packageJson.devDependencies['cz-customizable']).toBeTruthy();
      expect(packageJson.devDependencies['@commitlint/cli']).toBeTruthy();
      expect(packageJson.devDependencies['@commitlint/config-conventional']).toBeTruthy();
      expect(packageJson.devDependencies['standard-version']).toBeTruthy();
      expect(packageJson.devDependencies['lint-staged']).toBeTruthy();

      const versionRc = readJson('.versionrc.json');
      expect(versionRc.scripts.postchangelog).toBe('npx nx format');
      expect(versionRc.scripts.posttag).toBe('git push --follow-tags origin master');

      const commitScope = readJson('.commit-scope.json');
      expect(commitScope.appsScope.length).toBe(0);
      expect(commitScope.libsScope.length).toBe(0);
      expect(commitScope.workspaceScope.length).toBe(8);

      const commitLint = readFile('commitlint.config.js');

      expect(commitLint).toMatch('scopes');

      const czConfig = readFile('.cz-config.js');

      expect(czConfig).toMatch('scopes');
      expect(czConfig).toMatch('选择一种你的提交类型');

      const lintStagedRc = readFile('.lintstagedrc.js');
      expect(lintStagedRc).toMatch('{apps,libs}/**/*.{ts,js,json,md}');

    }, 120000);
  });
});
