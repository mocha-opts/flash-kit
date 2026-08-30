export async function validateServerEnv(): Promise<void> {
  try {
    await import('@repo/config/env/server');
  } catch {
    // Never print the parsed environment, validation input, or a secret-bearing stack.
    console.error('Server configuration validation failed.');
    // Production Next.js logs prepare failures asynchronously; do not keep a
    // server with invalid configuration alive after a failed startup check.
    process.exit(1);
  }
}
