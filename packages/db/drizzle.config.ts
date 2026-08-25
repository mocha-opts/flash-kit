import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run Drizzle commands.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./src/schema/core.ts', './src/schema/example.ts'],
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});
