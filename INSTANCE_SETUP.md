# Isolated Instance Setup

This folder is a physically separate copy of the original app.
It does not include the original .git metadata, local env files, or the current WhatsApp session.

Folder path:
- c:/Users/RAIQ/Desktop/المواقع/Habib-isolated-instance

What you need to install on the machine:
1. Node.js LTS
2. pnpm
3. Google Chrome or Chromium
4. Git (optional, only if you want a separate repository)

What you need to create yourself:
1. A brand new Supabase project for the new complex.
2. A separate WhatsApp number for the new complex.
3. New Web Push keys for the new site.
4. A schema-only export from the current Supabase database.

Important note:
- This repository does not contain the full base schema for core tables like students, circles, attendance_records, and student_plans.
- Because of that, the new database cannot be rebuilt from repository SQL files alone.
- You must export the schema from the current live database, then import that schema into the new Supabase project.

What stays isolated automatically after that:
1. All student data, plans, exams, finance, and notifications because the new site uses a different Supabase project.
2. WhatsApp messages and queue because they are stored in the new database.
3. Notification templates and site settings because they are stored in the new database.
4. WhatsApp login session because this copy uses different worker paths and a different client id.

Files prepared for the isolated site:
- .env.instance.example
- scripts/generate-web-push-keys.mjs

Minimal steps:
1. Copy .env.instance.example to .env.local.
2. Fill it with the new Supabase keys.
3. Run `node scripts/generate-web-push-keys.mjs` and paste the keys into .env.local.
4. Import the current database schema into the new Supabase project.
5. In the new Supabase project, verify these additional SQL files exist or run them if missing:
   - 042_create_student_exams.sql
   - 047_create_student_hafiz_extras.sql
   - scripts/017_create_whatsapp_tables.sql
   - scripts/018_create_whatsapp_ready_messages.sql
   - scripts/027_create_notifications.sql
   - scripts/040_create_whatsapp_queue.sql
   - scripts/042_allow_late_attendance_records.sql
   - scripts/043_add_student_memorized_fields.sql
   - scripts/045_create_exam_schedules.sql
   - scripts/046_create_semesters.sql
   - scripts/047_allow_delete_semesters.sql
   - scripts/048_add_semester_scope_to_attendance_finance.sql
   - scripts/049_add_previous_memorization_ranges.sql
   - scripts/050_add_exam_portion_mode.sql
   - scripts/053_create_reset_student_memorization_atomic.sql
   - scripts/054_create_remove_student_memorized_range_atomic.sql
   - scripts/055_create_archive_active_semester_atomic.sql
6. Run `pnpm install`.
7. Run the site with `pnpm dev`.
8. Run the WhatsApp worker with `pnpm worker:whatsapp`.
9. Scan the QR using the separate WhatsApp number for the new complex.

What I already prepared in this copy:
1. Separate folder with no shared git history.
2. No copied local env secrets.
3. No copied WhatsApp auth session.
4. Dedicated worker file paths and client id placeholders.

What still requires real credentials or export from you:
1. New Supabase keys.
2. New database schema import.
3. New WhatsApp login via QR.
4. New Web Push keys.

Recommended deployment model:
1. Keep this folder as a standalone project.
2. Deploy it as a separate app/project from the original.
3. Use a different domain or subdomain.
4. Never reuse the original .env.local or WhatsApp auth folder.
