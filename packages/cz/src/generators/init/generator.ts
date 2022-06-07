import {
  updateJson,
  addDependenciesToPackageJson,
  formatFiles,
  generateFiles,
  readJson,
  logger,
} from '@nrwl/devkit';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';
import type { Tree, GeneratorCallback } from '@nrwl/devkit';
import * as path from 'path';
import * as fs from 'fs';
import { commitizenVSCodeExtension, packageVersion } from '../utils/versions';
import { InitGeneratorSchema } from './schema';

/**
 * 1. husky git hooks
 * 2. commitlint git commit message lint
 * 3. commitizen git commit message cli
 * 4. standard-version generator conventional changelog
 * 5. lint-staged .lintstagedrc.js
 */

/**
 * @nx-club/cz:init generator
 * @param host
 * @param options
 * @returns
 */
export async function initGenerator(
  host: Tree,
  options: InitGeneratorSchema
): Promise<GeneratorCallback> {
  const isGit = host.exists('.git');
  if (!isGit) {
    logger.info(
      `git root configuration found! Skipping creation of root .git!
Please be aware that your own configuration can lead to problems with cz behavior!
We recommend renaming your 'git init' file and running the generator again with 'nx g @nx-club/cz:init'.`
    );
  }

  // if not use lint staged
  if (options.lintStaged !== true) {
    Reflect.deleteProperty(packageVersion, 'lint-staged');
  }

  const installTask = updateDependencies(host);

  // if .git exist setting enable git hooks
  if (isGit) {
    updatePackageScripts(host);
  }

  updateVSCodeExtensions(host);

  updateWorkspaceConfig(host, options);

  if (options.skipFormat !== true) {
    await formatFiles(host);
  }

  const installHusky = initHusky(host, checkHuskyExist(host));

  return runTasksInSerial(installTask, installHusky);
}

export default initGenerator;

/** Adds CZ and shared configs to the devDependencies of the package.json if not present */
function updateDependencies(host: Tree) {
  const packageJson = readJson(host, 'package.json');

  const devDependencies: { [index: string]: string } = {};

  for (const [p, v] of Object.entries<string>(packageVersion)) {
    if (!packageJson.dependencies[p]) {
      devDependencies[p] = v;
    }
  }

  return addDependenciesToPackageJson(host, {}, devDependencies);
}

/** Adds the Commitizen VSCode Extension to the recommenden Extensions if the file exists */
function updateVSCodeExtensions(host: Tree): void {
  if (!host.exists('.vscode/extensions.json')) return;

  updateJson(host, '.vscode/extensions.json', (json) => {
    json.recommendations ??= [];

    if (
      Array.isArray(json.recommendations) &&
      !json.recommendations.includes(commitizenVSCodeExtension)
    ) {
      json.recommendations.push(commitizenVSCodeExtension);
    }

    return json;
  });
}

function updatePackageScripts(host: Tree) {
  updateJson(host, 'package.json', (json) => {
    json.scripts ??= {};
    // Enable Git hooks And First Release version
    if (json.scripts['prepare']) {
      json.scripts[
        'prepare'
      ] = `(${json.scripts['prepare']}) & (is-ci || husky install) & (is-ci || standard-version --first-release)`;
    } else {
      json.scripts[
        'prepare'
      ] = `(is-ci || husky install) & (is-ci || standard-version --first-release)`;
    }
    // npm run release
    // Generating Version
    // Create git Tag
    // Update CHANGELOG.md
    if (!json.scripts['release']) {
      json.scripts['release'] = `standard-version --no-verify`;
    } else {
      if (!json.scripts['release-version']) {
        json.scripts['release-version'] = `standard-version --no-verify`;
      } else {
        json.scripts['standard-version'] = `standard-version --no-verify`;
      }
    }

    // npm run commit
    if (!json.scripts['commit']) {
      json.scripts['commit'] = `git-cz`;
    } else {
      json.scripts['git-cz'] = `git-cz`;
    }

    if (json.husky) {
      updateCommitlintToHusky(json.husky);
    }

    return json;
  });
}

/**
 *
 * @param host
 */
function updateWorkspaceConfig(host: Tree, options: InitGeneratorSchema) {
  const { packages, apps, libs } = getWorkspaceProjects(host);

  const isPlugin = options.workspaceType === 'plugin';

  const templateOptions = {
    ...options,
    isPlugin,
    packages: (isPlugin && packages) || [],
    apps: (isPlugin && []) || apps,
    libs: (isPlugin && []) || libs,
  };

  generateFiles(host, path.join(__dirname, 'files'), '/', templateOptions);

  const language = ['cn', 'en'].includes(options.language)
    ? options.language
    : 'cn';

  const fileChanges = host.listChanges();

  // if not use lint staged
  if (options.lintStaged !== true) {
    host.delete('.lintstagedrc.js');
  }

  const paths = (
    fileChanges.filter(({ path }) => path.includes('.cz-config.js')) || []
  ).map((file) => file.path);

  for (const p of paths) {
    if (p === `${language}.cz-config.js`) {
      host.rename(`${language}.cz-config.js`, '.cz-config.js');
    } else {
      host.delete(p);
    }
  }
}

function getWorkspaceProjects(host: Tree): {
  packages: string[];
  apps: string[];
  libs: string[];
} {
  const workspaceJson =
    host.exists('workspace.json') && readJson(host, 'workspace.json');
  // 兼容老版本
  const angularJson =
    host.exists('angular.json') && readJson(host, 'angular.json');
  const packages: string[] = [],
    apps: string[] = [],
    libs: string[] = [];

  if (workspaceJson) {
    if (workspaceJson.version >= 2) {
      for (const [key, value] of Object.entries<string>(
        workspaceJson.projects
      )) {
        if (value.startsWith('packages/')) {
          packages.push(key);
        } else if (value.startsWith('apps/') && !value.endsWith('-e2e')) {
          apps.push(key);
        } else if (value.startsWith('libs/')) {
          libs.push(key);
        }
      }
    }
  } else if (angularJson) {
    for (const [key, value] of Object.entries<{
      projectType: 'application' | 'library';
    }>(angularJson.projects)) {
      switch (value.projectType) {
        case 'application':
          !key.endsWith('-e2e') && apps.push(key);
          break;
        case 'library':
          libs.push(key);
          break;
      }
    }
  } else {
    throw new Error('Unknown workspace');
  }

  return {
    packages,
    apps,
    libs,
  };
}

/**
 * check husky configuration file type
 * @param host
 * @returns
 */
function checkHuskyExist(host: Tree): string {
  if (host.exists('.huskyrc.json')) {
    return '.huskyrc.json';
  }
  if (host.exists('.huskyrc')) {
    return '.huskyrc';
  }
  if (host.exists('.husky')) {
    return '.husky';
  }
  return '.husky';
}

function initHusky(host: Tree, huskyConfig: string) {
  return () => {
    if (huskyConfig === '.husky') {
      // .husky v7
      addcommitlintToHusky();
    } else {
      // .huskyrc/.huskyrc/json v4 ~ v7
      updateJson(host, '.huskyrc.json', updateCommitlintToHusky);
    }
  };
}

/**
 * Add ths Commitlint toi the husky hooks
 * @param json
 * @returns
 */
function updateCommitlintToHusky(json) {
  json.hooks ??= {};

  json.hooks['commit-msg'] = 'commitlint -E HUSKY_GIT_PARAMS';

  return json;
}

/**
 * Add ths Commitlint toi the husky hooks
 */
function addcommitlintToHusky() {
  fs.writeFileSync(
    '.husky/commit-msg',
    `#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx commitlint --edit "$1"
`,
    { mode: 0o0755 }
  );
}
