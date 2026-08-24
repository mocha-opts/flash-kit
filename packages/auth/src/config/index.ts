/** Supported auth provider identifiers; provider SDK details stay private. */
export type AuthProvider = 'google' | 'github' | 'magic-link';

/** Provider-neutral auth settings; runtime setup and secrets stay server-side. */
export type AuthConfig = {
  readonly providers: readonly AuthProvider[];
  readonly sessionMaxAgeDays: number;
  readonly adminEnabled: boolean;
};
