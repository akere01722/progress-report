import { useMemo, useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiCalendar,
  FiEdit2,
  FiCheck,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";

const STATUS_COLORS = {
  Present: "#22c55e",
  Absent: "#ef4444",
  Partial: "#f59e0b",
};

function formatMonthKey(monthKey) {
  const [y, m] = monthKey.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
}

function badgeClass(status) {
  if (status === "Present") return "bg-green-50 text-green-700 border-green-200";
  if (status === "Absent") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function StudentAttendancePage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [monthIndex, setMonthIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch data from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const { data: studentsData } = await supabase.from("students").select("*").order("name");
        const { data: attendanceData } = await supabase.from("attendance").select("*").order("date", { ascending: false });
        
        const attendanceMap = {};
        attendanceData?.forEach((record) => {
          const sid = record.student_id;
          if (!attendanceMap[sid]) attendanceMap[sid] = {};
          const monthKey = record.date?.substring(0, 7) || "2026-01";
          if (!attendanceMap[sid][monthKey]) attendanceMap[sid][monthKey] = [];
          attendanceMap[sid][monthKey].push({
            date: record.date,
            course: record.subject_id || "General",
            status: record.status,
          });
        });
        
        const mapped = studentsData?.map(s => ({
          id: s.id,
          matricule: s.student_id,
          name: s.name,
          attendance: attendanceMap[s.id] || {},
        })) || [];
        
        setStudents(mapped);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.matricule === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.matricule.toLowerCase().includes(q)
    );
  }, [query, students]);

  const months = useMemo(() => {
    if (!selectedStudent) return [];
    return Object.keys(selectedStudent.attendance || {}).sort();
  }, [selectedStudent]);

  const currentMonth = months[monthIndex] || "";
  const records = useMemo(() => {
    if (!selectedStudent || !currentMonth) return [];
    return selectedStudent.attendance[currentMonth] || [];
  }, [selectedStudent, currentMonth]);

  const summary = useMemo(() => {
    const counts = { Present: 0, Absent: 0, Partial: 0 };
    for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1;
    const total = records.length || 0;
    const presentPct = total ? Math.round((counts.Present / total) * 100) : 0;
    return { ...counts, total, presentPct };
  }, [records]);

  const pieData = useMemo(
    () => [
      { name: "Present", value: summary.Present },
      { name: "Absent", value: summary.Absent },
      { name: "Partial", value: summary.Partial },
    ],
    [summary]
  );

  const handleSelectStudent = (matricule) => {
    setSelectedStudentId(matricule);
    setMonthIndex(0);
  };

  const reset = () => {
    setSelectedStudentId(null);
    setMonthIndex(0);
    setQuery("");
  };

  const handleSubmitAttendance = () => {
    alert("Attendance submitted successfully!");
  };

  const handleEditAttendance = () => {
    setIsEditing(!isEditing);
    alert(isEditing ? "Exited edit mode" : "Entered edit mode - you can now modify attendance records");
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-500">Loading attendance data...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Student Attendance
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Search a student, view monthly records, and track attendance summary.
          </p>
        </div>

        {selectedStudent && (
          <div className="flex gap-2">
            <button 
              onClick={handleSubmitAttendance}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition"
            >
              <FiCheck />
              Submit Attendance
            </button>
            <button 
              onClick={handleEditAttendance}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              <FiEdit2 />
              {isEditing ? 'Cancel Edit' : 'Edit Attendance'}
            </button>
          </div>
        )}
      </div>

      {/* SEARCH PANEL */}
      {!selectedStudent && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">
                Search by name or matricule
              </label>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-600/10">
                <FiSearch className="text-gray-500" />
                <input
                  type="text"
                  placeholder="e.g. John Akere or ENG-001"
                  className="w-full outline-none text-sm"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Tip: start typing to filter the list below.
              </p>
            </div>

            <div className="lg:w-[360px] rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FiUser /> Students
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Click a student to view attendance.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {matches.map((s) => (
              <button
                key={s.matricule}
                onClick={() => handleSelectStudent(s.matricule)}
                className="text-left rounded-2xl border border-gray-100 bg-white p-4 hover:bg-gray-50 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {s.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Matricule:{" "}
                      <span className="font-medium text-gray-700">
                        {s.matricule}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700">
                    {Object.keys(s.attendance || {}).length} month(s)
                  </span>
                </div>
              </button>
            ))}

            {matches.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                No students match your search.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAILS VIEW */}
      {selectedStudent && (
        <div className="space-y-6">
          {/* STUDENT CARD */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  {selectedStudent.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {selectedStudent.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Matricule:{" "}
                    <span className="font-semibold text-gray-700">
                      {selectedStudent.matricule}
                    </span>
                  </p>
                </div>
              </div>

              {/* MONTH CONTROLS */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <FiCalendar className="text-gray-500" />
                  <select
                    className="outline-none text-sm bg-transparent"
                    value={currentMonth}
                    onChange={(e) => {
                      const idx = months.indexOf(e.target.value);
                      setMonthIndex(idx >= 0 ? idx : 0);
                    }}
                  >
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthKey(m)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={monthIndex === 0}
                    onClick={() => setMonthIndex((v) => Math.max(0, v - 1))}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft /> Prev
                  </button>
                  <button
                    disabled={monthIndex === months.length - 1}
                    onClick={() =>
                      setMonthIndex((v) => Math.min(months.length - 1, v + 1))
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <FiChevronRight />
                  </button>
                </div>

                <button
                  onClick={reset}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Search another
                </button>
              </div>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
              <p className="text-xs text-gray-500">Total Records</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {summary.total}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Month:{" "}
                <span className="font-medium text-gray-700">
                  {formatMonthKey(currentMonth)}
                </span>
              </p>
            </div>

            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
              <p className="text-xs text-gray-500">Present</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {summary.Present}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {summary.presentPct}% present rate
              </p>
            </div>

            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
              <p className="text-xs text-gray-500">Absent</p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                {summary.Absent}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Needs follow-up if high
              </p>
            </div>

            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
              <p className="text-xs text-gray-500">Partial</p>
              <p className="mt-2 text-2xl font-bold text-amber-600">
                {summary.Partial}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Late / early exit / half class
              </p>
            </div>
          </div>

          {/* TABLE + CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* RECORDS */}
            <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Attendance Records
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatMonthKey(currentMonth)} — {records.length} entry(ies)
                  </p>
                </div>
                <span className="text-xs rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-gray-700">
                  {selectedStudent.matricule}
                </span>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Course</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="p-3 text-sm text-gray-900">{r.course}</td>
                        <td className="p-3 text-sm text-gray-700">{r.date}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(
                              r.status
                            )}`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {records.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No records found for this month.
                  </div>
                )}
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-4 space-y-3">
                {records.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4"
                  >
                    <p className="font-semibold text-gray-900">{r.course}</p>
                    <p className="text-xs text-gray-500 mt-1">Date: {r.date}</p>
                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(
                          r.status
                        )}`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}

                {records.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No records found for this month.
                  </div>
                )}
              </div>
            </div>

            {/* PIE CHART */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="p-5 border-b">
                <h3 className="text-lg font-semibold text-gray-900 text-center">
                  Attendance Breakdown
                </h3>
                <p className="text-sm text-gray-500 text-center mt-1">
                  {formatMonthKey(currentMonth)}
                </p>
              </div>

              <div className="p-5">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        outerRadius={90}
                        innerRadius={55}
                        paddingAngle={3}
                        label={(entry) =>
                          entry.value > 0 ? `${entry.name}` : ""
                        }
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="mt-4 space-y-2">
                  {pieData.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: STATUS_COLORS[p.name] }}
                        />
                        <span className="text-sm font-medium text-gray-800">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {p.value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
                  <p className="text-xs text-gray-500">Present rate</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">
                    {summary.presentPct}%
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${summary.presentPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOT NOTE */}
          <p className="text-xs text-gray-500">
            Data loaded from Supabase database.
          </p>
        </div>
      )}
    </div>
  );
}
