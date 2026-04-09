CREATE TABLE IF NOT EXISTS public.semesters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NULL,
  archived_at timestamp with time zone NULL,
  archive_snapshot jsonb NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT semesters_status_check CHECK (status IN ('active', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS semesters_single_active_idx
ON public.semesters(status)
WHERE status = 'active';

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert semesters" ON public.semesters;
CREATE POLICY "Allow public insert semesters"
ON public.semesters
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select semesters" ON public.semesters;
CREATE POLICY "Allow public select semesters"
ON public.semesters
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public update semesters" ON public.semesters;
CREATE POLICY "Allow public update semesters"
ON public.semesters
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow public delete semesters" ON public.semesters;
CREATE POLICY "Allow public delete semesters"
ON public.semesters
FOR DELETE
USING (true);

DO $$
DECLARE
  active_semester_id uuid;
BEGIN
  SELECT id INTO active_semester_id
  FROM public.semesters
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF active_semester_id IS NULL THEN
    INSERT INTO public.semesters (name, status, start_date)
    VALUES ('الفصل الحالي', 'active', CURRENT_DATE)
    RETURNING id INTO active_semester_id;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.student_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL,
  halaqah text NOT NULL,
  exam_portion_label text NOT NULL,
  portion_type text NOT NULL DEFAULT 'juz',
  portion_number integer NULL,
  juz_number integer NULL,
  exam_date date NOT NULL DEFAULT CURRENT_DATE,
  alerts_count integer NOT NULL DEFAULT 0,
  mistakes_count integer NOT NULL DEFAULT 0,
  prompts_count integer NOT NULL DEFAULT 0,
  max_score numeric(6,2) NOT NULL DEFAULT 100,
  alert_deduction numeric(6,2) NOT NULL DEFAULT 1,
  mistake_deduction numeric(6,2) NOT NULL DEFAULT 2,
  prompt_deduction numeric(6,2) NOT NULL DEFAULT 0,
  total_deduction numeric(6,2) NOT NULL DEFAULT 0,
  final_score numeric(6,2) NOT NULL DEFAULT 100,
  min_passing_score numeric(6,2) NOT NULL DEFAULT 80,
  passed boolean NOT NULL DEFAULT false,
  notes text NULL,
  tested_by_user_id uuid NULL,
  tested_by_name text NULL,
  tested_by_role text NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT student_exams_juz_number_check CHECK (juz_number IS NULL OR (juz_number >= 1 AND juz_number <= 30)),
  CONSTRAINT student_exams_alerts_count_check CHECK (alerts_count >= 0),
  CONSTRAINT student_exams_mistakes_count_check CHECK (mistakes_count >= 0),
  CONSTRAINT student_exams_prompts_count_check CHECK (prompts_count >= 0)
);

ALTER TABLE public.student_exams
  ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portion_type text NOT NULL DEFAULT 'juz',
  ADD COLUMN IF NOT EXISTS portion_number integer NULL,
  ADD COLUMN IF NOT EXISTS prompts_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_score numeric(6,2) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS alert_deduction numeric(6,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mistake_deduction numeric(6,2) NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS prompt_deduction numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_deduction numeric(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_passing_score numeric(6,2) NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS notes text NULL,
  ADD COLUMN IF NOT EXISTS tested_by_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS tested_by_name text NULL,
  ADD COLUMN IF NOT EXISTS tested_by_role text NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$
DECLARE
  active_semester_id uuid;
BEGIN
  SELECT id INTO active_semester_id
  FROM public.semesters
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.student_exams
  SET semester_id = active_semester_id
  WHERE semester_id IS NULL;
END $$;

UPDATE public.student_exams
SET portion_type = 'juz'
WHERE portion_type IS NULL;

UPDATE public.student_exams
SET portion_number = juz_number
WHERE portion_number IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'student_exams'
      AND column_name = 'portion_number'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.student_exams
      ALTER COLUMN portion_number SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'student_exams_portion_type_check'
  ) THEN
    ALTER TABLE public.student_exams
      ADD CONSTRAINT student_exams_portion_type_check CHECK (portion_type IN ('juz', 'hizb'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_exams_student_id ON public.student_exams(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_halaqah ON public.student_exams(halaqah);
CREATE INDEX IF NOT EXISTS idx_student_exams_exam_date ON public.student_exams(exam_date DESC);
CREATE INDEX IF NOT EXISTS student_exams_semester_id_idx ON public.student_exams(semester_id);
CREATE INDEX IF NOT EXISTS student_exams_portion_idx ON public.student_exams(semester_id, student_id, portion_type, portion_number);

CREATE OR REPLACE FUNCTION public.set_student_exams_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_exams_updated_at ON public.student_exams;
CREATE TRIGGER trg_student_exams_updated_at
BEFORE UPDATE ON public.student_exams
FOR EACH ROW
EXECUTE FUNCTION public.set_student_exams_updated_at();

CREATE TABLE IF NOT EXISTS public.exam_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL,
  halaqah text NOT NULL,
  exam_portion_label text NOT NULL,
  portion_type text NOT NULL DEFAULT 'juz',
  portion_number integer NULL,
  juz_number integer NOT NULL,
  exam_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notification_sent_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  completed_exam_id uuid NULL REFERENCES public.student_exams(id) ON DELETE SET NULL,
  completed_at timestamp with time zone NULL,
  cancelled_at timestamp with time zone NULL,
  scheduled_by_user_id uuid NULL,
  scheduled_by_name text NULL,
  scheduled_by_role text NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT exam_schedules_juz_number_check CHECK (juz_number >= 1 AND juz_number <= 30),
  CONSTRAINT exam_schedules_status_check CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

ALTER TABLE public.exam_schedules
  ADD COLUMN IF NOT EXISTS semester_id uuid NULL REFERENCES public.semesters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portion_type text NOT NULL DEFAULT 'juz',
  ADD COLUMN IF NOT EXISTS portion_number integer NULL,
  ADD COLUMN IF NOT EXISTS completed_exam_id uuid NULL REFERENCES public.student_exams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone NULL,
  ADD COLUMN IF NOT EXISTS scheduled_by_user_id uuid NULL,
  ADD COLUMN IF NOT EXISTS scheduled_by_name text NULL,
  ADD COLUMN IF NOT EXISTS scheduled_by_role text NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$
DECLARE
  active_semester_id uuid;
BEGIN
  SELECT id INTO active_semester_id
  FROM public.semesters
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  UPDATE public.exam_schedules
  SET semester_id = active_semester_id
  WHERE semester_id IS NULL;
END $$;

UPDATE public.exam_schedules
SET portion_type = 'juz'
WHERE portion_type IS NULL;

UPDATE public.exam_schedules
SET portion_number = juz_number
WHERE portion_number IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exam_schedules'
      AND column_name = 'portion_number'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.exam_schedules
      ALTER COLUMN portion_number SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'exam_schedules_portion_type_check'
  ) THEN
    ALTER TABLE public.exam_schedules
      ADD CONSTRAINT exam_schedules_portion_type_check CHECK (portion_type IN ('juz', 'hizb'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS exam_schedules_student_id_idx ON public.exam_schedules(student_id);
CREATE INDEX IF NOT EXISTS exam_schedules_halaqah_idx ON public.exam_schedules(halaqah);
CREATE INDEX IF NOT EXISTS exam_schedules_status_idx ON public.exam_schedules(status);
CREATE INDEX IF NOT EXISTS exam_schedules_exam_date_idx ON public.exam_schedules(exam_date);
CREATE INDEX IF NOT EXISTS exam_schedules_semester_id_idx ON public.exam_schedules(semester_id);
CREATE INDEX IF NOT EXISTS exam_schedules_portion_idx ON public.exam_schedules(semester_id, student_id, portion_type, portion_number, status);

ALTER TABLE public.exam_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert exam schedules" ON public.exam_schedules;
CREATE POLICY "Allow public insert exam schedules"
ON public.exam_schedules
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select exam schedules" ON public.exam_schedules;
CREATE POLICY "Allow public select exam schedules"
ON public.exam_schedules
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public update exam schedules" ON public.exam_schedules;
CREATE POLICY "Allow public update exam schedules"
ON public.exam_schedules
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow public delete exam schedules" ON public.exam_schedules;
CREATE POLICY "Allow public delete exam schedules"
ON public.exam_schedules
FOR DELETE
USING (true);

CREATE OR REPLACE FUNCTION public.set_exam_schedules_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_exam_schedules_updated_at ON public.exam_schedules;
CREATE TRIGGER trg_exam_schedules_updated_at
BEFORE UPDATE ON public.exam_schedules
FOR EACH ROW
EXECUTE FUNCTION public.set_exam_schedules_updated_at();
