import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiLayers,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiSend,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  attendanceSaveDraft,
  attendanceSubmit,
  classMatchesStudent,
  fetchTeacherAttendanceContext,
  fetchTeacherAttendanceEntries,
  fetchTeacherAttendanceSessions,
  getAcademicYearByDate,
  getSemesterByDate,
} from "../../lib/attendanceWorkflow";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const toDateOnly = (value) => {
  const d = value ? new Date(value) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

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

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Present", Icon: FiCheckCircle },
  { value: "absent", label: "Absent", Icon: FiXCircle },
  { value: "late", label: "Late", Icon: FiCalendar },
  { value: "excused", label: "Excused", Icon: FiBookOpen },
];

export default function TeacherAttendance() {
  const userData = useMemo(() => readUserData(), []);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [context, setContext] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState("");

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [sessionDate, setSessionDate] = useState(() => toDateOnly(new Date()));
  const [teacherNote, setTeacherNote] = useState("");
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState({});

  const teacher = context?.teacher || null;
  const assignments = useMemo(() => context?.assignments || [], [context?.assignments]);
  const studentsCatalog = useMemo(() => context?.students || [], [context?.students]);

  const classOptions = useMemo(
    () => Array.from(new Set(assignments.map((item) => item.className))).sort((a, b) => a.localeCompare(b)),
    [assignments]
  );

  const subjectOptions = useMemo(
    () =>
      assignments
        .filter((item) => item.className === selectedClass)
        .map((item) => item.subject)
        .sort((a, b) => a.localeCompare(b)),
    [assignments, selectedClass]
  );

  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return studentsCatalog
      .filter((student) => classMatchesStudent(selectedClass, student))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [studentsCatalog, selectedClass]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      (student) =>
        student.name.toLowerCase().includes(q) || student.matricule.toLowerCase().includes(q)
    );
  }, [classStudents, search]);

  const canUseTable = Boolean(selectedClass && selectedSubject);

  const markedCount = useMemo(
    () => classStudents.filter((student) => attendance[student.matricule]).length,
    [classStudents, attendance]
  );
  const presentCount = useMemo(
    () => classStudents.filter((student) => attendance[student.matricule] === "present").length,
    [classStudents, attendance]
  );
  const absentCount = useMemo(
    () => classStudents.filter((student) => attendance[student.matricule] === "absent").length,
    [classStudents, attendance]
  );
  const lateCount = useMemo(
    () => classStudents.filter((student) => attendance[student.matricule] === "late").length,
    [classStudents, attendance]
  );

  const currentSession = useMemo(() => {
    if (!canUseTable) return null;
    return (
      sessions.find(
        (row) =>
          row.className === selectedClass &&
          row.subject === selectedSubject &&
          String(row.sessionDate || "").slice(0, 10) === sessionDate
      ) || null
    );
  }, [sessions, canUseTable, selectedClass, selectedSubject, sessionDate]);

  const loadSessions = useCallback(
    async (teacherId, isSilent = false) => {
      if (!teacherId) return;
      if (isSilent) setRefreshing(true);
      try {
        const rows = await fetchTeacherAttendanceSessions({ teacherId, limit: 120 });
        setSessions(rows);
      } finally {
        if (isSilent) setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!userData?.id && !userData?.staffId && !userData?.email) {
        toast.error("Teacher session not found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const nextContext = await fetchTeacherAttendanceContext({
          teacherUserId: userData?.id || "",
          staffId: userData?.staffId || "",
          email: userData?.email || "",
        });
        if (!mounted) return;
        setContext(nextContext);
        await loadSessions(nextContext.teacher.id);
      } catch (error) {
        if (!mounted) return;
        toast.error(error?.message || "Failed to load attendance setup.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [userData?.id, userData?.staffId, userData?.email, loadSessions]);

  useEffect(() => {
    if (!selectedClass) {
      setSelectedSubject("");
      setSearch("");
      setAttendance({});
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject && !subjectOptions.includes(selectedSubject)) {
      setSelectedSubject("");
      setAttendance({});
      setSearch("");
    }
  }, [selectedSubject, subjectOptions]);

  useEffect(() => {
    let mounted = true;

    const loadCurrentEntries = async () => {
      if (!teacher?.id || !currentSession?.id) {
        if (mounted) {
          setActiveSessionId("");
          setTeacherNote("");
          setAttendance({});
        }
        return;
      }

      try {
        const rows = await fetchTeacherAttendanceEntries({
          teacherId: teacher.id,
          sessionId: currentSession.id,
        });
        if (!mounted) return;
        const mapped = {};
        rows.forEach((row) => {
          if (row.matricule) mapped[row.matricule] = row.mark;
        });
        setActiveSessionId(currentSession.id);
        setTeacherNote(currentSession.teacherNote || "");
        setAttendance(mapped);
      } catch (error) {
        if (!mounted) return;
        setActiveSessionId(currentSession.id);
        setTeacherNote(currentSession.teacherNote || "");
        setAttendance({});
        toast.error(error?.message || "Failed to load session marks.");
      }
    };

    void loadCurrentEntries();
    return () => {
      mounted = false;
    };
  }, [teacher?.id, currentSession?.id, currentSession?.teacherNote]);

  const setStudentMark = (matricule, mark) => {
    setAttendance((prev) => ({ ...prev, [matricule]: mark }));
  };

  const clearMarks = () => {
    setAttendance({});
  };

  const buildEntriesPayload = (requireAll = false) => {
    if (!classStudents.length) return [];

    const rows = classStudents
      .map((student) => ({
        student_id: student.id || null,
        matricule: student.matricule,
        student_name: student.name,
        mark: attendance[student.matricule] || "",
      }))
      .filter((row) => (requireAll ? true : Boolean(row.mark)));

    if (requireAll) {
      const missing = rows.filter((row) => !row.mark).map((row) => row.matricule);
      if (missing.length > 0) {
        return { entries: [], missing };
      }
    }

    return { entries: rows, missing: [] };
  };

  const persistDraft = async ({ andSubmit = false } = {}) => {
    if (!teacher?.id) {
      toast.error("Teacher identity missing.");
      return;
    }

    if (!selectedClass || !selectedSubject) {
      toast.error("Select class and subject first.");
      return;
    }

    if (!classStudents.length) {
      toast.error("No students found for selected class.");
      return;
    }

    const { entries, missing } = buildEntriesPayload(andSubmit);
    if (andSubmit && missing.length > 0) {
      toast.error("Mark all students before submitting.");
      return;
    }

    if (!andSubmit && entries.length === 0) {
      toast.error("Mark at least one student to save a draft.");
      return;
    }

    if (andSubmit) setSubmitting(true);
    else setSavingDraft(true);

    try {
      const saved = await attendanceSaveDraft({
        teacherId: teacher.id,
        facultyId: teacher.facultyId || null,
        departmentId: teacher.departmentId || null,
        className: selectedClass,
        subject: selectedSubject,
        sessionDate,
        academicYear: getAcademicYearByDate(sessionDate),
        semester: getSemesterByDate(sessionDate),
        teacherNote,
        entries,
      });

      setActiveSessionId(saved.sessionId || "");

      if (andSubmit) {
        await attendanceSubmit({
          teacherId: teacher.id,
          sessionId: saved.sessionId,
        });
        toast.success("Attendance submitted to admin.");
      } else {
        toast.success("Attendance draft saved.");
      }

      await loadSessions(teacher.id, true);
    } catch (error) {
      toast.error(error?.message || "Attendance action failed.");
    } finally {
      setSavingDraft(false);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        Loading attendance page...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">
            Mark attendance, save draft, then submit for admin review.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
            Marked: <span className="ml-1 text-gray-900">{markedCount}</span>/
            <span className="ml-1 text-gray-900">{classStudents.length}</span>
          </span>
          <span className="inline-flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
            Present: <span className="ml-1">{presentCount}</span>
          </span>
          <span className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            Absent: <span className="ml-1">{absentCount}</span>
          </span>
          <span className="inline-flex items-center rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700">
            Late: <span className="ml-1">{lateCount}</span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiLayers className="text-blue-600" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
            >
              <option value="">Select Class</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiBookOpen className="text-blue-600" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedClass}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              <option value="">Select Subject</option>
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
            />
          </div>

          <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiSearch className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!canUseTable}
              placeholder="Search student..."
              className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400 disabled:opacity-60"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (teacher?.id) {
                void loadSessions(teacher.id, true).catch((error) =>
                  toast.error(error?.message || "Failed to refresh attendance.")
                );
              }
            }}
            className="lg:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
            disabled={refreshing || !teacher?.id}
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <input
            value={teacherNote}
            onChange={(e) => setTeacherNote(e.target.value)}
            placeholder="Optional note to admin..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {currentSession && (
            <div className="flex items-center justify-start lg:justify-end">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                  STATUS_STYLES[currentSession.status] || STATUS_STYLES.draft
                }`}
              >
                Current status: {currentSession.status}
              </span>
            </div>
          )}
        </div>
      </div>

      {canUseTable && (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Matricule</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Student Name</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">Mark</th>
                  <th className="px-5 py-3 text-center font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const mark = attendance[student.matricule] || "";
                  return (
                    <tr key={student.matricule} className="border-t hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-semibold text-gray-900">{student.matricule}</td>
                      <td className="px-5 py-3 text-gray-700">{student.name}</td>
                      <td className="px-5 py-3 text-center">
                        {mark ? (
                          <span
                            className={`inline-flex rounded-xl border px-3 py-1 text-xs font-extrabold ${
                              MARK_STYLES[mark] || "border-gray-200 bg-gray-50 text-gray-700"
                            }`}
                          >
                            {mark.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not marked</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          {ATTENDANCE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setStudentMark(student.matricule, option.value)}
                              className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                mark === option.value
                                  ? "bg-blue-600 text-white shadow-sm"
                                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <option.Icon />
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No students match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-5 py-4 sm:px-6 flex flex-wrap justify-between gap-3">
            <button
              type="button"
              onClick={clearMarks}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FiRefreshCw />
              Clear Marks
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void persistDraft({ andSubmit: false })}
                disabled={savingDraft || submitting}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                <FiSave />
                {savingDraft ? "Saving..." : "Save Draft"}
              </button>
              <button
                type="button"
                onClick={() => void persistDraft({ andSubmit: true })}
                disabled={savingDraft || submitting}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <FiSend />
                {submitting ? "Submitting..." : "Submit to Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <h3 className="text-base font-semibold text-gray-900">Recent Attendance Sessions</h3>
          <p className="text-sm text-gray-500 mt-1">Draft, submitted, and reviewed sessions.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Class</th>
                <th className="px-5 py-3 text-left font-semibold text-gray-600">Subject</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-600">Students</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-600">Present %</th>
                <th className="px-5 py-3 text-center font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t cursor-pointer hover:bg-gray-50 ${
                    activeSessionId === row.id ? "bg-blue-50/40" : ""
                  }`}
                  onClick={() => {
                    setSelectedClass(row.className);
                    setSelectedSubject(row.subject);
                    setSessionDate(String(row.sessionDate || "").slice(0, 10));
                  }}
                >
                  <td className="px-5 py-3">{row.sessionDate ? new Date(row.sessionDate).toLocaleDateString() : "-"}</td>
                  <td className="px-5 py-3">{row.className}</td>
                  <td className="px-5 py-3">{row.subject}</td>
                  <td className="px-5 py-3 text-center">{row.totals.total}</td>
                  <td className="px-5 py-3 text-center">{row.totals.rate}%</td>
                  <td className="px-5 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[row.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}

              {sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No attendance sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
