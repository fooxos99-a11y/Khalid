"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Users } from "lucide-react";

import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { SiteLoader } from "@/components/ui/site-loader";
import { getPlanForDate, groupPlansByStudent } from "@/lib/plan-history";
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters";
import { getStudyWeekStart, isStudyDay } from "@/lib/study-calendar";
import { createClient } from "@/lib/supabase/client";
import { calculatePreviousMemorizedPages, resolvePlanReviewPagesForDate, resolvePlanReviewPoolPages } from "@/lib/quran-data";
import { isPassingMemorizationLevel, type EvaluationLevelValue } from "@/lib/student-attendance";

type StudentRow = {
  id: string;
  name: string | null;
  halaqah: string | null;
  id_number?: string | null;
  account_number?: string | number | null;
  points?: number | null;
};

type PlanRow = {
  id: string;
  student_id: string;
  start_date: string | null;
  created_at: string | null;
  daily_pages: number | null;
  muraajaa_pages: number | null;
  rabt_pages: number | null;
  review_distribution_mode?: "fixed" | "weekly" | null;
  muraajaa_mode?: "daily_fixed" | "weekly_distributed" | null;
  weekly_muraajaa_min_daily_pages?: number | null;
  weekly_muraajaa_start_day?: number | null;
  weekly_muraajaa_end_day?: number | null;
  has_previous?: boolean | null;
  prev_start_surah?: number | null;
  prev_start_verse?: number | null;
  prev_end_surah?: number | null;
  prev_end_verse?: number | null;
  completed_juzs?: number[] | null;
};

type EvaluationRecord = {
  hafiz_level?: EvaluationLevelValue;
  tikrar_level?: EvaluationLevelValue;
  samaa_level?: EvaluationLevelValue;
  rabet_level?: EvaluationLevelValue;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  date: string;
  status: string | null;
  evaluations: EvaluationRecord[] | EvaluationRecord | null;
};

type DailyReportRow = {
  student_id: string;
  report_date: string;
  memorization_done: boolean;
  review_done: boolean;
  linking_done: boolean;
};

type DayStatus = "absent" | "late" | "present-only" | "memorized" | "review" | "tied" | "review-tied" | "complete" | "none";

type StudentCardData = {
  id: string;
  name: string;
  memorized: number;
  revised: number;
  tied: number;
  presentCount: number;
  absentCount: number;
  memorizationCompletedCount: number;
  reviewCompletedCount: number;
  linkingCompletedCount: number;
  tikrarCompletedCount: number;
  statuses: Array<{ date: string; status: DayStatus }>;
  totalActivity: number;
};

const TEXT = {
  titleSuffix: "تقارير الأسابيع",
  currentWeek: "الأسبوع الحالي",
  previousWeek: "الأسبوع السابق",
  olderWeeks: "قبل {count} أسابيع",
  noStudents: "لا يوجد طلاب مسجلون في هذه الحلقة",
  loadError: "تعذر تحميل بيانات الحلقة",
  weeklyAttendance: "حضور",
  weeklyAbsent: "غياب",
  memorizationExecution: "الحفظ",
  tikrar: "التكرار",
  reviewLabel: "المراجعة",
  linkingLabel: "الربط",
  memorizedPages: "صفحات الحفظ",
  revisedPages: "صفحات المراجعة",
  tiedPages: "صفحات الربط",
  memorized: "حافظ فقط",
  revised: "مراجعة فقط",
  tied: "ربط فقط",
  reviewTied: "ربط ومراجعة فقط",
  presentOnly: "حاضر فقط",
  absent: "غياب",
  notEvaluated: "لم يتم التقييم",
  complete: "كامل",
  unknownStudent: "طالب غير معرف",
};

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value);
}

function getStudyWeekLabel(weekOffset: number) {
  if (weekOffset === 0) {
    return TEXT.currentWeek;
  }

  if (weekOffset === 1) {
    return TEXT.previousWeek;
  }

  return TEXT.olderWeeks.replace("{count}", new Intl.NumberFormat("ar-SA").format(weekOffset));
}

function getStudyWeek(weekOffset: number) {
  const start = getStudyWeekStart();
  start.setDate(start.getDate() - weekOffset * 7);

  const dates = Array.from({ length: 5 }, (_, offset) => {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    return formatDateForQuery(date);
  });

  return {
    dates,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    label: getStudyWeekLabel(weekOffset),
  };
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {};
  }

  return value ?? {};
}

function hasPassingMemorization(record?: AttendanceRow) {
  if (!record || (record.status !== "present" && record.status !== "late")) {
    return false;
  }

  const evaluation = getEvaluationRecord(record.evaluations);
  return isPassingMemorizationLevel(evaluation.hafiz_level ?? null);
}

function hasPassingTikrar(record?: AttendanceRow) {
  if (!record || (record.status !== "present" && record.status !== "late")) {
    return false;
  }

  const evaluation = getEvaluationRecord(record.evaluations);
  return isPassingMemorizationLevel(evaluation.tikrar_level ?? null);
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("ar-SA", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function formatRatio(completed: number, target: number) {
  return `${formatCount(completed)}/${formatCount(target)}`;
}

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
      hint?: unknown;
      code?: unknown;
    };

    const parts = [candidate.message, candidate.error, candidate.details, candidate.hint, candidate.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(" - ");
    }
  }

  return "حدث خطأ غير معروف أثناء تحميل البيانات";
}

function isMissingDailyReportsTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === "PGRST205" && typeof candidate.message === "string" && candidate.message.includes("student_daily_reports");
}

function getDailyCompletionFlags(record?: AttendanceRow, dailyReport?: DailyReportRow) {
  const evaluation = record ? getEvaluationRecord(record.evaluations) : {};

  return {
    memorizationDone: Boolean(dailyReport?.memorization_done) || hasPassingMemorization(record),
    reviewDone: Boolean(dailyReport?.review_done) || isPassingMemorizationLevel(evaluation.samaa_level ?? null),
    linkingDone: Boolean(dailyReport?.linking_done) || isPassingMemorizationLevel(evaluation.rabet_level ?? null),
  };
}

function getDayStatus(record?: AttendanceRow, dailyReport?: DailyReportRow): DayStatus {
  if (record?.status === "absent" || record?.status === "excused") {
    return "absent";
  }

  const { reviewDone, linkingDone } = getDailyCompletionFlags(record, dailyReport);
  const passedMemorization = hasPassingMemorization(record);

  if (passedMemorization) {
    return reviewDone || linkingDone ? "complete" : "memorized";
  }

  if (reviewDone && linkingDone) {
    return "review-tied";
  }

  if (reviewDone) {
    return "review";
  }

  if (linkingDone) {
    return "tied";
  }

  if (record?.status === "late") {
    return "late";
  }

  if (record?.status === "present") {
    return "present-only";
  }

  return "none";
}

function getStatusColor(status: DayStatus) {
  switch (status) {
    case "absent":
      return "bg-[#ef4444]";
    case "late":
      return "border border-[#d1d5db] bg-white";
    case "present-only":
      return "bg-[#22d3ee]";
    case "memorized":
      return "bg-[#4ade80]";
    case "review":
      return "bg-[#3b82f6]";
    case "tied":
      return "bg-[#facc15]";
    case "review-tied":
      return "bg-[#8b5cf6]";
    case "complete":
      return "bg-[#15803d]";
    default:
      return "bg-[#e5e7eb]";
  }
}

function ProgressRow({
  label,
  completed,
  target,
  barClass,
  badgeClass,
}: {
  label: string;
  completed: number;
  target: number;
  barClass: string;
  badgeClass: string;
}) {
  const progress = target > 0 ? Math.min(100, (completed / target) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-black text-[#334155]">{label}</div>
        <div className={`rounded-full px-3 py-1 text-sm font-black ${badgeClass}`}>{formatRatio(completed, target)}</div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#edf1f5]">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MetricSummaryPill({ label, value, toneClass }: { label: string; value: string; toneClass: string }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-bold text-[#64748b]">{label}</div>
      <div className="mt-1 text-sm font-black text-[#1f2937]">{value}</div>
    </div>
  );
}

type CircleWeeklyReportsProps = {
  circleName: string;
  backHref: string;
  backLabel: string;
};

export function CircleWeeklyReports({ circleName, backHref, backLabel }: CircleWeeklyReportsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [students, setStudents] = useState<StudentCardData[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasPreviousWeek, setHasPreviousWeek] = useState(false);
  const studyWeek = useMemo(() => getStudyWeek(weekOffset), [weekOffset]);
  const studyDates = studyWeek.dates;
  const currentStudyDate = formatDateForQuery(new Date());
  const targetStudyDates = weekOffset === 0
    ? studyDates.filter((date) => isStudyDay(date) && date <= currentStudyDate)
    : studyDates.filter((date) => isStudyDay(date));
  const attendanceTargetCount = targetStudyDates.length;
  const executionTargetCount = targetStudyDates.length;
  const memorizationTargetCount = executionTargetCount;
  const reviewTargetCount = executionTargetCount;
  const linkingTargetCount = executionTargetCount;
  const tikrarTargetCount = executionTargetCount;

  useEffect(() => {
    async function fetchCircleData() {
      if (!circleName) {
        setStudents([]);
        setHasPreviousWeek(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const supabase = createClient();
        const previousWeek = getStudyWeek(weekOffset + 1);
        let activeSemesterId: string | null = null;

        try {
          const activeSemester = await getOrCreateActiveSemester(supabase);
          activeSemesterId = activeSemester.id;
        } catch (semesterError) {
          if (isNoActiveSemesterError(semesterError)) {
            setError("لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا لعرض التقرير الأسبوعي.");
            setHasPreviousWeek(false);
            setStudents([]);
            setLoading(false);
            return;
          }
          if (!isMissingSemestersTable(semesterError)) {
            throw semesterError;
          }
        }

        const studentsResult = await supabase
          .from("students")
          .select("id, name, halaqah, id_number, account_number, points")
          .eq("halaqah", circleName)
          .order("points", { ascending: false });

        if (studentsResult.error) {
          throw studentsResult.error;
        }

        const studentRows = (studentsResult.data ?? []) as StudentRow[];
        const studentIds = studentRows.map((student) => student.id).filter(Boolean);

        if (studentIds.length === 0) {
          setHasPreviousWeek(false);
          setStudents([]);
          return;
        }

        let plansQuery = supabase
          .from("student_plans")
          .select("id, student_id, start_date, created_at, daily_pages, muraajaa_pages, rabt_pages, review_distribution_mode, muraajaa_mode, weekly_muraajaa_min_daily_pages, weekly_muraajaa_start_day, weekly_muraajaa_end_day, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, completed_juzs")
          .in("student_id", studentIds);

        let attendanceRangeQuery = supabase
          .from("attendance_records")
          .select(`
              id,
              student_id,
              date,
              status,
              evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
            `)
          .eq("halaqah", circleName)
          .gte("date", studyWeek.startDate)
          .lte("date", studyWeek.endDate);

        let previousWeekAttendanceQuery = supabase
          .from("attendance_records")
          .select("id", { count: "exact", head: true })
          .eq("halaqah", circleName)
          .gte("date", previousWeek.startDate)
          .lte("date", previousWeek.endDate);

        if (activeSemesterId) {
          plansQuery = plansQuery.eq("semester_id", activeSemesterId);
          attendanceRangeQuery = attendanceRangeQuery.eq("semester_id", activeSemesterId);
          previousWeekAttendanceQuery = previousWeekAttendanceQuery.eq("semester_id", activeSemesterId);
        }

        const [plansResult, attendanceResult, previousWeekAttendanceResult] = await Promise.all([
          plansQuery,
          attendanceRangeQuery,
          previousWeekAttendanceQuery,
        ]);

        if (plansResult.error) {
          throw plansResult.error;
        }

        if (attendanceResult.error) {
          throw attendanceResult.error;
        }

        if (previousWeekAttendanceResult.error) {
          throw previousWeekAttendanceResult.error;
        }

        const plans = (plansResult.data ?? []) as PlanRow[];
        const attendanceRows = ((attendanceResult.data ?? []) as AttendanceRow[]).filter((record) => studyDates.includes(record.date));
        let dailyReports: DailyReportRow[] = [];
        let previousWeekReportsCount = 0;

        const [dailyReportsResult, previousWeekReportsResult] = await Promise.all([
          supabase
            .from("student_daily_reports")
            .select("student_id, report_date, memorization_done, review_done, linking_done")
            .in("student_id", studentIds)
            .gte("report_date", studyWeek.startDate)
            .lte("report_date", studyWeek.endDate),
          supabase
            .from("student_daily_reports")
            .select("student_id", { count: "exact", head: true })
            .in("student_id", studentIds)
            .gte("report_date", previousWeek.startDate)
            .lte("report_date", previousWeek.endDate),
        ]);

        const dailyReportsTableMissing = isMissingDailyReportsTable(dailyReportsResult.error) || isMissingDailyReportsTable(previousWeekReportsResult.error);

        if (!dailyReportsTableMissing) {
          if (dailyReportsResult.error) {
            throw dailyReportsResult.error;
          }

          if (previousWeekReportsResult.error) {
            throw previousWeekReportsResult.error;
          }

          dailyReports = ((dailyReportsResult.data ?? []) as DailyReportRow[]).filter((report) => studyDates.includes(report.report_date));
          previousWeekReportsCount = previousWeekReportsResult.count ?? 0;
        }

        const plansByStudent = groupPlansByStudent(plans);
        const attendanceByStudent = new Map<string, Map<string, AttendanceRow>>();
        const dailyReportsByStudent = new Map<string, Map<string, DailyReportRow>>();

        for (const record of attendanceRows) {
          const byDate = attendanceByStudent.get(record.student_id) ?? new Map<string, AttendanceRow>();
          byDate.set(record.date, record);
          attendanceByStudent.set(record.student_id, byDate);
        }

        for (const report of dailyReports) {
          const byDate = dailyReportsByStudent.get(report.student_id) ?? new Map<string, DailyReportRow>();
          byDate.set(report.report_date, report);
          dailyReportsByStudent.set(report.student_id, byDate);
        }

        const cardRows = studentRows
          .map((student) => {
            const studentPlans = plansByStudent.get(student.id) || [];
            const byDate = attendanceByStudent.get(student.id) ?? new Map<string, AttendanceRow>();
            const reportsByDate = dailyReportsByStudent.get(student.id) ?? new Map<string, DailyReportRow>();
            let memorized = 0;
            let revised = 0;
            let tied = 0;
            let presentCount = 0;
            let absentCount = 0;
            let memorizationCompletedCount = 0;
            let reviewCompletedCount = 0;
            let linkingCompletedCount = 0;
            let tikrarCompletedCount = 0;
            let memorizedPoolPages = 0;
            let activePlanId: string | null = null;

            const statuses = studyDates.map((date) => {
              const plan = getPlanForDate(studentPlans, date);
              const record = byDate.get(date);
              const dailyReport = reportsByDate.get(date);
              const status = getDayStatus(record, dailyReport);
              const { memorizationDone, reviewDone, linkingDone } = getDailyCompletionFlags(record, dailyReport);
              const priorReviewCompletedCount = reviewCompletedCount;

              if (plan?.id && plan.id !== activePlanId) {
                memorizedPoolPages = Math.max(memorizedPoolPages, calculatePreviousMemorizedPages(plan));
                activePlanId = plan.id;
              }

              if (record?.status === "present" || record?.status === "late") {
                presentCount += 1;
              }

              if (record?.status === "absent" || record?.status === "excused") {
                absentCount += 1;
              }

              if (memorizationDone) {
                memorizationCompletedCount += 1;
              }

              if (plan) {
                const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages);
                const reviewPages = resolvePlanReviewPagesForDate(plan, reviewPoolPages, priorReviewCompletedCount, date);
                const tiePages = Math.min(Number(plan.rabt_pages ?? 10), Math.max(0, memorizedPoolPages));

                if (reviewDone) {
                  revised += reviewPages;
                }

                if (linkingDone) {
                  tied += tiePages;
                }

                if (hasPassingMemorization(record)) {
                  const dailyPages = Number(plan.daily_pages ?? 1);
                  memorized += dailyPages;
                  memorizedPoolPages += dailyPages;
                }
              }

              if (reviewDone) {
                reviewCompletedCount += 1;
              }

              if (linkingDone) {
                linkingCompletedCount += 1;
              }

              if (hasPassingTikrar(record)) {
                tikrarCompletedCount += 1;
              }

              return { date, status };
            });

            const totalActivity = memorized + revised + tied;

            return {
              id: student.id,
              name: student.name?.trim() || TEXT.unknownStudent,
              memorized,
              revised,
              tied,
              presentCount,
              absentCount,
              memorizationCompletedCount,
              reviewCompletedCount,
              linkingCompletedCount,
              tikrarCompletedCount,
              statuses,
              totalActivity,
            } satisfies StudentCardData;
          })
          .sort((left, right) => {
            if (right.totalActivity !== left.totalActivity) {
              return right.totalActivity - left.totalActivity;
            }

            if (right.presentCount !== left.presentCount) {
              return right.presentCount - left.presentCount;
            }

            return left.name.localeCompare(right.name, "ar");
          });

        setHasPreviousWeek((previousWeekAttendanceResult.count ?? 0) > 0 || previousWeekReportsCount > 0);
        setStudents(cardRows);
      } catch (caughtError) {
        const message = getReadableErrorMessage(caughtError);
        setError(`${TEXT.loadError}: ${message}`);
        setHasPreviousWeek(false);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchCircleData();
  }, [circleName, studyDates, studyWeek.endDate, studyWeek.startDate, weekOffset]);

  return (
    <div className="min-h-screen bg-[#fafaf9] font-cairo" dir="rtl">
      <Header />
      <main className="px-4 py-10">
        <div className="container mx-auto max-w-7xl space-y-8">
          <div className="grid grid-cols-[48px_1fr_48px] items-center">
            <Link
              href={backHref}
              className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#dccba0] bg-white text-[#1a2332] shadow-sm transition hover:border-[#3453a7]"
              aria-label={backLabel}
            >
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-black text-[#1f2937]">{TEXT.titleSuffix}</h1>
              <p className="mt-2 text-sm font-bold text-[#64748b]">{circleName}</p>
            </div>
            <div />
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <SiteLoader size="lg" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          ) : students.length === 0 ? (
            <div className="rounded-[28px] border border-[#e6dfcb] bg-white px-6 py-16 text-center text-lg font-bold text-[#7b8794] shadow-sm">
              {TEXT.noStudents}
            </div>
          ) : (
            <section className="space-y-4">
              <div className="rounded-[24px] border border-[#e5e7eb] bg-[#fcfcfb] px-4 py-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-2 py-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setWeekOffset((currentOffset) => Math.max(0, currentOffset - 1))}
                      disabled={weekOffset === 0}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#1f2937] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#c7cdd4] disabled:hover:bg-transparent"
                      aria-label="الرجوع للأسبوع الأحدث"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="min-w-[118px] text-center text-sm font-black text-[#1f2937]">{studyWeek.label}</span>
                    <button
                      type="button"
                      onClick={() => setWeekOffset((currentOffset) => currentOffset + 1)}
                      disabled={!hasPreviousWeek}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#1f2937] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:text-[#c7cdd4] disabled:hover:bg-transparent"
                      aria-label="الانتقال إلى الأسبوع الأقدم"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {students.map((student) => (
                  <article key={student.id} className="overflow-hidden rounded-[28px] border border-[#dde6f0] bg-white shadow-sm">
                    <div className="p-6">
                      <div className="mb-5 flex items-start justify-between gap-4">
                        <div className="min-w-0 text-right">
                          <div className="truncate text-2xl font-black text-[#1f2937]">{student.name}</div>
                        </div>
                        <Users className="mt-1 h-5 w-5 shrink-0 text-[#6a8fbf]" />
                      </div>

                      <div className="mb-5 rounded-[24px] border border-[#eef2f6] bg-[#fcfdff] p-4">
                        <div className="space-y-4">
                          <ProgressRow
                            label={TEXT.weeklyAttendance}
                            completed={student.presentCount}
                            target={attendanceTargetCount}
                            barClass="bg-[#22c55e]"
                            badgeClass="bg-[#ecfdf5] text-[#15803d]"
                          />
                          <ProgressRow
                            label={TEXT.memorizationExecution}
                            completed={student.memorizationCompletedCount}
                            target={memorizationTargetCount}
                            barClass="bg-[#16a34a]"
                            badgeClass="bg-[#f0fdf4] text-[#166534]"
                          />
                          <ProgressRow
                            label={TEXT.reviewLabel}
                            completed={student.reviewCompletedCount}
                            target={reviewTargetCount}
                            barClass="bg-[#2563eb]"
                            badgeClass="bg-[#eff6ff] text-[#1d4ed8]"
                          />
                          <ProgressRow
                            label={TEXT.linkingLabel}
                            completed={student.linkingCompletedCount}
                            target={linkingTargetCount}
                            barClass="bg-[#f59e0b]"
                            badgeClass="bg-[#fffbeb] text-[#b45309]"
                          />
                          <ProgressRow
                            label={TEXT.tikrar}
                            completed={student.tikrarCompletedCount}
                            target={tikrarTargetCount}
                            barClass="bg-[#0f766e]"
                            badgeClass="bg-[#f0fdfa] text-[#0f766e]"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 border-t border-dashed border-[#e2e8f0] pt-4">
                          <MetricSummaryPill label={TEXT.memorizedPages} value={formatMetric(student.memorized)} toneClass="bg-[#f0fdf4]" />
                          <MetricSummaryPill label={TEXT.revisedPages} value={formatMetric(student.revised)} toneClass="bg-[#eff6ff]" />
                          <MetricSummaryPill label={TEXT.tiedPages} value={formatMetric(student.tied)} toneClass="bg-[#fffbeb]" />
                        </div>
                      </div>

                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}