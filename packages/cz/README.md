# cz

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build cz` to build the library.

## Running unit tests

Run `nx test cz` to execute the unit tests via [Jest](https://jestjs.io).

## Questions

### 关于 husky 创建钩子不生效问题

官方示例：

1. 安装依赖

```bash
npm install husky --save-dev
```

2. 启用 git hooks

```bash
npx husky install
# husky - Git hooks installed
```

3. 创建 hooks

```bash
npx husky add .husky/pre-commit "npm test"
# husky - created .husky/pre-commit
```

> 在 Windows 上，会出现第三步运行不成功问题，会提示以下错误：

```bash
Usage:
    husky install [dir] (default: .husky)
    husky uninstall
    husky set|add <file> [cmd]
```

`husky` 直接使用 `process.argv` 解析参数：

```js
[
  'node.exe',
  'bin.js',
  'add',
  '.husky/pre-commit',
  'npm',
  'test'
]
```

> 原因是 `Windows` 上的 `npm` 问题，解决问题使用 `yarn`。

如果你没有使用 `yarn`，那么可以用简单的方式

```bash
npx husky add .husky/pre-commit
# husky - created .husky/pre-commit
```

就会创建成功：

```sh
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

undefined
```

把 `undefined` 改成你想要的命令即可

> 注意：一行是执行一条语句，从上到下执行。