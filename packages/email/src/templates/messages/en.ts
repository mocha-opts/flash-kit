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
