import pg from "pg";
import { loadEnvLocal } from "./env-local.mjs";

const envLocal = loadEnvLocal();
if (!envLocal.DIRECT_URL) {
  console.error("DIRECT_URL must be present in .env.local.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: envLocal.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
try {
  const { rows: tables } = await client.query(`
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
    order by c.relname
  `);
  const { rows: policies } = await client.query(`
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
    order by tablename, policyname
  `);

  const withoutRls = tables.filter(table => !table.rls_enabled);
  console.log(`Public tables: ${tables.length}`);
  console.log(`Tables with RLS enabled: ${tables.length - withoutRls.length}`);
  console.log(`Public RLS policies: ${policies.length}`);

  if (withoutRls.length > 0) {
    console.error(`RLS is disabled for: ${withoutRls.map(table => table.table_name).join(", ")}`);
    process.exitCode = 1;
  }
  if (policies.length > 0) {
    console.error("Unexpected public RLS policies found. This server-side Prisma app expects direct PostgREST access to remain denied.");
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
