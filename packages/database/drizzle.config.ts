import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
