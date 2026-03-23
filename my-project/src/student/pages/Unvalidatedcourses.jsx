import { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiBookOpen,
  FiRefreshCcw,
} from "react-icons/fi";

/**
 * RULES YOU CAN EDIT
 * - passMark: minimum final score to validate the course
 */
const passMark = 50;

export default function UnvalidatedCourses() {
  /**
   * ===========================
   * SAMPLE COURSES (per semester)
   * Replace later with DB courses (student's class/program)
   * ===========================
   */
  const allCourses = useMemo(
    () => [
      { code: "CSC101", name: "Intro to Computing", semester: "SEMESTER 1" },
      { code: "MTH101", name: "Mathematics I", semester: "SEMESTER 1" },
      { code: "STA101", name: "Statistics I", semester: "SEMESTER 1" },
      { code: "PHY101", name: "Physics I", semester: "SEMESTER 1" },

      { code: "CSC102", name: "Programming I", semester: "SEMESTER 2" },
      { code: "CHM102", name: "Chemistry II", semester: "SEMESTER 2" },
      { code: "BIO102", name: "Biology II", semester: "SEMESTER 2" },
    ],
    []
  );

  /**
   * ===========================
   * MOCK "PUBLICATIONS" HISTORY
   * Each time admin publishes results -> a new publication batch exists.
   * Replace later with DB records.
   *
   * publication_id: groups a publish event (e.g., "Sem1 CA published", "Sem1 Exams published")
   * created_at: publish date
   * semester: which semester the publish belongs to
   * type: "CA" or "EXAM" or "FINAL"
   * results: list of course results for that publish event
   * ===========================
   */
  const publications = useMemo(
    () => [
      {
        publication_id: "PUB-001",
        created_at: "2026-01-10",
        semester: "SEMESTER 1",
        type: "CA",
        results: [
          { course_code: "CSC101", ca: 18, exam: null },
          { course_code: "MTH101", ca: 10, exam: null },
          { course_code: "STA101", ca: 22, exam: null },
          { course_code: "PHY101", ca: 15, exam: null },
        ],
      },
      {
        publication_id: "PUB-002",
        created_at: "2026-01-28",
        semester: "SEMESTER 1",
        type: "EXAM",
        results: [
          { course_code: "CSC101", ca: 18, exam: 40 }, // final 58 -> validated
          { course_code: "MTH101", ca: 10, exam: 25 }, // final 35 -> unvalidated
          { course_code: "STA101", ca: 22, exam: 18 }, // final 40 -> unvalidated
          { course_code: "PHY101", ca: 15, exam: 38 }, // final 53 -> validated
        ],
      },
      {
        publication_id: "PUB-003",
        created_at: "2026-02-20",
        semester: "SEMESTER 2",
        type: "CA",
        results: [
          { course_code: "CSC102", ca: 14, exam: null },
          { course_code: "CHM102", ca: 26, exam: null },
          { course_code: "BIO102", ca: 12, exam: null },
        ],
      },
    ],
    []
  );

  // ===========================
  // UI STATE
  // ===========================
  const [semester, setSemester] = useState("SEMESTER 1");
  const [viewMode, setViewMode] = useState("latest"); // "latest" or "history"
  const [selectedPublicationId, setSelectedPublicationId] = useState("");

  // Publications for selected semester
  const semesterPublications = useMemo(() => {
    return publications
      .filter((p) => p.semester === semester)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [publications, semester]);

  const latestPublication = semesterPublications[0] || null;

  // Choose which publication to display in the right panel
  const activePublication = useMemo(() => {
    if (!semesterPublications.length) return null;

    if (viewMode === "latest") return latestPublication;

    if (!selectedPublicationId) return semesterPublications[0];

    return (
      semesterPublications.find((p) => p.publication_id === selectedPublicationId) ||
      semesterPublications[0]
    );
  }, [semesterPublications, latestPublication, viewMode, selectedPublicationId]);

  // Build a lookup for quick course name/semester info
  const courseMap = useMemo(() => {
    const map = new Map();
    allCourses.forEach((c) => map.set(c.code, c));
    return map;
  }, [allCourses]);

  // Compute overall counts from active publication
  const overallCounts = useMemo(() => {
    if (!activePublication) return { unvalidated: 0, validated: 0, pending: 0 };

    let unvalidated = 0;
    let validated = 0;
    let pending = 0;

    activePublication.results.forEach((r) => {
      const ca = r.ca ?? null;
      const exam = r.exam ?? null;
      const final = exam != null ? Number(ca || 0) + Number(exam || 0) : null;

      if (final == null) {
        pending++;
      } else if (final >= passMark) {
        validated++;
      } else {
        unvalidated++;
      }
    });

    return { unvalidated, validated, pending };
  }, [activePublication]);

  // Convert active publication results into display rows with computed status, filtered to unvalidated courses only
  const rows = useMemo(() => {
    if (!activePublication) return [];

    return activePublication.results
      .map((r) => {
        const course = courseMap.get(r.course_code) || {
          code: r.course_code,
          name: "Unknown course",
          semester,
        };

        const ca = r.ca ?? null;
        const exam = r.exam ?? null;

        // Actually CA is /30 and exam is /70: final = ca + exam
        // Safer:
        const final = exam != null ? Number(ca || 0) + Number(exam || 0) : null;

        const validated = final != null ? final >= passMark : null;

        return {
          course_code: course.code,
          course_name: course.name,
          ca,
          exam,
          final,
          validated,
        };
      })
      .filter((r) => r.final != null && r.validated === false) // Filter to only unvalidated courses
      .sort((a, b) => a.course_code.localeCompare(b.course_code));
  }, [activePublication, courseMap, semester]);

  const unvalidated = useMemo(() => rows, [rows]); // rows is already filtered to unvalidated

  // Small UI helpers
  const badge = (tone) => {
    const base =
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border";
    if (tone === "green") return `${base} bg-green-50 text-green-700 border-green-100`;
    if (tone === "red") return `${base} bg-red-50 text-red-700 border-red-100`;
    return `${base} bg-yellow-50 text-yellow-700 border-yellow-100`;
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Unvalidated Courses
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Automatically updates whenever CA / Exam results are published.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={badge("red")}>
                  <FiAlertTriangle />
                  Unvalidated: {overallCounts.unvalidated}
                </span>
                <span className={badge("yellow")}>
                  <FiClock />
                  Pending: {overallCounts.pending}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <select
                value={semester}
                onChange={(e) => {
                  setSemester(e.target.value);
                  setSelectedPublicationId("");
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SEMESTER 1">Semester 1</option>
                <option value="SEMESTER 2">Semester 2</option>
              </select>

              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setSelectedPublicationId("");
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">Latest Published</option>
                <option value="history">History</option>
              </select>

              <button
                onClick={() => {
                  // in real app: re-fetch from supabase
                  // here just a friendly UI button
                  alert("Refreshing from published results...");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
              >
                <FiRefreshCcw />
                Refresh
              </button>
            </div>
          </div>

          {/* History selector (only when viewMode=history) */}
          {viewMode === "history" && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-semibold text-gray-700">
                Select publication:
              </span>

              <select
                value={selectedPublicationId}
                onChange={(e) => setSelectedPublicationId(e.target.value)}
                className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {semesterPublications.map((p) => (
                  <option key={p.publication_id} value={p.publication_id}>
                    {p.type} • {p.created_at} • {p.publication_id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6">
          {!activePublication ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                <FiBookOpen className="text-gray-700 text-xl" />
              </div>
              <p className="mt-3 font-semibold text-gray-900">
                No published results yet for this semester.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                When the admin publishes CA/Exam results, you will see unvalidated courses here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: Summary cards */}
              <div className="lg:col-span-1 space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500">Active Publication</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {activePublication.type}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Published on <span className="font-semibold">{activePublication.created_at}</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Semester: <span className="font-semibold">{activePublication.semester}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                  <p className="text-xs font-semibold text-red-700">Unvalidated Courses</p>
                  <p className="mt-2 text-3xl font-extrabold text-red-800">{unvalidated.length}</p>
                  <p className="text-sm text-red-700 mt-2">
                    These courses need improvement / resit to be validated.
                  </p>
                </div>

                <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
                  <p className="text-xs font-semibold text-yellow-700">Pending Validation</p>
                  <p className="mt-2 text-3xl font-extrabold text-yellow-800">{overallCounts.pending}</p>
                  <p className="text-sm text-yellow-700 mt-2">
                    Exam not published yet, validation will update automatically.
                  </p>
                </div>
              </div>

              {/* RIGHT: Table */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900">
                        Unvalidated Courses
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Courses that require improvement or resit based on the latest published results.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="px-5 py-3 text-left">Course</th>
                          <th className="px-5 py-3 text-center">CA / 30</th>
                          <th className="px-5 py-3 text-center">Exam / 70</th>
                          <th className="px-5 py-3 text-center">Final / 100</th>
                          <th className="px-5 py-3 text-center">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map((r) => {
                          const statusChip =
                            r.final == null ? (
                              <span className={badge("yellow")}>Pending</span>
                            ) : r.validated ? (
                              <span className={badge("green")}>Validated</span>
                            ) : (
                              <span className={badge("red")}>Unvalidated</span>
                            );

                          return (
                            <tr key={r.course_code} className="border-t hover:bg-gray-50 transition">
                              <td className="px-5 py-4">
                                <div className="font-bold text-gray-900">{r.course_code}</div>
                                <div className="text-gray-500">{r.course_name}</div>
                              </td>

                              <td className="px-5 py-4 text-center font-semibold text-gray-800">
                                {r.ca ?? <span className="text-gray-400">—</span>}
                              </td>

                              <td className="px-5 py-4 text-center font-semibold text-gray-800">
                                {r.exam ?? <span className="text-gray-400">—</span>}
                              </td>

                              <td className="px-5 py-4 text-center font-extrabold text-gray-900">
                                {r.final ?? <span className="text-gray-400">—</span>}
                              </td>

                              <td className="px-5 py-4 text-center">{statusChip}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 py-4 border-t border-gray-100 text-xs text-gray-500">
                    Pass mark: <span className="font-semibold text-gray-800">{passMark}/100</span> •
                    CA + Exam = Final Score
                  </div>
                </div>

                {/* unvalidated list quick view */}
                {unvalidated.length > 0 && (
                  <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
                    <p className="font-bold text-red-800">
                      Courses to focus on
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      These are currently unvalidated based on the latest published results.
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {unvalidated.map((c) => (
                        <div
                          key={c.course_code}
                          className="rounded-xl border border-red-100 bg-white p-4"
                        >
                          <p className="font-extrabold text-gray-900">{c.course_code}</p>
                          <p className="text-sm text-gray-600">{c.course_name}</p>
                          <p className="text-sm mt-2 text-red-700 font-semibold">
                            Final: {c.final}/100
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
