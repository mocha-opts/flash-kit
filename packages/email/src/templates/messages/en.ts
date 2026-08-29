export const enMagicLinkMessages = {
  subject: 'Sign in to Flash Kit',
  preview: 'Your secure sign-in link for Flash Kit',
  heading: 'Sign in to Flash Kit',
  intro: 'Use the secure link below to finish signing in.',
  action: 'Sign in',
  expires: (minutes: number) =>
    `This link expires in ${minutes} minutes and can only be used once.`,
  ignore: 'If you did not request this email, you can safely ignore it.',
  footer: 'Flash Kit sent this message because someone requested a sign-in link for your email.',
} as const;

export const enEmailChangeMessages = {
  verification: {
    subject: 'Confirm your new Flash Kit email address',
    preview: 'Confirm the new email address for your Flash Kit account',
    heading: 'Confirm your new email address',
    intro:
      'Use the secure link below to confirm this new email address for your Flash Kit account.',
    action: 'Confirm email address',
    expires: (minutes: number) =>
      `This link expires in ${minutes} minutes and can only be used once.`,
    ignore: 'If you did not request an email change, you can safely ignore this message.',
    footer: 'Flash Kit sent this message because an email change was requested for your account.',
  },
  notice: {
    subject: 'Your Flash Kit email change was requested',
    preview: 'A new email address was requested for your Flash Kit account',
    heading: 'Email change requested',
    intro: 'A request was made to change the email address on your Flash Kit account to:',
    reminder: 'The change will not complete until the new address is verified.',
    ignore: 'If you did not request this change, secure your account and contact support.',
    footer: 'This security notice was sent to your previous Flash Kit email address.',
  },
} as const;

export const enBillingMessages = {
  purchaseReceipt: {
    subject: 'Your Flash Kit payment is confirmed',
    preview: 'Your Flash Kit purchase has been confirmed',
    heading: 'Payment confirmed',
    intro: 'Thank you for your purchase. Your payment has been confirmed.',
    item: 'Purchase',
    itemName: {
      subscription: (interval: 'month' | 'year' | undefined) =>
        interval === 'year' ? 'Yearly subscription' : 'Monthly subscription',
      lifetime: 'Lifetime plan',
      'credit-package': 'Credit Pack',
    },
    amount: 'Amount paid',
    credits: (value: number) => `${value} credits added to your account.`,
    date: 'Purchase date',
    footer: 'This receipt was sent because a payment was confirmed for your Flash Kit account.',
  },
  paymentFailed: {
    subject: 'Action needed: your Flash Kit payment failed',
    preview: 'A Flash Kit subscription payment could not be completed',
    heading: 'Payment failed',
    intro:
      'We could not complete your latest payment. Please update your payment method to keep your subscription active.',
    item: 'Subscription',
    amount: 'Amount due',
    date: 'Payment date',
    footer:
      'This notice was sent because a payment for your Flash Kit account could not be completed.',
  },
} as const;
