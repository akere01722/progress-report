import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiEye,
  FiRefreshCw,
  FiSend,
  FiTrash2,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  fetchAdminAttendanceEntries,
  fetchAdminAttendanceSessions,
  deleteAttendanceSessionAsAdmin,
  getCurrentWeekRange,
  getWeekRangeByDate,
  resolveAdminId,
  reviewAttendanceSession,
} from "../../lib/attendanceWorkflow";
import { sendAdminNotification } from "../../lib/notificationsWorkflow";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const STATUS_STYLES = {
  draft: "border-gray-200 bg-gray-50 text-gray-700",
  submitted: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

const MARK_STYLES = {
  present: "border-green-200 bg-green-50 text-green-700",
  absent: "border-red-200 bg-red-50 text-red-700",
  late: "border-yellow-200 bg-yellow-50 text-yellow-700",
  excused: "border-blue-200 bg-blue-50 text-blue-700",
};

export default function Attendance() {
  const userData = useMemo(() => readUserData(), []);
  const [{ weekStart: initialFilterDate }] = useState(() => {
    const range = getCurrentWeekRange();
    return { weekStart: range.weekStart };
  });

  const [filterDate, setFilterDate] = useState(initialFilterDate);
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [weekSessions, setWeekSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [resolvedAdminId, setResolvedAdminId] = useState("");

  const ensureAdminId = useCallback(async () => {
    if (resolvedAdminId) return resolvedAdminId;
    const id = await resolveAdminId({
      adminId: userData?.id || userData?.adminId || userData?.admin_id || "",
      email: userData?.email || userData?.adminEmail || userData?.admin_email || "",
      name: userData?.name || userData?.fullName || userData?.full_name || "",
    });
    setResolvedAdminId(id);

    try {
      const nextUserData = {
        ...(userData || {}),
        id,
        role: "admin",
      };
      localStorage.setItem("userData", JSON.stringify(nextUserData));
    } catch {
      // no-op: do not block attendance flow on localStorage write errors
    }

    return id;
  }, [resolvedAdminId, userData]);

  const loadSessions = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const adminId = await ensureAdminId();
        const range = filterDate ? getWeekRangeByDate(filterDate) : { weekStart: null, weekEnd: null };
        const rows = await fetchAdminAttendanceSessions({
          adminId,
          status: statusFilter,
          weekStart: range.weekStart || null,
          weekEnd: range.weekEnd || null,
        });
        const baseRows =
          statusFilter && statusFilter.trim()
            ? await fetchAdminAttendanceSessions({
                adminId,
                status: "",
                weekStart: range.weekStart || null,
                weekEnd: range.weekEnd || null,
              })
            : rows;
        setSessions(rows);
        setWeekSessions(baseRows);
      } catch (error) {
        toast.error(error?.message || "Failed to load attendance sessions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ensureAdminId, statusFilter, filterDate]
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const openSession = async (session) => {
    if (!session?.id) return;
    setSelectedSession(session);
    setAdminNote(session.adminNote || "");
    setEntriesLoading(true);
    try {
      const adminId = await ensureAdminId();
      const entries = await fetchAdminAttendanceEntries({
        adminId,
        sessionId: session.id,
      });
      setSelectedEntries(entries);
    } catch (error) {
      toast.error(error?.message || "Failed to load session entries.");
      setSelectedEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleReview = async (decision) => {
    if (!selectedSession?.id) return;
    setReviewing(true);
    try {
      const adminId = await ensureAdminId();
      await reviewAttendanceSession({
        adminId,
        sessionId: selectedSession.id,
        decision,
        adminNote,
      });
      toast.success(`Attendance ${decision}.`);
      await loadSessions({ silent: true });

      const updated = sessions.find((row) => row.id === selectedSession.id);
      if (updated) {
        setSelectedSession({ ...updated, status: decision, adminNote });
      } else {
        setSelectedSession((prev) => (prev ? { ...prev, status: decision, adminNote } : prev));
      }
    } catch (error) {
      toast.error(error?.message || "Failed to review attendance.");
    } finally {
      setReviewing(false);
    }
  };

  const handleDeleteSession = async (session) => {
    if (!session?.id) return;
    const confirmed = window.confirm(
      `Delete attendance session for ${session.className} | ${session.subject}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingSessionId(session.id);
    try {
      const adminId = await ensureAdminId();
      await deleteAttendanceSessionAsAdmin({
        adminId,
        sessionId: session.id,
      });
      toast.success("Attendance session deleted.");

      if (selectedSession?.id === session.id) {
        setSelectedSession(null);
        setSelectedEntries([]);
        setAdminNote("");
      }

      await loadSessions({ silent: true });
    } catch (error) {
      toast.error(error?.message || "Failed to delete attendance session.");
    } finally {
      setDeletingSessionId("");
    }
  };

  const handleSendWeekToStudents = async () => {
    try {
      const adminId = await ensureAdminId();
      const approvedSessions = weekSessions.filter((row) => row.status === "approved");
      if (approvedSessions.length === 0) {
        toast.error("No approved attendance sessions to send for this week.");
        return;
      }

      const totalStudents = approvedSessions.reduce((sum, row) => sum + row.totals.total, 0);
      const totalPresent = approvedSessions.reduce((sum, row) => sum + row.totals.present, 0);
      const totalAbsent = approvedSessions.reduce((sum, row) => sum + row.totals.absent, 0);
      const presentRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
      const range = filterDate ? getWeekRangeByDate(filterDate) : { weekStart: "", weekEnd: "" };

      const title = filterDate
        ? `Attendance Update (${range.weekStart} to ${range.weekEnd})`
        : "Attendance Update";
      const message = [
        `Attendance has been published.`,
        `Approved classes: ${approvedSessions.length}.`,
        `Marked students: ${totalStudents}.`,
        `Present: ${totalPresent}, Absent: ${totalAbsent}, Attendance rate: ${presentRate}%.`,
        `Open your Attendance page to view details.`,
      ].join(" ");

      setPublishing(true);
      const { error } = await sendAdminNotification({
        audience: "students",
        title,
        message,
        senderId: adminId,
      });
      if (error) throw error;
      toast.success("Weekly attendance sent to students.");
    } catch (error) {
      toast.error(error?.message || "Failed to send attendance update.");
    } finally {
      setPublishing(false);
    }
  };

  const summary = useMemo(() => {
    const totalSessions = weekSessions.length;
    const submittedSessions = weekSessions.filter((row) => row.status === "submitted").length;
    const approvedSessions = weekSessions.filter((row) => row.status === "approved").length;
    const rejectedSessions = weekSessions.filter((row) => row.status === "rejected").length;
    const totalStudents = weekSessions.reduce((sum, row) => sum + row.totals.total, 0);
    const totalPresent = weekSessions.reduce((sum, row) => sum + row.totals.present, 0);
    const overallRate = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    return {
      totalSessions,
      submittedSessions,
      approvedSessions,
      rejectedSessions,
      totalStudents,
      overallRate,
    };
  }, [weekSessions]);

  const emptyMessage = useMemo(() => {
    if (sessions.length > 0) return "";
    const range = filterDate ? getWeekRangeByDate(filterDate) : null;
    if (statusFilter) {
      return `No ${statusFilter} attendance sessions found for ${
        range ? `${range.weekStart} to ${range.weekEnd}` : "this range"
      }.`;
    }
    return "No attendance sessions found for this filter.";
  }, [sessions.length, statusFilter, filterDate]);

  const selectedSessionTotals = useMemo(() => {
    if (!selectedSession) {
      return {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
    }

    if (!selectedEntries.length) {
      return selectedSession.totals || {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
    }

    const total = selectedEntries.length;
    const present = selectedEntries.filter((row) => row.mark === "present").length;
    const absent = selectedEntries.filter((row) => row.mark === "absent").length;
    const late = selectedEntries.filter((row) => row.mark === "late").length;
    const excused = selectedEntries.filter((row) => row.mark === "excused").length;

    return { total, present, absent, late, excused };
  }, [selectedEntries, selectedSession]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        Loading attendance...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Attendance Review</h2>
            <p className="mt-1 text-sm text-blue-50">
              Receive teacher submissions, approve/reject, and send weekly attendance updates to students.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSessions({ silent: true })}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20 disabled:opacity-60"
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSendWeekToStudents}
              disabled={publishing}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
            >
              <FiSend />
              {publishing ? "Sending..." : "Send Week to Students"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-gray-900">Filter Sessions</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadSessions()}
            className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Total Sessions</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{summary.totalSessions}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-700">Submitted</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{summary.submittedSessions}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{summary.approvedSessions}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-red-800">{summary.rejectedSessions}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-700">Marked Students</p>
          <p className="mt-1 text-2xl font-bold text-blue-800">{summary.totalStudents}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs text-indigo-700">Overall Rate</p>
          <p className="mt-1 text-2xl font-bold text-indigo-800">{summary.overallRate}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-gray-900">Attendance Sessions</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Teacher</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3 text-center">Students</th>
                <th className="py-2 pr-3 text-center">Present %</th>
                <th className="py-2 pr-3 text-center">Status</th>
                <th className="py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">
                    {session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {session.teacherName || "Teacher"}{" "}
                    {session.teacherStaffId ? (
                      <span className="text-xs text-gray-500">({session.teacherStaffId})</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">{session.className}</td>
                  <td className="py-2 pr-3">{session.subject}</td>
                  <td className="py-2 pr-3 text-center">{session.totals.total}</td>
                  <td className="py-2 pr-3 text-center">{session.totals.rate}%</td>
                  <td className="py-2 pr-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[session.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void openSession(session)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <FiEye />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSession(session)}
                        disabled={deletingSessionId === session.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        <FiTrash2 />
                        {deletingSessionId === session.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sessions.length === 0 && <p className="mt-3 text-sm text-gray-600">{emptyMessage}</p>}
      </div>

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedSession(null)} />
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Session Details</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedSession.className} | {selectedSession.subject} |{" "}
                  {selectedSession.sessionDate
                    ? new Date(selectedSession.sessionDate).toLocaleDateString()
                    : "-"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p className="text-gray-500">Students</p>
                <p className="font-bold text-gray-900">{selectedSessionTotals.total}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
                <p className="text-green-700">Present</p>
                <p className="font-bold text-green-800">{selectedSessionTotals.present}</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
                <p className="text-red-700">Absent</p>
                <p className="font-bold text-red-800">{selectedSessionTotals.absent}</p>
              </div>
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
                <p className="text-yellow-700">Late</p>
                <p className="font-bold text-yellow-800">{selectedSessionTotals.late}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700">Admin Note</label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional note for teacher..."
              />
            </div>

            <div className="mt-4 overflow-x-auto border border-gray-100 rounded-xl">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="py-2 px-3">Matricule</th>
                    <th className="py-2 px-3">Student</th>
                    <th className="py-2 px-3">Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntries.map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="py-2 px-3 font-semibold text-gray-900">{entry.matricule}</td>
                      <td className="py-2 px-3">{entry.studentName}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            MARK_STYLES[entry.mark] || "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {entry.mark.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {entriesLoading && (
                <div className="px-4 py-3 text-sm text-gray-500">Loading entries...</div>
              )}
              {!entriesLoading && selectedEntries.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500">No entry records found.</div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteSession(selectedSession)}
                disabled={reviewing || deletingSessionId === selectedSession.id}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                <FiTrash2 />
                {deletingSessionId === selectedSession.id ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => void handleReview("rejected")}
                disabled={reviewing || selectedSession.status !== "submitted"}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                <FiXCircle />
                Reject
              </button>
              <button
                type="button"
                onClick={() => void handleReview("approved")}
                disabled={reviewing || selectedSession.status !== "submitted"}
                className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60"
              >
                <FiCheckCircle />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
