import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(
  join(__dirname, "../supabase/migrations/001_initial_schema.sql"),
  "utf8"
);

console.log("🚀 Running database migration…");

const { error } = await supabase.rpc("exec_sql", { sql });

if (error) {
  // Try direct approach - Supabase doesn't always expose exec_sql
  console.log("ℹ️  Could not run via RPC. Please run the SQL manually:");
  console.log("\n📄 File: supabase/migrations/001_initial_schema.sql");
  console.log("\nOptions:");
  console.log("  1. Supabase Dashboard → SQL Editor → paste the file contents");
  console.log("  2. psql <connection-string> -f supabase/migrations/001_initial_schema.sql");
} else {
  console.log("✅ Migration complete!");
}
