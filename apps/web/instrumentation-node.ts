export async function validateServerEnv(): Promise<void> {
  try {
    await import('@repo/config/env/server');
  } catch (error) {
    console.error(error);
    // Production Next.js logs prepare failures asynchronously; do not keep a
    // server with invalid configuration alive after a failed startup check.
    process.exit(1);
  }
}
