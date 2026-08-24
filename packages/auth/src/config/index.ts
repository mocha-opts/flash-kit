export type AuthProvider = 'google' | 'github' | 'magic-link';

export type AuthConfig = {
  readonly providers: readonly AuthProvider[];
  readonly sessionMaxAgeDays: number;
  readonly adminEnabled: boolean;
};
