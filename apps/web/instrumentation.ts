export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'edge' || process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  // Next.js does not invoke instrumentation during the production build
  // phase, so runtime-only secrets stay out of a fresh build while every
  // actual Node.js server startup validates the complete server environment.
  const { validateServerEnv } = await import('./instrumentation-node');
  await validateServerEnv();
}
