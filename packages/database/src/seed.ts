import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';
import { memberships, organizations, users } from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------
  const [adminUser] = await db
    .insert(users)
    .values({
      email: 'admin@saaskit.dev',
      name: 'Super Admin',
      globalRole: 'super_admin',
      emailVerified: true,
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  const [testUser] = await db
    .insert(users)
    .values({
      email: 'user@saaskit.dev',
      name: 'Test User',
      globalRole: 'user',
      emailVerified: true,
    })
    .onConflictDoNothing({ target: users.email })
    .returning();

  // On repeat runs, fetch existing users if inserts were skipped
  const adminId =
    adminUser?.id ??
    (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, 'admin@saaskit.dev') }))!
      .id;

  const testUserId =
    testUser?.id ??
    (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, 'user@saaskit.dev') }))!
      .id;

  console.log(`  ✓ Users: admin=${adminId}, user=${testUserId}`);

  // -------------------------------------------------------------------------
  // Organizations
  // -------------------------------------------------------------------------
  await db
    .insert(organizations)
    .values([
      {
        name: 'Personal',
        slug: 'admin-personal',
        isPersonal: true,
        ownerId: adminId,
      },
      {
        name: 'Personal',
        slug: 'user-personal',
        isPersonal: true,
        ownerId: testUserId,
      },
      {
        name: 'Acme Inc',
        slug: 'acme',
        isPersonal: false,
        ownerId: adminId,
      },
    ])
    .onConflictDoNothing({ target: organizations.slug });

  const acmeOrg = (await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, 'acme'),
  }))!;

  console.log(`  ✓ Organizations: acme=${acmeOrg.id}`);

  // -------------------------------------------------------------------------
  // Memberships
  // -------------------------------------------------------------------------
  await db
    .insert(memberships)
    .values([
      {
        userId: adminId,
        orgId: acmeOrg.id,
        role: 'owner',
      },
      {
        userId: testUserId,
        orgId: acmeOrg.id,
        role: 'member',
      },
    ])
    .onConflictDoNothing();

  console.log('  ✓ Memberships created');

  console.log('✅ Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
