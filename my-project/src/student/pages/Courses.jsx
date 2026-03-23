import { useMemo } from "react";
import { FiBookOpen, FiCheckCircle, FiClock } from "react-icons/fi";

// Optional helper: auto semester based on your rule
function getSemesterFromDate(date = new Date()) {
  const m = date.getMonth() + 1; // 1-12
  // 1st semester: Oct(10) - Jan(1)
  if (m >= 10 || m <= 1) return "FIRST SEMESTER";
  // 2nd semester: Feb(2) - May(5)
  if (m >= 2 && m <= 5) return "SECOND SEMESTER";
  // For June-Sep (holidays), keep the last known semester or default
  return "SECOND SEMESTER";
}

export default function StudentCourses() {
  // ================= SAMPLE: ALL REGISTERED COURSES =================
  // (This can later come from Supabase depending on student's class/program)
  const allCourses = useMemo(
    () => [
      { code: "BIO101", name: "General Biology", semester: "FIRST SEMESTER" },
      { code: "CHM101", name: "General Chemistry", semester: "FIRST SEMESTER" },
      { code: "MAT111", name: "Statistics", semester: "FIRST SEMESTER" },
      { code: "ENG101", name: "Academic Writing", semester: "FIRST SEMESTER" },

      { code: "BIO203", name: "Cell Biology", semester: "SECOND SEMESTER" },
      { code: "BIO210", name: "Genetics", semester: "SECOND SEMESTER" },
      { code: "CHM202", name: "Organic Chemistry", semester: "SECOND SEMESTER" },
      { code: "CSC105", name: "Introduction to Computing", semester: "SECOND SEMESTER" },
    ],
    []
  );

  /**
   * ================= IMPORTANT =================
   * publishedResults should come from your DB once results are published.
   * Example table: results (or reports) with fields:
   * - course_code, semester, type ('CA'/'EXAM'), published (boolean)
   *
   * For now, we mock it:
   */
  const publishedResults = useMemo(
    () => [
      // Suppose admin published 1st semester results already:
      { course_code: "BIO101", semester: "FIRST SEMESTER", type: "CA", published: true },
      { course_code: "CHM101", semester: "FIRST SEMESTER", type: "EXAM", published: true },
      { course_code: "MAT111", semester: "FIRST SEMESTER", type: "EXAM", published: true },
      { course_code: "ENG101", semester: "FIRST SEMESTER", type: "CA", published: true },

      // 2nd semester not yet published -> those courses remain
      // { course_code: "BIO203", semester: "SECOND SEMESTER", type: "EXAM", published: true },
    ],
    []
  );

  // Auto semester (based on date) — can also allow override if you want
  const currentSemester = getSemesterFromDate();

  /**
   * ================= LOGIC =================
   * A semester is considered "active" if the admin has published at least one result
   * (CA or EXAM) for that semester. All courses in active semesters are considered "offered".
   */
  const activeSemesters = useMemo(() => {
    return new Set(
      publishedResults
        .filter((r) => r.published)
        .map((r) => r.semester)
    );
  }, [publishedResults]);

  // Offered courses: all courses in active semesters
  const offeredCourses = useMemo(() => {
    return allCourses.filter((c) => activeSemesters.has(c.semester));
  }, [allCourses, activeSemesters]);

  // Remaining courses: courses not in active semesters
  const remainingCourses = useMemo(() => {
    return allCourses.filter((c) => !activeSemesters.has(c.semester));
  }, [allCourses, activeSemesters]);

  // Optional: show "current semester courses" separately (nice UX)
  const currentSemesterCourses = useMemo(() => {
    return allCourses.filter((c) => c.semester === currentSemester);
  }, [allCourses, currentSemester]);

  const progress = useMemo(() => {
    const total = allCourses.length;
    const completed = offeredCourses.length;
    const remaining = remainingCourses.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, remaining, pct };
  }, [allCourses.length, offeredCourses.length, remainingCourses.length]);

  const pill = (tone) => {
    const base =
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border";
    if (tone === "blue") return `${base} bg-blue-50 text-blue-700 border-blue-100`;
    if (tone === "green") return `${base} bg-green-50 text-green-700 border-green-100`;
    return `${base} bg-red-50 text-red-700 border-red-100`;
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                My Course Progress
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                This page automatically updates when results are published.
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                Current Semester: <span className="text-blue-700">{currentSemester}</span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className={pill("blue")}>
                <FiBookOpen />
                Total: {progress.total}
              </span>
              <span className={pill("green")}>
                <FiCheckCircle />
                Offered: {progress.completed}
              </span>
              <span className={pill("red")}>
                <FiClock />
                Remaining: {progress.remaining}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Progress</span>
              <span className="text-gray-900">{progress.pct}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CURRENT SEMESTER COURSES */}
            <Card
              title="Current Semester Courses"
              subtitle="Courses for the semester you are in now"
              tone="blue"
            >
              <CourseList tone="blue" items={currentSemesterCourses} />
              <FooterCount label="This Semester" value={currentSemesterCourses.length} />
            </Card>

            {/* OFFERED COURSES */}
            <Card
              title="Courses Already Offered"
              subtitle="Automatically marked when results are published"
              tone="green"
            >
              <CourseList tone="green" items={offeredCourses} />
              <FooterCount label="Offered" value={offeredCourses.length} />
            </Card>

            {/* REMAINING COURSES */}
            <Card
              title="Remaining Courses"
              subtitle="Not yet offered (results not published)"
              tone="red"
            >
              {remainingCourses.length > 0 ? (
                <CourseList tone="red" items={remainingCourses} />
              ) : (
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-green-800">
                  <p className="font-semibold">🎉 All courses completed!</p>
                  <p className="text-sm mt-1">No remaining courses in your list.</p>
                </div>
              )}
              <FooterCount label="Remaining" value={remainingCourses.length} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= UI HELPERS ================= */

function Card({ title, subtitle, tone, children }) {
  const accent =
    tone === "blue"
      ? "text-blue-700"
      : tone === "green"
      ? "text-green-700"
      : "text-red-700";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
      <div className="p-5 border-b border-gray-100">
        <h2 className={`text-lg font-semibold ${accent}`}>{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function CourseList({ items, tone }) {
  const itemStyle =
    tone === "blue"
      ? "border-blue-100 bg-blue-50 text-blue-800"
      : tone === "green"
      ? "border-green-100 bg-green-50 text-green-800"
      : "border-red-100 bg-red-50 text-red-800";

  return (
    <ul className="space-y-3">
      {items.map((course, index) => (
        <li
          key={index}
          className={`rounded-xl border p-3 text-sm font-medium ${itemStyle} hover:bg-white transition`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold">{course.code}</p>
              <p className="text-sm opacity-90 break-words">{course.name}</p>
            </div>
            <span className="shrink-0 text-[11px] font-semibold rounded-full border border-white/40 px-2 py-1">
              {course.semester === "FIRST SEMESTER" ? "Sem 1" : "Sem 2"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function FooterCount({ label, value }) {
  return (
    <div className="mt-5 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
    </div>
  );
}
