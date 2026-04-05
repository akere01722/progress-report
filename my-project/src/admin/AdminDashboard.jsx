import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  FileText,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const BAR_PALETTE = [
  "from-blue-500 to-blue-700",
  "from-cyan-500 to-cyan-700",
  "from-indigo-500 to-indigo-700",
  "from-sky-500 to-sky-700",
  "from-blue-400 to-cyan-500",
  "from-blue-600 to-indigo-600",
];

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const compactNumber = (value) =>
  Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const toPercent = (value) => `${Math.round(Number(value || 0))}%`;

const makeKeyFromName = (value) => normalizeText(value).toLowerCase();

const sortByValueDesc = (entries) =>
  [...entries].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

const enrichChartEntries = (entries, messageBuilder) =>
  entries.map((item, index) => ({
    ...item,
    color: BAR_PALETTE[index % BAR_PALETTE.length],
    message: messageBuilder(item),
  }));

const buildLookupMaps = (faculties, departments) => {
  const facultyNameById = new Map(
    (Array.isArray(faculties) ? faculties : []).map((faculty) => [
      String(faculty.id),
      normalizeText(faculty.name) || "Unknown",
    ])
  );

  const departmentNameById = new Map(
    (Array.isArray(departments) ? departments : []).map((department) => [
      String(department.id),
      normalizeText(department.name) || "Unknown",
    ])
  );

  return { facultyNameById, departmentNameById };
};

const addCount = (bucket, key, label, count = 1) => {
  if (!key) return;
  const existing = bucket.get(key) || { label, value: 0 };
  existing.value += Number(count || 0);
  existing.label = label || existing.label;
  bucket.set(key, existing);
};

const getFacultyIdentity = (row, facultyNameById) => {
  const facultyId = row?.faculty_id != null ? String(row.faculty_id) : "";
  if (facultyId) {
    return {
      key: `id:${facultyId}`,
      label: facultyNameById.get(facultyId) || normalizeText(row?.faculty) || "Unknown",
    };
  }

  const fallbackName = normalizeText(row?.faculty) || "Unknown";
  return { key: `name:${makeKeyFromName(fallbackName)}`, label: fallbackName };
};

const getDepartmentIdentity = (row, departmentNameById) => {
  const departmentId = row?.department_id != null ? String(row.department_id) : "";
  if (departmentId) {
    return {
      key: `id:${departmentId}`,
      label: departmentNameById.get(departmentId) || normalizeText(row?.department) || "Unknown",
    };
  }

  const fallbackName = normalizeText(row?.department) || "Unknown";
  return { key: `name:${makeKeyFromName(fallbackName)}`, label: fallbackName };
};

const fetchRows = async (table, selectClause, fallbackSelectClause = "") => {
  const { data, error } = await supabase.from(table).select(selectClause);
  if (!error) return data || [];
  if (!fallbackSelectClause) throw error;

  const fallback = await supabase.from(table).select(fallbackSelectClause);
  if (fallback.error) throw fallback.error;
  return fallback.data || [];
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState({
    studentsCount: 0,
    teachersCount: 0,
    subjectsCount: 0,
    assignmentsCount: 0,
    facultiesCount: 0,
    departmentsCount: 0,
    teachersAssignedCount: 0,
    facultyEntries: [],
    departmentEntries: [],
  });

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!isSupabaseConfigured || !supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [
          facultiesRows,
          departmentsRows,
          studentsRows,
          teachersRows,
          subjectsRows,
          assignmentRows,
        ] = await Promise.all([
          fetchRows("faculties", "id,name"),
          fetchRows("departments", "id,name,faculty_id"),
          fetchRows("students", "id,faculty_id,department_id", "*"),
          fetchRows("teachers", "id,faculty_id,department_id", "*"),
          fetchRows("subjects", "id"),
          fetchRows("teacher_assignments", "teacher_id"),
        ]);

        const { facultyNameById, departmentNameById } = buildLookupMaps(
          facultiesRows,
          departmentsRows
        );

        const facultyCounts = new Map();
        const departmentCounts = new Map();

        studentsRows.forEach((row) => {
          const faculty = getFacultyIdentity(row, facultyNameById);
          const department = getDepartmentIdentity(row, departmentNameById);
          addCount(facultyCounts, faculty.key, faculty.label, 1);
          addCount(departmentCounts, department.key, department.label, 1);
        });

        teachersRows.forEach((row) => {
          const faculty = getFacultyIdentity(row, facultyNameById);
          const department = getDepartmentIdentity(row, departmentNameById);
          addCount(facultyCounts, faculty.key, faculty.label, 1);
          addCount(departmentCounts, department.key, department.label, 1);
        });

        const facultyEntries = enrichChartEntries(
          sortByValueDesc(Array.from(facultyCounts.values())).slice(0, 6),
          (item) => `${compactNumber(item.value)} users in ${item.label}`
        );

        const departmentEntries = enrichChartEntries(
          sortByValueDesc(Array.from(departmentCounts.values())).slice(0, 6),
          (item) => `${compactNumber(item.value)} users in ${item.label}`
        );

        const uniqueAssignedTeacherIds = new Set(
          (assignmentRows || [])
            .map((row) => String(row?.teacher_id || "").trim())
            .filter(Boolean)
        );

        setSnapshot({
          studentsCount: studentsRows.length,
          teachersCount: teachersRows.length,
          subjectsCount: subjectsRows.length,
          assignmentsCount: assignmentRows.length,
          facultiesCount: facultiesRows.length,
          departmentsCount: departmentsRows.length,
          teachersAssignedCount: uniqueAssignedTeacherIds.size,
          facultyEntries,
          departmentEntries,
        });

        setError("");
      } catch (loadError) {
        setError(loadError?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  const assignmentCoverage = useMemo(() => {
    if (!snapshot.teachersCount) return 0;
    return (snapshot.teachersAssignedCount / snapshot.teachersCount) * 100;
  }, [snapshot.teachersAssignedCount, snapshot.teachersCount]);

  const pendingReports = useMemo(
    () => Math.max(snapshot.teachersCount - snapshot.teachersAssignedCount, 0),
    [snapshot.teachersAssignedCount, snapshot.teachersCount]
  );

  const stats = useMemo(
    () => [
      {
        title: "Total Students",
        value: compactNumber(snapshot.studentsCount),
        icon: GraduationCap,
        hint: `${compactNumber(snapshot.facultiesCount)} faculties represented`,
      },
      {
        title: "Total Teachers",
        value: compactNumber(snapshot.teachersCount),
        icon: Users,
        hint: `${compactNumber(snapshot.teachersAssignedCount)} assigned to classes`,
      },
      {
        title: "Pending Reports",
        value: compactNumber(pendingReports),
        icon: FileText,
        hint: "Teachers pending class assignment",
      },
      {
        title: "Submission Rate",
        value: toPercent(assignmentCoverage),
        icon: TrendingUp,
        hint: "Assignment completion by teachers",
      },
    ],
    [
      assignmentCoverage,
      pendingReports,
      snapshot.facultiesCount,
      snapshot.studentsCount,
      snapshot.teachersAssignedCount,
      snapshot.teachersCount,
    ]
  );

  const usersByType = useMemo(
    () =>
      enrichChartEntries(
        [
          { label: "Students", value: snapshot.studentsCount },
          { label: "Teachers", value: snapshot.teachersCount },
        ],
        (item) => `${compactNumber(item.value)} ${item.label.toLowerCase()} registered`
      ),
    [snapshot.studentsCount, snapshot.teachersCount]
  );

  const chartGroups = useMemo(
    () => [
      { title: "Users by Type", data: usersByType },
      { title: "Users by Faculty", data: snapshot.facultyEntries },
      { title: "Users by Department", data: snapshot.departmentEntries },
    ],
    [usersByType, snapshot.facultyEntries, snapshot.departmentEntries]
  );

  if (loading) {
    return (
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        Loading dashboard data...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Dashboard Overview</h1>
            <p className="mt-1 text-sm text-blue-50 sm:text-base">
              Live backend snapshot of students, teachers, and class assignments.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-white sm:w-auto disabled:opacity-60"
            >
              <CalendarDays className="h-4 w-4" />
              {refreshing ? "Refreshing..." : "This Week"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/inbox")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25 sm:w-auto"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="group overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">{s.title}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{s.value}</p>
                    <p className="mt-2 text-xs text-slate-500 sm:text-sm">{s.hint}</p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-xs text-slate-400">Updated from backend</p>
              </div>

              <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-40" />
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Performance Snapshot</h3>
            <p className="mt-1 text-sm text-slate-500">
              Real-time users by type, faculty and departments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDashboard(true)}
            className="hidden items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 sm:inline-flex"
          >
            Refresh
          </button>
        </div>

        <div className="px-5 pb-6 sm:px-6">
          <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-6 sm:p-8">
            <div className="space-y-5">
              <div className="flex flex-col gap-1 text-center sm:text-left">
                <p className="text-sm font-semibold text-slate-900">
                  School Users Statistics (Vertical Charts)
                </p>
                <p className="text-xs text-slate-500">
                  Students and teachers across faculties and departments.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {chartGroups.map((group) => {
                  const hasData = group.data.length > 0;
                  const maxValue = hasData
                    ? Math.max(...group.data.map((item) => Number(item.value || 0)), 1)
                    : 1;

                  return (
                    <div key={group.title} className="rounded-xl border border-blue-100 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-800">{group.title}</p>

                      {!hasData && (
                        <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                          No data available.
                        </div>
                      )}

                      {hasData && (
                        <div className="mt-4 flex h-44 items-end justify-between gap-2">
                          {group.data.map((item) => (
                            <div
                              key={item.label}
                              className="group relative flex flex-1 cursor-pointer flex-col items-center gap-1"
                            >
                              <div className="pointer-events-none absolute -top-1 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                                {item.message}
                              </div>
                              <span className="text-[11px] font-semibold text-slate-700">
                                {compactNumber(item.value)}
                              </span>
                              <div className="relative h-28 w-full max-w-[56px] overflow-hidden rounded-t-lg bg-slate-100 transition-transform duration-200 group-hover:-translate-y-1">
                                <div
                                  className={`absolute inset-x-0 bottom-0 rounded-t-lg bg-gradient-to-t ${item.color} transition-all duration-200 group-hover:brightness-110`}
                                  style={{
                                    height: `${Math.max((Number(item.value || 0) / maxValue) * 100, 10)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-center text-[10px] leading-tight text-slate-600 transition-colors duration-200 group-hover:text-slate-900">
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs text-slate-500">Registered Faculties</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {compactNumber(snapshot.facultiesCount)}
              </p>
            </div>
            <div className="flex-1 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs text-slate-500">Registered Departments</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {compactNumber(snapshot.departmentsCount)}
              </p>
            </div>
            <div className="flex-1 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-xs text-slate-500">Class Assignments</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {compactNumber(snapshot.assignmentsCount)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
