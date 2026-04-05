import { useEffect, useMemo, useState } from "react";
import {
  FiAward,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiTrash2,
} from "react-icons/fi";
import {
  fetchPublishedPeriodsForFaculty,
  fetchStudentPublishedResults,
} from "../../lib/resultsBackendWorkflow";
import { fetchStudentWeeklyAttendance, getCurrentWeekRange } from "../../lib/attendanceWorkflow";
import {
  deleteNotificationForRole,
  fetchNotificationsForRole,
  getAudienceLabel,
} from "../../lib/notificationsWorkflow";
import { toast } from "react-toastify";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function Dashboard() {
  const userData = useMemo(() => readUserData(), []);
  const [notifications, setNotifications] = useState([]);
  const [deletingId, setDeletingId] = useState("");
  const faculty = userData?.faculty || "";
  const facultyId = userData?.facultyId || userData?.faculty_id || "";
  const matricule = userData?.matricule || "";
  const studentId = userData?.id || "";
  const name = userData?.name || "Student";
  const [weeklyAttendance, setWeeklyAttendance] = useState({
    total: 0,
    present: 0,
    rate: 0,
  });
  const [publishedPeriods, setPublishedPeriods] = useState([]);
  const [resultRows, setResultRows] = useState([]);
  const [loadingResults, setLoadingResults] = useState(true);

  const latestPeriod = publishedPeriods[0] || null;
  const currentWeek = useMemo(() => getCurrentWeekRange(), []);

  useEffect(() => {
    let mounted = true;

    const loadResults = async () => {
      setLoadingResults(true);
      try {
        const periods = await fetchPublishedPeriodsForFaculty({ faculty, facultyId });
        if (!mounted) return;

        const safePeriods = Array.isArray(periods) ? periods : [];
        setPublishedPeriods(safePeriods);

        const latest = safePeriods[0];
        if (!latest || !matricule) {
          setResultRows([]);
          return;
        }

        const resultPack = await fetchStudentPublishedResults({
          faculty,
          facultyId,
          matricule,
          studentId,
          academicYear: latest.academicYear,
          semester: latest.semester,
        });

        if (!mounted) return;
        setResultRows(Array.isArray(resultPack?.rows) ? resultPack.rows : []);
      } catch {
        if (mounted) {
          setPublishedPeriods([]);
          setResultRows([]);
        }
      } finally {
        if (mounted) setLoadingResults(false);
      }
    };

    void loadResults();

    return () => {
      mounted = false;
    };
  }, [faculty, facultyId, matricule, studentId]);

  const rows = resultRows;
  const averageScore = rows.length
    ? Math.round(rows.reduce((acc, row) => acc + (row.total || 0), 0) / rows.length)
    : 0;
  const passedCourses = rows.filter((row) => (row.total || 0) >= 50).length;

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (!userData?.id) {
        if (mounted) setNotifications([]);
        return;
      }

      try {
        const list = await fetchNotificationsForRole("student", userData.id, { limit: 5 });
        if (mounted) setNotifications(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setNotifications([]);
      }
    };

    const refresh = () => {
      void loadNotifications();
    };

    window.addEventListener("focus", refresh);
    void loadNotifications();

    return () => {
      mounted = false;
      window.removeEventListener("focus", refresh);
    };
  }, [userData?.id]);

  useEffect(() => {
    let mounted = true;

    const loadWeeklyAttendance = async () => {
      if (!matricule) {
        if (mounted) setWeeklyAttendance({ total: 0, present: 0, rate: 0 });
        return;
      }

      try {
        const records = await fetchStudentWeeklyAttendance({
          matricule,
          weekStart: currentWeek.weekStart,
          weekEnd: currentWeek.weekEnd,
        });

        if (!mounted) return;

        const total = records.length;
        const present = records.filter((row) => row.mark === "present").length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        setWeeklyAttendance({ total, present, rate });
      } catch {
        if (mounted) setWeeklyAttendance({ total: 0, present: 0, rate: 0 });
      }
    };

    void loadWeeklyAttendance();
    return () => {
      mounted = false;
    };
  }, [matricule, currentWeek.weekEnd, currentWeek.weekStart]);

  const handleDeleteNotification = async (item) => {
    if (!item?.id || !userData?.id) return;

    try {
      setDeletingId(item.id);
      await deleteNotificationForRole({
        recipientRowId: item.id,
        role: "student",
        userId: userData.id,
      });
      setNotifications((prev) => prev.filter((row) => row.id !== item.id));
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error?.message || "Failed to delete message.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg sm:p-7">
        <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {name}</h1>
        <p className="mt-1 text-sm text-blue-50 sm:text-base">
          Track your published results and academic progress by semester.
        </p>
        <div className="mt-3 inline-flex rounded-xl border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold">
          Faculty: {faculty || "N/A"} | Matricule: {matricule || "N/A"}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Published Courses</p>
            <FiBookOpen className="text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loadingResults ? "-" : rows.length}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Average Score</p>
            <FiAward className="text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loadingResults ? "-" : `${averageScore}%`}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Passed Courses</p>
            <FiCheckCircle className="text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {loadingResults ? "-" : passedCourses}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Latest Semester</p>
            <FiClock className="text-blue-600" />
          </div>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {loadingResults
              ? "Loading..."
              : latestPeriod
              ? `${latestPeriod.academicYear} ${latestPeriod.semester}`
              : "Not published"}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">This Week Attendance</p>
            <FiCalendar className="text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-bold text-gray-900">{weeklyAttendance.rate}%</p>
          <p className="mt-1 text-xs text-gray-500">
            {weeklyAttendance.present}/{weeklyAttendance.total} present ({currentWeek.weekStart} -{" "}
            {currentWeek.weekEnd})
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <FiBell />
            {notifications.length} latest
          </span>
        </div>
        <div className="mt-3 grid gap-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-blue-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {getAudienceLabel(item.audience)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNotification(item)}
                  disabled={deletingId === item.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-60"
                  title="Delete message"
                >
                  <FiTrash2 />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-700">{item.message}</p>
              <p className="mt-2 text-xs text-gray-500">
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
              </p>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              No notifications from admin yet.
            </div>
          )}

          <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-blue-900">
            {latestPeriod
              ? `Latest published period: ${latestPeriod.academicYear} ${latestPeriod.semester}`
              : "No faculty result has been published yet."}
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-blue-900">
            Check CA and Exams tabs for detailed course breakdown.
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-blue-900">
            Download your official results in PDF from the Results Summary page.
          </div>
        </div>
      </div>
    </div>
  );
}
