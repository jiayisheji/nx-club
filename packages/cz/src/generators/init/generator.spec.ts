import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readJson, writeJson, updateJson } from '@nrwl/devkit';
import { commitizenVSCodeExtension, packageVersion } from '../utils/versions';
import generator from './generator';
import { InitGeneratorSchema } from './schema';

describe('cz generator init', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should add dependencies and create recommended root configuration', async () => {
    const defaultOptions: InitGeneratorSchema = {
      language: 'cn',
      workspaceType: 'application',
      lintStaged: true,
      skipFormat: false,
    };
    // 伪造 .git
    tree.write('.git/config', '');

    await generator(tree, defaultOptions);

    const packageJson = readJson(tree, 'package.json');
    // dependencies
    for (const [p, v] of Object.entries<string>(packageVersion)) {
      expect(packageJson.devDependencies[p]).toBe(v);
    }

    // scripts
    expect(packageJson.scripts['prepare']).toBe('(is-ci || husky install) & (is-ci || standard-version --first-release)');
    expect(packageJson.scripts['release']).toBe('standard-version --no-verify');
    expect(packageJson.scripts['commit']).toBe('git-cz');

    // configuration
    expect(tree.exists('.versionrc.json')).toBeTruthy();
    expect(tree.exists('.commit-scope.json')).toBeTruthy();
    expect(tree.exists('commitlint.config.js')).toBeTruthy();
    expect(tree.exists('.cz-config.js')).toBeTruthy();
    // not husky, npm install init husky install
  });

  describe('should not add package to devDependencies when present in dependencies', () => {
    const defaultOptions: InitGeneratorSchema = {
      language: 'cn',
      workspaceType: 'application',
      lintStaged: true,
      skipFormat: false,
    };

    for (const [p] of Object.entries<string>(packageVersion)) {
      it(p, async () => {
        updateJson(tree, 'package.json', (json) => {
          json.dependencies[p] = 'x.x.x';
          return json;
        });

        let packageJson = readJson(tree, 'package.json');
        expect(packageJson.dependencies[p]).toBe('x.x.x');

        await generator(tree, defaultOptions);

        packageJson = readJson(tree, 'package.json');
        expect(packageJson.dependencies[p]).toBe('x.x.x');
        expect(packageJson.devDependencies[p]).toBeUndefined();
      });
    }
  });

  describe('should use lint-staged', () => {
    it('support', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      await generator(tree, defaultOptions);

      const packageJson = readJson(tree, 'package.json');

      expect(packageJson.devDependencies['lint-staged']).toBe(
        packageVersion['lint-staged']
      );

      // configuration
      expect(tree.exists('.lintstagedrc.js')).toBeTruthy();
    });

    it('not support', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: false,
        skipFormat: false,
      };

      await generator(tree, defaultOptions);
      const packageJson = readJson(tree, 'package.json');
      expect(packageJson.devDependencies['lint-staged']).toBeUndefined();
    });
  });

  describe('should pick commit scope form workspace.json', () => {
    it('application version 1', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      updateJson(tree, 'workspace.json', (json) => {
        json.version = 1;
        json.projects['api'] = 'apps/api';
        json.projects['admin'] = 'apps/admin';
        json.projects['admin-e2e'] = 'e2e/admin-e2e';
        json.projects['resources'] = 'libs/resources';
        json.projects['shared'] = 'libs/shared';
        json.projects['utils'] = 'libs/utils';
        return json;
      });
      await generator(tree, defaultOptions);
      const commitScope = readJson(tree, '.commit-scope.json');
      expect(commitScope.appsScope.length).toBe(0);
      expect(commitScope.libsScope.length).toBe(0);
      expect(commitScope.packagesScope).toBeUndefined();
    });

    it('application version 2', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      updateJson(tree, 'workspace.json', (json) => {
        json.version = 2;
        json.projects['api'] = 'apps/api';
        json.projects['admin'] = 'apps/admin';
        json.projects['admin-e2e'] = 'e2e/admin-e2e';
        json.projects['resources'] = 'libs/resources';
        json.projects['shared'] = 'libs/shared';
        json.projects['utils'] = 'libs/utils';
        return json;
      });
      await generator(tree, defaultOptions);
      const commitScope = readJson(tree, '.commit-scope.json');
      expect(commitScope.appsScope.length).toBe(2);
      expect(commitScope.appsScope).toContain('api');
      expect(commitScope.appsScope).toContain('admin');
      expect(commitScope.libsScope.length).toBe(3);
      expect(commitScope.libsScope).toContain('resources');
      expect(commitScope.libsScope).toContain('shared');
      expect(commitScope.libsScope).toContain('utils');
      expect(commitScope.packagesScope).toBeUndefined();
    });

    it('plugin version 1', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      updateJson(tree, 'workspace.json', (json) => {
        json.version = 1;
        json.projects['cz'] = 'packages/cz';
        json.projects['cz-e2e'] = 'e2e/cz-e2e';
        return json;
      });
      defaultOptions.workspaceType = 'plugin';
      await generator(tree, defaultOptions);
      const commitScope = readJson(tree, '.commit-scope.json');
      expect(commitScope.packagesScope.length).toBe(0);
      expect(commitScope.appsScope).toBeUndefined();
      expect(commitScope.libsScope).toBeUndefined();
    });

    it('plugin version 2', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      updateJson(tree, 'workspace.json', (json) => {
        json.version = 2;
        json.projects['cz'] = 'packages/cz';
        json.projects['cz-e2e'] = 'e2e/cz-e2e';
        return json;
      });
      defaultOptions.workspaceType = 'plugin';
      await generator(tree, defaultOptions);
      const commitScope = readJson(tree, '.commit-scope.json');
      expect(commitScope.packagesScope.length).toBe(1);
      expect(commitScope.packagesScope[0]).toBe('cz');
      expect(commitScope.appsScope).toBeUndefined();
      expect(commitScope.libsScope).toBeUndefined();
    });
  });

  describe('should pick commit scope form angular.json', () => {
    it('application', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      const angularJson: Record<
        'projects',
        Record<string, { projectType: string }>
      > = { projects: {} };
      angularJson.projects['api'] = {
        projectType: 'application',
      };
      angularJson.projects['admin'] = {
        projectType: 'application',
      };
      angularJson.projects['admin-e2e'] = {
        projectType: 'application',
      };
      angularJson.projects['resources'] = {
        projectType: 'library',
      };
      angularJson.projects['shared'] = {
        projectType: 'library',
      };
      angularJson.projects['utils'] = {
        projectType: 'library',
      };
      writeJson(tree, 'angular.json', angularJson);

      tree.delete('workspace.json');
      await generator(tree, defaultOptions);
      const commitScope = readJson(tree, '.commit-scope.json');
      expect(commitScope.appsScope.length).toBe(2);
      expect(commitScope.appsScope).toContain('api');
      expect(commitScope.appsScope).toContain('admin');
      expect(commitScope.libsScope.length).toBe(3);
      expect(commitScope.libsScope).toContain('resources');
      expect(commitScope.libsScope).toContain('shared');
      expect(commitScope.libsScope).toContain('utils');
      expect(commitScope.packagesScope).toBeUndefined();
    });
  });

  describe('should not pick commit scope form not exists "workspace.json or angular.json"', () => {
    it('application', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      tree.delete('workspace.json');
      try {
        await generator(tree, defaultOptions);
      } catch (error) {
        expect(error.message).toBe('Unknown workspace');
      }
    });

    it('plugin', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      tree.delete('workspace.json');
      defaultOptions.workspaceType = 'plugin';
      try {
        await generator(tree, defaultOptions);
      } catch (error) {
        expect(error.message).toBe('Unknown workspace');
      }
    });
  });

  describe('should select language form .cz-config.js', () => {
    it('cn', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      await generator(tree, defaultOptions);
      const czConfig = tree.read('.cz-config.js').toString();
      expect(czConfig).toContain('新增功能');
    });

    it('en', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      defaultOptions.language = 'en';
      await generator(tree, defaultOptions);
      const czConfig = tree.read('.cz-config.js').toString();
      expect(czConfig).toContain('feat:     A new feature');
    });

    it('hg', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      defaultOptions.language = 'hg';
      await generator(tree, defaultOptions);
      const czConfig = tree.read('.cz-config.js').toString();
      expect(czConfig).toContain('新增功能');
    });
  });

  describe('VSCode Extension', () => {
    it('should add commitizen vscode extension to vscode extension recommendations when they exist', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      writeJson(tree, '.vscode/extensions.json', { recommendations: [] });

      await generator(tree, defaultOptions);

      const extensions = readJson(tree, '.vscode/extensions.json');
      expect(extensions.recommendations).toContain(commitizenVSCodeExtension);
    });

    it('should add commitizen vscode extension and recommendations array to vscode extension file if it exists', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      writeJson(tree, '.vscode/extensions.json', {});

      await generator(tree, defaultOptions);

      const extensions = readJson(tree, '.vscode/extensions.json');
      expect(extensions.recommendations).toContain(commitizenVSCodeExtension);
    });

    it('should not add commitizen vscode extension to vscode extension recommendations when it the extension already exists in recommendations', async () => {
      const defaultOptions: InitGeneratorSchema = {
        language: 'cn',
        workspaceType: 'application',
        lintStaged: true,
        skipFormat: false,
      };
      writeJson(tree, '.vscode/extensions.json', {
        recommendations: [commitizenVSCodeExtension],
      });

      await generator(tree, defaultOptions);

      const extensions = readJson(tree, '.vscode/extensions.json');
      expect(extensions.recommendations).toHaveLength(1);
      expect(extensions.recommendations).toContain(commitizenVSCodeExtension);
    });
  });
});
