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

export const zhCnBillingMessages = {
  purchaseReceipt: {
    subject: 'Flash Kit 付款已确认',
    preview: '你的 Flash Kit 购买已确认',
    heading: '付款已确认',
    intro: '感谢你的购买，付款已经确认。',
    item: '购买项目',
    itemName: {
      subscription: (interval: 'month' | 'year' | undefined) =>
        interval === 'year' ? '年度订阅' : '月度订阅',
      lifetime: 'Lifetime 买断方案',
      'credit-package': 'Credit Pack 点数包',
    },
    amount: '已支付金额',
    credits: (value: number) => `已向你的账户增加 ${value} 点 Credit。`,
    date: '购买日期',
    footer: '你的 Flash Kit 账户有一笔付款已确认，因此我们向你发送此收据。',
  },
  paymentFailed: {
    subject: '需要处理：Flash Kit 付款失败',
    preview: 'Flash Kit 订阅付款未能完成',
    heading: '付款失败',
    intro: '我们未能完成最近一笔付款。请更新付款方式，以保持订阅有效。',
    item: '订阅',
    amount: '待支付金额',
    date: '付款日期',
    footer: '你的 Flash Kit 账户有一笔订阅付款未能完成，因此我们向你发送此通知。',
  },
} as const;
