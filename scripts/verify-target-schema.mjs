import pg from "pg";

const { Client } = pg;
const connectionString = process.env.TARGET_DATABASE_URL;

if (!connectionString) {
  console.error("Missing TARGET_DATABASE_URL");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const tables = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'students',
        'circles',
        'attendance_records',
        'student_plans',
        'site_settings',
        'whatsapp_queue',
        'student_exams',
        'exam_schedules'
      )
    order by table_name
  `);

  const functions = await client.query(`
    select routine_name
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name in (
        'archive_active_semester_atomic',
        'remove_student_memorized_range_atomic',
        'reset_student_memorization_atomic'
      )
    order by routine_name
  `);

  console.log(JSON.stringify({ tables: tables.rows, functions: functions.rows }, null, 2));
} catch (error) {
  console.error(error?.message || error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
