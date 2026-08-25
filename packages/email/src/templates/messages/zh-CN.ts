export const zhCnMagicLinkMessages = {
  subject: '登录 Flash Kit',
  preview: '用于登录 Flash Kit 的安全链接',
  heading: '登录 Flash Kit',
  intro: '请使用下方安全链接完成登录。',
  action: '登录',
  expires: (minutes: number) => `此链接将在 ${minutes} 分钟后失效，且只能使用一次。`,
  ignore: '如果这不是你的操作，可以放心忽略此邮件。',
  footer: '有人使用你的邮箱申请登录链接，因此 Flash Kit 向你发送了此邮件。',
} as const;
