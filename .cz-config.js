const { packagesScope, workspaceScope } = require('./.commit-scope.json');

const scopes = [...workspaceScope, ...(packagesScope ?? [])];

/**
 * Commit message format
 * - A commit message consists of a header, body and footer.
 * - The header has a type and a subject:
 * 
 * <type>[(<scope>)]: <emoji> <subject>
 * [BLANK LINE]
 * [body]
 * [BLANK LINE]
 * [breaking changes]
 * [BLANK LINE]
 * [footer]
 */
module.exports = {
  types: [
    {
      value: 'feat',
      name: '新增功能',
    },
    {
      value: 'fix',
      name: '修复Bug',
    },
    {
      value: 'docs',
      name: '文档更新',
    },
    {
      value: 'style',
      name: '风格修复(修改空格，缩进，分号等代码风格问题)',
    },
    {
      value: 'refactor',
      name: '代码重构(注意和feat、fix区分开)',
    },
    {
      value: 'perf',
      name: '性能优化',
    },
    {
      value: 'test',
      name: '测试更新',
    },
    {
      value: 'build',
      name: '项目构建(例:npm 包更新,webpack,rollup等构建工具配置)',
    },
    {
      value: 'ci',
      name: '持续集成(例:Travis,Jenkins,GitLab CI,Circle等)',
    },
    {
      value: 'revert',
      name: '代码回滚',
    },
    {
      value: 'chore',
      name: '其他类型(不属于以上类型)',
    },
  ],

  scopes,

  disableEmoji: false,
  maxMessageLength: 164,
  minMessageLength: 3,

  // it needs to match the value for field type. Eg.: 'fix'
  /*
  scopeOverrides: {
    fix: [
      {name: 'merge'},
      {name: 'style'},
      {name: 'e2eTest'},
      {name: 'unitTest'}
    ]
  },
  */

  allowTicketNumber: false,
  isTicketNumberRequired: false,
  ticketNumberPrefix: 'TICKET-',
  ticketNumberRegExp: '\\d{1,5}',

  // override the messages, defaults are as follows
  messages: {
    type: '选择一种你的提交类型:',
    scope: '选择一个 scope (可选):',
    // customScope: '自定义 scope:',
    subject: '简短的变更说明:',
    body: '更长的变更说明, 使用"|"换行 (可选):',
    breaking: '非兼容性说明 (可选):',
    footer: 'Issues Closed, 例如: #31, #34 (可选):',
    confirmCommit: '你确定提交说明?',
  },

  questions: ['type', 'scope', 'subject', 'breaking', 'body', 'issues'],

  allowCustomScopes: true,
  allowBreakingChanges: ['feat', 'fix'],
  // 跳过任何你想问的问题
  // skipQuestions: [],

  // limit subject length
  subjectLimit: 100,
};
