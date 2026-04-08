import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.TARGET_DATABASE_URL;
const outputPath = path.join(process.cwd(), "target-schema-check.json");

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    await client.connect();
    const tables = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);
    const functions = await client.query(`
      select routine_name
      from information_schema.routines
      where routine_schema = 'public'
      order by routine_name
    `);

    fs.writeFileSync(outputPath, JSON.stringify({
      tableCount: tables.rowCount,
      routineCount: functions.rowCount,
      tables: tables.rows.map((row) => row.table_name),
      routines: functions.rows.map((row) => row.routine_name),
    }, null, 2));

    console.log("TARGET_SCHEMA_CHECK_WRITTEN");
  } catch (error) {
    fs.writeFileSync(outputPath, JSON.stringify({ error: error?.message || String(error) }, null, 2));
    console.error(error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
})();
