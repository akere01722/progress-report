import { useMemo, useState, useEffect } from "react";
import { FiDownload } from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";

/**
 * StudentAttendanceReview.jsx
 * ✅ Removed student information section
 * ✅ Layout rebalanced so the empty space is not felt
 * ✅ Beautiful + classic + responsive
 */

export default function StudentAttendanceReview() {
  const [attendanceData, setAttendanceData] = useState({});

  useEffect(() => {
    const fetchAttendanceData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("attendance")
          .select("date, course_code, course_title, status, semester, batch")
          .eq("student_id", user.id)
          .order("date", { ascending: false });

        if (data && !error) {
          // Group by semester
          const grouped = data.reduce((acc, record) => {
            const semester = record.semester || "FIRST SEMESTER";
            if (!acc[semester]) {
              acc[semester] = {
                batch: record.batch || "2025/2026",
                semester,
                records: [],
                adminNote: "Attendance data loaded from database.",
                updatedAt: new Date().toISOString().split('T')[0],
              };
            }
            acc[semester].records.push({
              date: record.date,
              course: record.course_code,
              title: record.course_title,
              status: record.status,
            });
            return acc;
          }, {});
          setAttendanceData(grouped);
        }
      }
      // Loading completed
    };
    fetchAttendanceData();
  }, []);

  const semesters = Object.keys(attendanceData);
  const [selectedSemester, setSelectedSemester] = useState(semesters[0] || "FIRST SEMESTER");

  const data = attendanceData[selectedSemester] || {
    batch: "2025/2026",
    semester: selectedSemester,
    records: [],
    adminNote: "No attendance data available.",
    updatedAt: new Date().toISOString().split('T')[0],
  };

  const courseOptions = useMemo(() => {
    const map = new Map();
    data.records.forEach((r) => map.set(r.course, r.title));
    return Array.from(map.entries()).map(([code, title]) => ({ code, title }));
  }, [data.records]);

  const monthOptions = useMemo(() => {
    const set = new Set(data.records.map((r) => r.date.slice(0, 7)));
    return Array.from(set).sort();
  }, [data.records]);

  const [courseFilter, setCourseFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const onSemesterChange = (sem) => {
    setSelectedSemester(sem);
    setCourseFilter("");
    setMonthFilter("");
  };

  const filteredRecords = useMemo(() => {
    return data.records.filter((r) => {
      const okCourse = courseFilter ? r.course === courseFilter : true;
      const okMonth = monthFilter ? r.date.slice(0, 7) === monthFilter : true;
      return okCourse && okMonth;
    });
  }, [data.records, courseFilter, monthFilter]);

  const summary = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "Present").length;
    const absent = filteredRecords.filter((r) => r.status === "Absent").length;
    const late = filteredRecords.filter((r) => r.status === "Late").length;
    const pct = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, pct };
  }, [filteredRecords]);

  const handleDownload = () => {
    const payload = {
      semester: data.semester,
      batch: data.batch,
      updatedAt: data.updatedAt,
      adminNote: data.adminNote,
      filters: { course: courseFilter || null, month: monthFilter || null },
      records: filteredRecords,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${data.semester}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusPill = (status) => {
    const base = "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold";
    if (status === "Present") return `${base} bg-green-100 text-green-700`;
    if (status === "Absent") return `${base} bg-red-100 text-red-700`;
    return `${base} bg-yellow-100 text-yellow-700`;
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* TOP BAR */}
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Attendance Sheet Review
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {data.semester} • Batch {data.batch} • Updated {data.updatedAt}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Semester:</span>
                <select
                  value={selectedSemester}
                  onChange={(e) => onSemesterChange(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownload}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <FiDownload />
                Download
              </button>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6">
          {/* SUMMARY + ADMIN NOTE (full-width so no empty gap) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
              <p className="text-sm text-gray-500 mt-1">
                Based on the current filters.
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat label="Sessions" value={summary.total} />
                <MiniStat label="Present" value={summary.present} />
                <MiniStat label="Absent" value={summary.absent} />
                <MiniStat label="Present %" value={`${summary.pct}%`} />
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Late: <span className="font-semibold text-gray-900">{summary.late}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 sm:p-6">
              <h3 className="text-base font-semibold text-gray-900">Admin Note</h3>
              <p className="text-sm text-gray-700 mt-2">{data.adminNote}</p>

              <div className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                <p className="text-xs font-semibold text-gray-500">Tip</p>
                <p className="text-sm text-gray-800 mt-1">
                  Use filters to compare attendance across months or courses.
                </p>
              </div>
            </div>
          </div>

          {/* FILTERS */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Narrow down your attendance by course or month.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto">
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Courses</option>
                  {courseOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>

                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Months</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {formatMonth(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Attendance Records</h2>
              <p className="text-sm text-gray-500 mt-1">
                Showing {filteredRecords.length} record(s).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-5 py-3 text-left">#</th>
                    <th className="px-5 py-3 text-left">Date</th>
                    <th className="px-5 py-3 text-left">Course</th>
                    <th className="px-5 py-3 text-left">Title</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((r, idx) => (
                    <tr key={`${r.date}-${r.course}-${idx}`} className="border-t hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{idx + 1}</td>
                      <td className="px-5 py-3">{formatDate(r.date)}</td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{r.course}</td>
                      <td className="px-5 py-3 text-gray-700">{r.title}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={statusPill(r.status)}>{r.status}</span>
                      </td>
                    </tr>
                  ))}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-gray-500">
                        No attendance records found for the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Present: <span className="font-bold text-gray-900">{summary.present}</span> • Absent:{" "}
                <span className="font-bold text-gray-900">{summary.absent}</span> • Late:{" "}
                <span className="font-bold text-gray-900">{summary.late}</span>
              </p>
              <p className="text-sm text-gray-600">
                Present Rate: <span className="font-semibold text-gray-900">{summary.pct}%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ small components + helpers ------------------ */

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
      <p className="text-xs text-gray-500 font-semibold">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatMonth(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}
