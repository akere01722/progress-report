import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCalendar, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import { fetchStudentWeeklyAttendance, getCurrentWeekRange } from "../../lib/attendanceWorkflow";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const MARK_STYLES = {
  present: "border-green-200 bg-green-50 text-green-700",
  absent: "border-red-200 bg-red-50 text-red-700",
  late: "border-yellow-200 bg-yellow-50 text-yellow-700",
  excused: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function Attendance() {
  const userData = useMemo(() => readUserData(), []);
  const [{ weekStart: defaultWeekStart, weekEnd: defaultWeekEnd }] = useState(() => {
    const range = getCurrentWeekRange();
    return { weekStart: range.weekStart, weekEnd: range.weekEnd };
  });

  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [weekEnd, setWeekEnd] = useState(defaultWeekEnd);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);

  const loadAttendance = useCallback(
    async ({ silent = false } = {}) => {
      const matricule = String(userData?.matricule || "").trim();
      if (!matricule) {
        setRows([]);
        setLoading(false);
        return;
      }

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await fetchStudentWeeklyAttendance({
          matricule,
          weekStart: weekStart || null,
          weekEnd: weekEnd || null,
        });
        setRows(data);
      } catch (error) {
        toast.error(error?.message || "Failed to load attendance.");
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userData?.matricule, weekStart, weekEnd]
  );

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  const summary = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((row) => row.mark === "present").length;
    const absent = rows.filter((row) => row.mark === "absent").length;
    const late = rows.filter((row) => row.mark === "late").length;
    const excused = rows.filter((row) => row.mark === "excused").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, excused, rate };
  }, [rows]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        Loading attendance...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h1 className="text-xl font-bold text-gray-900">Weekly Attendance</h1>
        <p className="text-sm text-gray-600 mt-1">
          Attendance approved by admin and published for your week.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <input
              type="date"
              value={weekEnd}
              onChange={(e) => setWeekEnd(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadAttendance()}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            Apply Week
          </button>
          <button
            type="button"
            onClick={() => void loadAttendance({ silent: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-700">Total Classes</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">{summary.total}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700">Present</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{summary.present}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-700">Absent</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{summary.absent}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs text-yellow-700">Late</p>
          <p className="mt-1 text-2xl font-bold text-yellow-900">{summary.late}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs text-indigo-700">Attendance Rate</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{summary.rate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900">Attendance Records</h3>
        <table className="min-w-full mt-4 text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Class</th>
              <th className="py-2 pr-3">Subject</th>
              <th className="py-2 pr-3">Teacher</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.sessionId}-${index}`} className="border-b last:border-b-0">
                <td className="py-2 pr-3">
                  {row.sessionDate ? new Date(row.sessionDate).toLocaleDateString() : "-"}
                </td>
                <td className="py-2 pr-3">{row.className}</td>
                <td className="py-2 pr-3">{row.subject}</td>
                <td className="py-2 pr-3">{row.teacherName || "-"}</td>
                <td className="py-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      MARK_STYLES[row.mark] || "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    {String(row.mark || "").toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="mt-3 text-sm text-gray-600">
            No approved attendance records found for this week.
          </p>
        )}
      </div>
    </div>
  );
}
