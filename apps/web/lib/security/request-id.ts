export const REQUEST_ID_HEADER = 'x-request-id';

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ERROR_DIGEST_PATTERN = /^[a-z0-9_-]{1,128}$/iu;

/** Accepts only application UUIDs or Next.js opaque error digests for display. */
export function normalizeSafeRequestId(value: string | null | undefined): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  return REQUEST_ID_PATTERN.test(candidate) || ERROR_DIGEST_PATTERN.test(candidate)
    ? candidate
    : null;
}
