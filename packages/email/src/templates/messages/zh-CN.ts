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

export const zhCnEmailChangeMessages = {
  verification: {
    subject: '确认你的 Flash Kit 新邮箱地址',
    preview: '确认 Flash Kit 账户的新邮箱地址',
    heading: '确认新邮箱地址',
    intro: '请使用下方安全链接，确认该邮箱地址用于你的 Flash Kit 账户。',
    action: '确认邮箱地址',
    expires: (minutes: number) => `此链接将在 ${minutes} 分钟后失效，且只能使用一次。`,
    ignore: '如果你没有申请修改邮箱，可以放心忽略此邮件。',
    footer: '有人为你的 Flash Kit 账户申请修改邮箱，因此 Flash Kit 向你发送了此邮件。',
  },
  notice: {
    subject: '有人申请修改你的 Flash Kit 邮箱',
    preview: '有人为你的 Flash Kit 账户申请了新的邮箱地址',
    heading: '邮箱修改申请',
    intro: '有人申请将你的 Flash Kit 账户邮箱修改为：',
    reminder: '只有新邮箱完成验证后，修改才会生效。',
    ignore: '如果这不是你的操作，请保护好账户并联系支持团队。',
    footer: '此安全通知已发送到你之前的 Flash Kit 邮箱。',
  },
} as const;
