import { config } from 'dotenv';
config({ path: '../../.env.local' });

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Check your .env.local file.');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Orphan check definitions
// ---------------------------------------------------------------------------
interface OrphanCheck {
  name: string;
  table: string;
  column: string;
  refTable: string;
  refColumn: string;
}

const checks: OrphanCheck[] = [
  {
    name: 'memberships.user_id → users.id',
    table: 'memberships',
    column: 'user_id',
    refTable: 'users',
    refColumn: 'id',
  },
  {
    name: 'memberships.org_id → organizations.id',
    table: 'memberships',
    column: 'org_id',
    refTable: 'organizations',
    refColumn: 'id',
  },
  {
    name: 'subscriptions.org_id → organizations.id',
    table: 'subscriptions',
    column: 'org_id',
    refTable: 'organizations',
    refColumn: 'id',
  },
  {
    name: 'invitations.org_id → organizations.id',
    table: 'invitations',
    column: 'org_id',
    refTable: 'organizations',
    refColumn: 'id',
  },
  {
    name: 'sessions.user_id → users.id',
    table: 'sessions',
    column: 'user_id',
    refTable: 'users',
    refColumn: 'id',
  },
  {
    name: 'accounts.user_id → users.id',
    table: 'accounts',
    column: 'user_id',
    refTable: 'users',
    refColumn: 'id',
  },
  {
    name: 'api_keys.org_id → organizations.id',
    table: 'api_keys',
    column: 'org_id',
    refTable: 'organizations',
    refColumn: 'id',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const fixMode = process.argv.includes('--fix');

async function run() {
  console.log('Integrity Check — Orphan Data Report');
  console.log('====================================\n');

  let totalOrphans = 0;
  const results: { name: string; count: number }[] = [];

  for (const check of checks) {
    const countResult = await db.execute<{ count: string }>(
      sql.raw(`
        SELECT count(*) AS count
        FROM ${check.table} t
        LEFT JOIN ${check.refTable} r ON t.${check.column} = r.${check.refColumn}
        WHERE r.${check.refColumn} IS NULL
      `),
    );

    const count = Number(countResult[0].count);
    results.push({ name: check.name, count });
    totalOrphans += count;

    const status = count > 0 ? `FOUND ${count}` : 'OK';
    console.log(`  [${status}] ${check.name}`);
  }

  console.log(`\nTotal orphan records: ${totalOrphans}`);

  if (totalOrphans === 0) {
    console.log('\nNo orphan data detected.');
    await client.end();
    process.exit(0);
  }

  if (!fixMode) {
    console.log('\nRun with --fix to automatically clean up orphan records.');
    await client.end();
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Fix mode: delete orphan records in a transaction
  // -------------------------------------------------------------------------
  console.log('\nFixing orphan records...\n');

  await db.transaction(async (tx) => {
    for (const check of checks) {
      const countResult = results.find((r) => r.name === check.name);
      if (!countResult || countResult.count === 0) continue;

      await tx.execute(
        sql.raw(`
          DELETE FROM ${check.table}
          WHERE ${check.column} NOT IN (
            SELECT ${check.refColumn} FROM ${check.refTable}
          )
        `),
      );

      console.log(`  Deleted ${countResult.count} orphan(s) from ${check.table} (${check.name})`);
    }
  });

  console.log('\nOrphan data cleanup complete.');
  await client.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Integrity check failed:', err);
  client.end().finally(() => process.exit(1));
});
