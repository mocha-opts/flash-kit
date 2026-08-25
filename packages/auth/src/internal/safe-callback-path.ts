const CALLBACK_BASE_URL = 'https://callback.invalid';

export const DEFAULT_AUTH_CALLBACK_PATH = '/dashboard';

/** Accepts only a host-preserving relative path and returns the supplied safe fallback otherwise. */
export function getSafeCallbackPath(
  value: string | null | undefined,
  fallbackPath = DEFAULT_AUTH_CALLBACK_PATH,
): string {
  if (!value) {
    return fallbackPath;
  }

  const candidate = value.trim();

  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return fallbackPath;
  }

  try {
    const parsed = new URL(candidate, CALLBACK_BASE_URL);
    if (parsed.origin !== CALLBACK_BASE_URL) {
      return fallbackPath;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallbackPath;
  }
}
