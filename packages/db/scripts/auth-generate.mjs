import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const workspaceRoot = resolve(packageRoot, '../..');
const explicitEnvironmentKeys = new Set(Object.keys(process.env));

for (const relativePath of ['apps/web/.env', 'apps/web/.env.development']) {
  loadEnvironmentFile(resolve(workspaceRoot, relativePath));
}

Object.assign(process.env, {
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? 'local-schema-generation-secret-32-characters',
  BILLING_PROVIDER: process.env.BILLING_PROVIDER ?? 'stripe',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? 'sk_test_schema_generation',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? 'whsec_schema_generation',
  STRIPE_PRODUCT_PRO_MONTHLY: process.env.STRIPE_PRODUCT_PRO_MONTHLY ?? 'prod_schema_pro_monthly',
  STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY ?? 'price_schema_pro_monthly',
  STRIPE_PRODUCT_PRO_YEARLY: process.env.STRIPE_PRODUCT_PRO_YEARLY ?? 'prod_schema_pro_yearly',
  STRIPE_PRICE_PRO_YEARLY: process.env.STRIPE_PRICE_PRO_YEARLY ?? 'price_schema_pro_yearly',
  STRIPE_PRODUCT_LIFETIME: process.env.STRIPE_PRODUCT_LIFETIME ?? 'prod_schema_lifetime',
  STRIPE_PRICE_LIFETIME: process.env.STRIPE_PRICE_LIFETIME ?? 'price_schema_lifetime',
  STRIPE_PRODUCT_CREDIT_PACK_100:
    process.env.STRIPE_PRODUCT_CREDIT_PACK_100 ?? 'prod_schema_credit_pack_100',
  STRIPE_PRICE_CREDIT_PACK_100:
    process.env.STRIPE_PRICE_CREDIT_PACK_100 ?? 'price_schema_credit_pack_100',
  MAILER_PROVIDER: process.env.MAILER_PROVIDER ?? 'smtp',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'noreply@example.com',
  SMTP_HOST: process.env.SMTP_HOST ?? 'localhost',
  SMTP_PORT: process.env.SMTP_PORT ?? '1025',
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'Flash Kit',
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  DATABASE_URL:
    process.env.DATABASE_URL ?? 'postgres://flash_kit:flash_kit@localhost:54333/flash_kit',
});

const cliPath = resolve(packageRoot, 'node_modules/@better-auth/cli/dist/index.mjs');
const result = spawnSync(
  process.execPath,
  [
    '--conditions=react-server',
    cliPath,
    'generate',
    '--cwd',
    '.',
    '--config',
    '../auth/src/auth.ts',
    '--output',
    'src/schema/core.ts',
    '--yes',
  ],
  {
    cwd: packageRoot,
    env: process.env,
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const formatter = spawnSync(
  resolve(workspaceRoot, 'node_modules/.bin/biome'),
  ['check', '--write', 'src/schema/core.ts'],
  {
    cwd: packageRoot,
    env: process.env,
    stdio: 'inherit',
  },
);

if (formatter.error) {
  throw formatter.error;
}

process.exit(formatter.status ?? 1);

function loadEnvironmentFile(path) {
  let contents;

  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    return;
  }

  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (explicitEnvironmentKeys.has(key)) continue;

    process.env[key] = parseEnvironmentValue(rawValue);
  }
}

function parseEnvironmentValue(rawValue) {
  const value = rawValue.trim();

  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll('\\n', '\n').replaceAll('\\"', '"');
  }

  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}
