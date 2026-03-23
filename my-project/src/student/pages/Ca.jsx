import { useMemo, useState, useEffect } from "react";
import { FiDownload } from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";

/**
 * StudentCAReport.jsx
 * ✅ Semester dropdown (Sem 1 / Sem 2)
 * ✅ Clean + classic (responsive)
 * ✅ Removed: Print, Hide details, Teacher/Admin signatures
 */

export default function StudentCAReport() {
  const [reportsBySemester, setReportsBySemester] = useState({});
  const [studentInfo, setStudentInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCAData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch student info
        const { data: studentData } = await supabase
          .from("students")
          .select("name, matricule, faculty, department, program, level")
          .eq("id", user.id)
          .single();

        if (studentData) {
          setStudentInfo(studentData);

          // Fetch CA reports
          const { data: caData, error } = await supabase
            .from("ca_reports")
            .select("course_code, course_title, score, max_score, semester, status, remark, admin_note, reviewed_at")
            .eq("student_id", user.id);

          if (caData && !error) {
            // Group by semester
            const grouped = caData.reduce((acc, record) => {
              const semester = record.semester || "FIRST SEMESTER";
              if (!acc[semester]) {
                acc[semester] = {
                  status: record.status || "SUBMITTED",
                  batch: "2025/2026",
                  semester,
                  student: studentData,
                  summary: { remark: record.remark || "Report generated." },
                  courses: [],
                  admin: {
                    reviewedBy: record.reviewed_at ? "Admin Office" : "Pending Review",
                    reviewedAt: record.reviewed_at || "—",
                    note: record.admin_note || "Awaiting admin approval.",
                  },
                };
              }
              acc[semester].courses.push({
                code: record.course_code,
                title: record.course_title,
                ca: record.score,
                max: record.max_score,
              });
              return acc;
            }, {});
            setReportsBySemester(grouped);
          }
        }
      }
      setLoading(false);
    };
    fetchCAData();
  }, []);

  const semesters = Object.keys(reportsBySemester);
  const [selectedSemester, setSelectedSemester] = useState(semesters[0] || "FIRST SEMESTER");
  const report = reportsBySemester[selectedSemester] || {
    status: "SUBMITTED",
    batch: "2025/2026",
    semester: selectedSemester,
    student: studentInfo,
    summary: { remark: "No data available." },
    courses: [],
    admin: {
      reviewedBy: "Pending Review",
      reviewedAt: "—",
      note: "Awaiting admin approval.",
    },
  };

  // --------------------------
  // CALCS
  // --------------------------
  const total = useMemo(
    () => report.courses.reduce((sum, c) => sum + (Number(c.ca) || 0), 0),
    [report.courses]
  );

  const maxTotal = useMemo(
    () => report.courses.reduce((sum, c) => sum + (Number(c.max) || 0), 0),
    [report.courses]
  );

  const avg = useMemo(() => {
    if (!report.courses.length) return 0;
    return Math.round((total / report.courses.length) * 10) / 10;
  }, [total, report.courses.length]);

  const statusBadge = useMemo(() => {
    const base =
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold";
    if (report.status === "APPROVED")
      return `${base} bg-green-100 text-green-700`;
    if (report.status === "SUBMITTED")
      return `${base} bg-yellow-100 text-yellow-700`;
    return `${base} bg-gray-100 text-gray-700`;
  }, [report.status]);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CA_Report_${report.student.matricule}_${report.semester}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-4">Loading CA Report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* TOP BAR */}
        <div className="p-5 sm:p-6 border-b border-gray-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Continuous Assessment (CA) Report
                </h1>
                <span className={statusBadge}>{report.status}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {report.semester} • Batch {report.batch}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* SEMESTER DROPDOWN */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  Semester:
                </span>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* DOWNLOAD */}
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
          {/* STUDENT + SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* STUDENT INFO */}
            <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Student Information
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Details used for this report.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                <Info label="Name" value={report.student.name} />
                <Info label="Matricule" value={report.student.matricule} />
                <Info label="Program" value={report.student.program} />
                <Info label="Faculty" value={report.student.faculty} />
                <Info label="Department" value={report.student.department} />
                <Info label="Level" value={report.student.level} />
              </div>
            </div>

            {/* SUMMARY */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">Summary</h3>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniStat label="Courses" value={report.courses.length} />
                <MiniStat label="Total" value={`${total}/${maxTotal}`} />
                <MiniStat label="Avg" value={`${avg}/30`} />
              </div>

              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold text-gray-500">Remark</p>
                <p className="text-sm text-gray-800 mt-1">{report.summary.remark}</p>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Admin Note:{" "}
                <span className="font-medium text-gray-800">{report.admin.note}</span>
              </div>
            </div>
          </div>

          {/* COURSES TABLE */}
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                CA Scores by Course
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Each CA score is recorded out of 30.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-5 py-3 text-left">#</th>
                    <th className="px-5 py-3 text-left">Course</th>
                    <th className="px-5 py-3 text-left">Title</th>
                    <th className="px-5 py-3 text-center">CA</th>
                    <th className="px-5 py-3 text-center">Remark</th>
                  </tr>
                </thead>

                <tbody>
                  {report.courses.map((c, idx) => {
                    const score = Number(c.ca) || 0;
                    const ok = score >= 15;
                    return (
                      <tr key={c.code} className="border-t hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium">{idx + 1}</td>
                        <td className="px-5 py-3 font-semibold text-gray-900">
                          {c.code}
                        </td>
                        <td className="px-5 py-3 text-gray-700">{c.title}</td>
                        <td className="px-5 py-3 text-center font-bold">
                          {score}/{c.max}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              ok
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {ok ? "Good" : "Needs Work"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Total CA:{" "}
                <span className="font-bold text-gray-900">
                  {total}/{maxTotal}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Semester:{" "}
                <span className="font-semibold text-gray-900">{report.semester}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------ SMALL COMPONENTS ------------------ */

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-1 break-words">
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-center">
      <p className="text-xs text-gray-500 font-semibold">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
