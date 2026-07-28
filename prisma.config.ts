import "dotenv/config";
import { defineConfig } from "prisma/config";

const directUrl = process.env.DIRECT_DATABASE_URL?.trim();
const shadowUrl = process.env.SHADOW_DATABASE_URL?.trim();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(directUrl
    ? { datasource: { url: directUrl, ...(shadowUrl ? { shadowDatabaseUrl: shadowUrl } : {}) } }
    : {}),
});
