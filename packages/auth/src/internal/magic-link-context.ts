import { DEFAULT_AUTH_CALLBACK_PATH, getSafeCallbackPath } from './safe-callback-path';

export type AuthEmailLocale = 'en' | 'zh-CN';

/** Rewrites the provider URL so only a trusted relative callback can reach the email. */
export function createSafeMagicLinkUrl(url: string, expectedOrigin: string): string {
  const magicLinkUrl = new URL(url);

  if (magicLinkUrl.origin !== new URL(expectedOrigin).origin) {
    throw new Error('Better Auth produced a magic-link URL for an unexpected origin.');
  }

  const callbackPath = getSafeCallbackPath(magicLinkUrl.searchParams.get('callbackURL'));
  magicLinkUrl.searchParams.set('callbackURL', callbackPath);

  return magicLinkUrl.toString();
}

/** Resolves only the supported email locales from trusted path/header hints. */
export function resolveAuthEmailLocale(url: string, request?: Request): AuthEmailLocale {
  const magicLinkUrl = new URL(url);
  const callbackPath = getSafeCallbackPath(magicLinkUrl.searchParams.get('callbackURL'));

  if (hasZhCnPathPrefix(callbackPath)) {
    return 'zh-CN';
  }

  const referer = request?.headers.get('referer');
  if (referer) {
    try {
      if (hasZhCnPathPrefix(new URL(referer, magicLinkUrl.origin).pathname)) {
        return 'zh-CN';
      }
    } catch {
      // Ignore malformed optional browser metadata and use the language header.
    }
  }

  const acceptedLanguages = request?.headers.get('accept-language')?.toLowerCase();
  return acceptedLanguages?.includes('zh-cn') ? 'zh-CN' : 'en';
}

function hasZhCnPathPrefix(path: string): boolean {
  return path === '/zh-CN' || path.startsWith('/zh-CN/');
}

export { DEFAULT_AUTH_CALLBACK_PATH };
