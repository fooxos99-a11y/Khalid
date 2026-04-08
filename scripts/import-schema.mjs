import fs from "fs";
import path from "path";
import process from "process";
import pg from "pg";

const { Client } = pg;

const connectionString = process.env.TARGET_DATABASE_URL;
const schemaFile = process.env.SCHEMA_FILE || path.join(process.cwd(), "schema-public.sql");

if (!connectionString) {
  console.error("Missing TARGET_DATABASE_URL");
  process.exit(1);
}

let sql = fs.readFileSync(schemaFile, "utf8");
sql = sql
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("\\"))
  .join("\n");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("SCHEMA_IMPORT_OK");
} catch (error) {
  console.error("SCHEMA_IMPORT_FAILED");
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
