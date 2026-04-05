import { normalizeId } from "./registrationData";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const ensureBackend = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
};

const isRpcMissing = (error, rpcName) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "PGRST202" ||
    (message.includes(String(rpcName || "").toLowerCase()) && message.includes("function"))
  );
};

const isRlsViolation = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42501" || message.includes("row-level security policy");
};

const toFriendlyAttendanceError = (error, tableHint = "attendance tables") => {
  if (isRlsViolation(error)) {
    return new Error(
      `Row-level security is blocking ${tableHint}. Run supabase/attendance_no_auth_policies.sql in Supabase SQL Editor, then refresh the app.`
    );
  }
  return error;
};

const normalizeSessionStatus = (value) => {
  const status = String(value || "").trim().toLowerCase();
  if (status === "submitted" || status === "approved" || status === "rejected") return status;
  return "draft";
};

const toDateOnly = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const mapSession = (row) => {
  const total = Number(row?.total_students || 0);
  const present = Number(row?.present_count || 0);
  const absent = Number(row?.absent_count || 0);
  const late = Number(row?.late_count || 0);
  const excused = Number(row?.excused_count || 0);
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;

  return {
    id: String(row?.id || ""),
    teacherId: row?.teacher_id ? String(row.teacher_id) : "",
    teacherName: String(row?.teacher_name || row?.full_name || "").trim(),
    teacherStaffId: String(row?.teacher_staff_id || row?.staff_id || "").trim(),
    facultyId: row?.faculty_id != null ? String(row.faculty_id) : "",
    departmentId: row?.department_id != null ? String(row.department_id) : "",
    className: String(row?.class_name || "").trim(),
    subject: String(row?.subject || "").trim(),
    sessionDate: row?.session_date || null,
    academicYear: String(row?.academic_year || "").trim(),
    semester: String(row?.semester || "").trim(),
    status: normalizeSessionStatus(row?.status),
    teacherNote: String(row?.teacher_note || "").trim(),
    adminNote: String(row?.admin_note || "").trim(),
    submittedAt: row?.submitted_at || null,
    reviewedAt: row?.reviewed_at || null,
    reviewedBy: String(row?.reviewed_by || "").trim(),
    totals: {
      total,
      present,
      absent,
      late,
      excused,
      rate,
    },
  };
};

const mapEntry = (row) => ({
  id: String(row?.id || ""),
  sessionId: String(row?.session_id || ""),
  studentId: row?.student_id != null ? String(row.student_id) : "",
  matricule: String(row?.matricule || "").trim(),
  studentName: String(row?.student_name || "").trim(),
  mark: String(row?.mark || "").trim().toLowerCase(),
});

const ATTENDANCE_MARKS = new Set(["present", "absent", "late", "excused"]);
const EDITABLE_SESSION_STATUS = new Set(["draft", "rejected"]);

const normalizeMark = (value) => {
  const mark = String(value || "")
    .trim()
    .toLowerCase();
  return ATTENDANCE_MARKS.has(mark) ? mark : "";
};

const normalizeText = (value) => String(value || "").trim();

const parseNumericId = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
};

const aggregateSessionCounts = (entriesRows = []) => {
  const map = new Map();

  for (const row of entriesRows) {
    const sessionId = String(row?.session_id || "");
    if (!sessionId) continue;
    if (!map.has(sessionId)) {
      map.set(sessionId, {
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      });
    }
    const target = map.get(sessionId);
    target.total += 1;
    const mark = normalizeMark(row?.mark);
    if (mark === "present") target.present += 1;
    if (mark === "absent") target.absent += 1;
    if (mark === "late") target.late += 1;
    if (mark === "excused") target.excused += 1;
  }

  return map;
};

const saveDraftFallback = async ({
  teacherId,
  facultyId,
  departmentId,
  className,
  subject,
  sessionDate,
  academicYear,
  semester,
  teacherNote = "",
  entries = [],
}) => {
  const normalizedTeacherId = normalizeText(teacherId);
  const normalizedClassName = normalizeText(className);
  const normalizedSubject = normalizeText(subject);
  const normalizedSessionDate = toDateOnly(sessionDate);
  const normalizedAcademicYear = normalizeText(academicYear);
  const normalizedSemester = normalizeText(semester);

  if (!normalizedTeacherId) throw new Error("Teacher id is required.");
  if (!normalizedClassName || !normalizedSubject) throw new Error("Class and subject are required.");
  if (!normalizedAcademicYear || !normalizedSemester) {
    throw new Error("Academic year and semester are required.");
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("attendance_sessions")
    .select("id,status")
    .eq("teacher_id", normalizedTeacherId)
    .eq("class_name", normalizedClassName)
    .eq("subject", normalizedSubject)
    .eq("session_date", normalizedSessionDate)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) throw toFriendlyAttendanceError(existingError, "attendance_sessions");

  const existing = Array.isArray(existingRows) ? existingRows[0] : null;
  const existingStatus = normalizeSessionStatus(existing?.status);
  if (existing?.id && !EDITABLE_SESSION_STATUS.has(existingStatus)) {
    throw new Error("This attendance session is already submitted or approved.");
  }

  const payload = {
    teacher_id: normalizedTeacherId,
    class_name: normalizedClassName,
    subject: normalizedSubject,
    session_date: normalizedSessionDate,
    academic_year: normalizedAcademicYear,
    semester: normalizedSemester,
    status: "draft",
    teacher_note: String(teacherNote || ""),
    submitted_at: null,
  };

  const parsedFacultyId = parseNumericId(facultyId);
  const parsedDepartmentId = parseNumericId(departmentId);
  if (parsedFacultyId != null) payload.faculty_id = parsedFacultyId;
  else payload.faculty_id = null;
  if (parsedDepartmentId != null) payload.department_id = parsedDepartmentId;
  else payload.department_id = null;

  let sessionId = "";
  if (existing?.id) {
    const { data: updatedRows, error: updateError } = await supabase
      .from("attendance_sessions")
      .update(payload)
      .eq("id", existing.id)
      .select("id");

    if (updateError) throw toFriendlyAttendanceError(updateError, "attendance_sessions");
    sessionId = String(updatedRows?.[0]?.id || existing.id || "");
  } else {
    const { data: insertedRows, error: insertError } = await supabase
      .from("attendance_sessions")
      .insert(payload)
      .select("id")
      .limit(1);

    if (insertError) throw toFriendlyAttendanceError(insertError, "attendance_sessions");
    sessionId = String(insertedRows?.[0]?.id || "");
  }

  if (!sessionId) throw new Error("Unable to create attendance session.");

  const { error: clearEntriesError } = await supabase
    .from("attendance_entries")
    .delete()
    .eq("session_id", sessionId);
  if (clearEntriesError) throw toFriendlyAttendanceError(clearEntriesError, "attendance_entries");

  const cleanEntries = (entries || [])
    .map((item) => {
      const matricule = normalizeText(item?.matricule);
      const studentName = normalizeText(item?.studentName || item?.student_name || item?.name);
      const mark = normalizeMark(item?.mark);
      if (!matricule || !studentName || !mark) return null;
      const parsedStudentId = parseNumericId(item?.studentId ?? item?.student_id);
      const row = {
        session_id: sessionId,
        matricule,
        student_name: studentName,
        mark,
      };
      if (parsedStudentId != null) row.student_id = parsedStudentId;
      return row;
    })
    .filter(Boolean);

  if (cleanEntries.length > 0) {
    const { error: insertEntriesError } = await supabase
      .from("attendance_entries")
      .insert(cleanEntries);

    if (insertEntriesError) {
      const message = String(insertEntriesError?.message || "").toLowerCase();
      const mentionsStudentId =
        message.includes("student_id") || message.includes("incompatible") || message.includes("uuid");
      if (!mentionsStudentId) throw toFriendlyAttendanceError(insertEntriesError, "attendance_entries");

      const fallbackRows = cleanEntries.map((row) => {
        const normalizedRow = { ...row };
        delete normalizedRow.student_id;
        return normalizedRow;
      });
      const { error: retryError } = await supabase.from("attendance_entries").insert(fallbackRows);
      if (retryError) throw toFriendlyAttendanceError(retryError, "attendance_entries");
    }
  }

  return { sessionId, savedCount: cleanEntries.length };
};

const submitAttendanceFallback = async ({ teacherId, sessionId }) => {
  const normalizedTeacherId = normalizeText(teacherId);
  const normalizedSessionId = normalizeText(sessionId);
  if (!normalizedTeacherId || !normalizedSessionId) {
    throw new Error("Teacher id and session id are required.");
  }

  const { data, error } = await supabase
    .from("attendance_sessions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", normalizedSessionId)
    .eq("teacher_id", normalizedTeacherId)
    .in("status", ["draft", "rejected"])
    .select("id")
    .limit(1);

  if (error) throw toFriendlyAttendanceError(error, "attendance_sessions");
  if (!data?.[0]?.id) throw new Error("Session not found or not editable.");

  return String(data[0].id);
};

const fetchAttendanceEntriesFallback = async ({ sessionId }) => {
  const normalizedSessionId = normalizeText(sessionId);
  if (!normalizedSessionId) return [];

  const { data, error } = await supabase
    .from("attendance_entries")
    .select("id,session_id,student_id,matricule,student_name,mark")
    .eq("session_id", normalizedSessionId)
    .order("student_name", { ascending: true });

  if (error) throw toFriendlyAttendanceError(error, "attendance_entries");
  return (data || []).map(mapEntry);
};

const fetchTeacherSessionsFallback = async ({
  teacherId,
  weekStart = null,
  weekEnd = null,
  limit = 60,
}) => {
  let query = supabase
    .from("attendance_sessions")
    .select(
      "id,teacher_id,faculty_id,department_id,class_name,subject,session_date,academic_year,semester,status,teacher_note,admin_note,submitted_at,reviewed_at,reviewed_by,created_at"
    )
    .eq("teacher_id", normalizeText(teacherId))
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (weekStart) query = query.gte("session_date", weekStart);
  if (weekEnd) query = query.lte("session_date", weekEnd);
  if (Number.isFinite(limit) && limit > 0) query = query.limit(limit);

  const { data: sessionsRows, error: sessionsError } = await query;
  if (sessionsError) throw toFriendlyAttendanceError(sessionsError, "attendance_sessions");

  const sessions = sessionsRows || [];
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((row) => row.id).filter(Boolean);
  const { data: entriesRows, error: entriesError } = await supabase
    .from("attendance_entries")
    .select("session_id,mark")
    .in("session_id", sessionIds);
  if (entriesError) throw toFriendlyAttendanceError(entriesError, "attendance_entries");

  const countsBySession = aggregateSessionCounts(entriesRows || []);
  return sessions.map((row) => {
    const counts = countsBySession.get(String(row.id)) || {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    return mapSession({
      ...row,
      total_students: counts.total,
      present_count: counts.present,
      absent_count: counts.absent,
      late_count: counts.late,
      excused_count: counts.excused,
    });
  });
};

const fetchAdminSessionsFallback = async ({
  status = "",
  weekStart = null,
  weekEnd = null,
}) => {
  let query = supabase
    .from("attendance_sessions")
    .select(
      "id,teacher_id,faculty_id,department_id,class_name,subject,session_date,academic_year,semester,status,teacher_note,admin_note,submitted_at,reviewed_at,reviewed_by,created_at"
    )
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  const normalizedStatus = normalizeSessionStatus(status);
  if (status && normalizedStatus) query = query.eq("status", normalizedStatus);
  if (weekStart) query = query.gte("session_date", weekStart);
  if (weekEnd) query = query.lte("session_date", weekEnd);

  const { data: sessionsRows, error: sessionsError } = await query;
  if (sessionsError) throw toFriendlyAttendanceError(sessionsError, "attendance_sessions");

  const sessions = sessionsRows || [];
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map((row) => row.id).filter(Boolean);
  const teacherIds = Array.from(
    new Set(sessions.map((row) => String(row?.teacher_id || "").trim()).filter(Boolean))
  );

  const [{ data: entriesRows, error: entriesError }, { data: teacherRows, error: teacherError }] =
    await Promise.all([
      supabase.from("attendance_entries").select("session_id,mark").in("session_id", sessionIds),
      teacherIds.length > 0
        ? supabase.from("teachers").select("id,full_name,staff_id").in("id", teacherIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (entriesError) throw toFriendlyAttendanceError(entriesError, "attendance_entries");
  if (teacherError) throw teacherError;

  const countsBySession = aggregateSessionCounts(entriesRows || []);
  const teacherMap = new Map(
    (teacherRows || []).map((row) => [String(row?.id || ""), row || {}])
  );

  return sessions.map((row) => {
    const counts = countsBySession.get(String(row.id)) || {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };
    const teacher = teacherMap.get(String(row?.teacher_id || "")) || {};
    return mapSession({
      ...row,
      teacher_name: teacher?.full_name || "",
      teacher_staff_id: teacher?.staff_id || "",
      total_students: counts.total,
      present_count: counts.present,
      absent_count: counts.absent,
      late_count: counts.late,
      excused_count: counts.excused,
    });
  });
};

const reviewAttendanceFallback = async ({
  adminId,
  sessionId,
  decision,
  adminNote = "",
}) => {
  const normalizedDecision = String(decision || "").trim().toLowerCase();
  if (normalizedDecision !== "approved" && normalizedDecision !== "rejected") {
    throw new Error("Decision must be approved or rejected.");
  }

  const { data, error } = await supabase
    .from("attendance_sessions")
    .update({
      status: normalizedDecision,
      admin_note: String(adminNote || ""),
      reviewed_at: new Date().toISOString(),
      reviewed_by: normalizeText(adminId),
    })
    .eq("id", normalizeText(sessionId))
    .eq("status", "submitted")
    .select("id")
    .limit(1);

  if (error) throw toFriendlyAttendanceError(error, "attendance_sessions");
  if (!data?.[0]?.id) throw new Error("Session not found or not in submitted state.");
  return String(data[0].id);
};

const deleteAttendanceSessionFallback = async ({ sessionId }) => {
  const normalizedSessionId = normalizeText(sessionId);
  if (!normalizedSessionId) {
    throw new Error("Session id is required.");
  }

  const { error: deleteEntriesError } = await supabase
    .from("attendance_entries")
    .delete()
    .eq("session_id", normalizedSessionId);
  if (deleteEntriesError) throw toFriendlyAttendanceError(deleteEntriesError, "attendance_entries");

  const { data, error } = await supabase
    .from("attendance_sessions")
    .delete()
    .eq("id", normalizedSessionId)
    .select("id")
    .limit(1);

  if (error) throw toFriendlyAttendanceError(error, "attendance_sessions");
  if (!data?.[0]?.id) throw new Error("Attendance session not found.");

  return String(data[0].id);
};

const fetchStudentWeeklyFallback = async ({
  matricule,
  weekStart = null,
  weekEnd = null,
}) => {
  const normalizedMatricule = normalizeText(matricule);
  if (!normalizedMatricule) return [];

  const { data: entryRows, error: entryError } = await supabase
    .from("attendance_entries")
    .select("session_id,mark,matricule")
    .ilike("matricule", normalizedMatricule);

  if (entryError) throw toFriendlyAttendanceError(entryError, "attendance_entries");

  const entries = entryRows || [];
  if (entries.length === 0) return [];

  const sessionIds = Array.from(new Set(entries.map((row) => row?.session_id).filter(Boolean)));
  if (sessionIds.length === 0) return [];

  let sessionsQuery = supabase
    .from("attendance_sessions")
    .select(
      "id,teacher_id,class_name,subject,session_date,academic_year,semester,status,created_at"
    )
    .in("id", sessionIds)
    .eq("status", "approved")
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (weekStart) sessionsQuery = sessionsQuery.gte("session_date", weekStart);
  if (weekEnd) sessionsQuery = sessionsQuery.lte("session_date", weekEnd);

  const { data: sessionsRows, error: sessionsError } = await sessionsQuery;
  if (sessionsError) throw toFriendlyAttendanceError(sessionsError, "attendance_sessions");

  const sessions = sessionsRows || [];
  if (sessions.length === 0) return [];

  const teacherIds = Array.from(
    new Set(sessions.map((row) => String(row?.teacher_id || "").trim()).filter(Boolean))
  );
  const { data: teacherRows, error: teacherError } =
    teacherIds.length > 0
      ? await supabase.from("teachers").select("id,full_name").in("id", teacherIds)
      : { data: [], error: null };

  if (teacherError) throw teacherError;

  const sessionsMap = new Map((sessions || []).map((row) => [String(row?.id || ""), row]));
  const teacherMap = new Map((teacherRows || []).map((row) => [String(row?.id || ""), row]));

  return entries
    .map((entry) => {
      const session = sessionsMap.get(String(entry?.session_id || ""));
      if (!session) return null;
      const teacher = teacherMap.get(String(session?.teacher_id || "")) || {};
      return {
        sessionId: String(session?.id || ""),
        sessionDate: session?.session_date || null,
        className: String(session?.class_name || "").trim(),
        subject: String(session?.subject || "").trim(),
        mark: normalizeMark(entry?.mark),
        academicYear: String(session?.academic_year || "").trim(),
        semester: String(session?.semester || "").trim(),
        teacherName: String(teacher?.full_name || "").trim(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.sessionDate || "").localeCompare(String(a.sessionDate || "")));
};

export const resolveAdminId = async ({ adminId = "", email = "", name = "" } = {}) => {
  ensureBackend();

  const id = String(adminId || "").trim();
  if (id) return id;

  const normalizedEmail = String(email || "").trim();
  const normalizedName = String(name || "").trim();

  if (normalizedEmail) {
    const byLowerEmail = await supabase
      .from("admins")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (byLowerEmail.error) throw byLowerEmail.error;
    if (byLowerEmail.data?.id) return String(byLowerEmail.data.id);
  }

  if (normalizedName) {
    const byName = await supabase
      .from("admins")
      .select("id")
      .ilike("full_name", normalizedName)
      .limit(2);

    if (byName.error) throw byName.error;
    const rows = byName.data || [];
    if (rows.length === 1 && rows[0]?.id != null) return String(rows[0].id);
    if (rows.length > 1) {
      throw new Error("Multiple admin accounts matched your session. Please sign in again.");
    }
  }

  throw new Error("Admin session not found. Please sign in again.");
};

export const getCurrentWeekRange = () => {
  const now = new Date();
  return getWeekRangeByDate(now);
};

export const getWeekRangeByDate = (dateValue) => {
  const base = dateValue ? new Date(dateValue) : new Date();
  const day = base.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    weekStart: toDateOnly(start),
    weekEnd: toDateOnly(end),
  };
};

export const getAcademicYearByDate = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}/${startYear + 1}`;
};

export const getSemesterByDate = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  const month = date.getMonth() + 1;
  return month >= 9 || month <= 2 ? "Semester 1" : "Semester 2";
};

export const parseClassName = (className) => {
  const parts = String(className || "")
    .split(" - ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return { program: parts[0], level: parts[1] };
  }
  return { program: parts[0] || "", level: "" };
};

export const classMatchesStudent = (className, student) => {
  const { program, level } = parseClassName(className);
  const studentProgram = String(student?.program || "").trim();
  const studentLevel = String(student?.level || "").trim();

  if (normalizeId(program) !== normalizeId(studentProgram)) return false;
  if (!level) return true;
  return normalizeId(level) === normalizeId(studentLevel);
};

export const fetchTeacherAttendanceContext = async ({ teacherUserId, staffId, email }) => {
  ensureBackend();

  let teacher = null;
  let lastError = null;

  if (teacherUserId) {
    const res = await supabase.from("teachers").select("*").eq("id", teacherUserId).maybeSingle();
    if (!res.error && res.data) teacher = res.data;
    else lastError = res.error || null;
  }

  if (!teacher && staffId) {
    const res = await supabase
      .from("teachers")
      .select("*")
      .ilike("staff_id", String(staffId).trim())
      .maybeSingle();
    if (!res.error && res.data) teacher = res.data;
    else lastError = res.error || lastError;
  }

  if (!teacher && email) {
    const res = await supabase
      .from("teachers")
      .select("*")
      .ilike("email", String(email).trim())
      .maybeSingle();
    if (!res.error && res.data) teacher = res.data;
    else lastError = res.error || lastError;
  }

  if (!teacher) {
    throw new Error(lastError?.message || "Teacher profile not found.");
  }

  const teacherId = String(teacher.id || "");
  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("teacher_assignments")
    .select("class_name,subject")
    .eq("teacher_id", teacherId);

  if (assignmentError) throw assignmentError;

  const assignments = Array.from(
    new Map(
      (assignmentRows || [])
        .map((row) => ({
          className: String(row?.class_name || "").trim(),
          subject: String(row?.subject || "").trim(),
        }))
        .filter((row) => row.className && row.subject)
        .map((row) => [`${normalizeId(row.className)}__${normalizeId(row.subject)}`, row])
    ).values()
  );

  let studentsRows = [];
  if (teacher.faculty_id != null && teacher.department_id != null) {
    const byIds = await supabase
      .from("students")
      .select("*")
      .eq("faculty_id", teacher.faculty_id)
      .eq("department_id", teacher.department_id);

    if (!byIds.error) {
      studentsRows = byIds.data || [];
    }
  }

  if (studentsRows.length === 0) {
    const allStudents = await supabase.from("students").select("*");
    if (allStudents.error) throw allStudents.error;
    studentsRows = allStudents.data || [];
  }

  const students = studentsRows.map((row) => ({
    id: row?.id != null ? String(row.id) : "",
    matricule: String(row?.matricule || "").trim(),
    name: String(row?.full_name || row?.name || "").trim(),
    program: String(row?.program || "").trim(),
    level: String(row?.level || "").trim(),
    facultyId: row?.faculty_id != null ? String(row.faculty_id) : "",
    departmentId: row?.department_id != null ? String(row.department_id) : "",
  }));

  return {
    teacher: {
      id: teacherId,
      staffId: String(teacher?.staff_id || "").trim(),
      name: String(teacher?.full_name || teacher?.name || "").trim(),
      facultyId: teacher?.faculty_id != null ? String(teacher.faculty_id) : "",
      departmentId: teacher?.department_id != null ? String(teacher.department_id) : "",
      employment: String(teacher?.employment || "").trim(),
    },
    assignments,
    students,
  };
};

export const attendanceSaveDraft = async ({
  teacherId,
  facultyId,
  departmentId,
  className,
  subject,
  sessionDate,
  academicYear,
  semester,
  teacherNote = "",
  entries = [],
}) => {
  ensureBackend();

  const rpcPayload = {
    p_teacher_id: teacherId,
    p_faculty_id: facultyId ? Number(facultyId) : null,
    p_department_id: departmentId ? Number(departmentId) : null,
    p_class_name: className,
    p_subject: subject,
    p_session_date: sessionDate,
    p_academic_year: academicYear,
    p_semester: semester,
    p_teacher_note: teacherNote,
    p_entries: entries,
  };

  const { data, error } = await supabase.rpc("attendance_save_draft_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_save_draft_app")) {
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_save_draft",
          rpcPayload
        );
        if (!fallbackError) {
          const row = Array.isArray(fallbackData) ? fallbackData[0] : null;
          return {
            sessionId: row?.session_id ? String(row.session_id) : "",
            savedCount: Number(row?.saved_count || 0),
          };
        }
      } catch {
        // continue to direct-table fallback below
      }

      return saveDraftFallback({
        teacherId,
        facultyId,
        departmentId,
        className,
        subject,
        sessionDate,
        academicYear,
        semester,
        teacherNote,
        entries,
      });
    }
    throw toFriendlyAttendanceError(error, "attendance tables");
  }

  const row = Array.isArray(data) ? data[0] : null;
  return {
    sessionId: row?.session_id ? String(row.session_id) : "",
    savedCount: Number(row?.saved_count || 0),
  };
};

export const attendanceSubmit = async ({ teacherId, sessionId }) => {
  ensureBackend();

  const rpcPayload = {
    p_teacher_id: teacherId,
    p_session_id: sessionId,
  };

  const { data, error } = await supabase.rpc("attendance_submit_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_submit_app")) {
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_submit",
          rpcPayload
        );
        if (!fallbackError) return String(fallbackData || sessionId || "");
      } catch {
        // continue to direct-table fallback below
      }

      return submitAttendanceFallback({ teacherId, sessionId });
    }
    throw toFriendlyAttendanceError(error, "attendance_sessions");
  }

  return String(data || sessionId || "");
};

export const fetchTeacherAttendanceSessions = async ({
  teacherId,
  weekStart = null,
  weekEnd = null,
  limit = 60,
}) => {
  ensureBackend();

  const rpcPayload = {
    p_teacher_id: teacherId,
    p_week_start: weekStart || null,
    p_week_end: weekEnd || null,
    p_limit: Number(limit) || 60,
  };

  const { data, error } = await supabase.rpc("attendance_teacher_sessions_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_teacher_sessions_app")) {
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_teacher_sessions",
          rpcPayload
        );
        if (!fallbackError) return (fallbackData || []).map(mapSession);
      } catch {
        // continue to direct-table fallback below
      }

      return fetchTeacherSessionsFallback({ teacherId, weekStart, weekEnd, limit });
    }
    throw toFriendlyAttendanceError(error, "attendance_sessions");
  }

  return (data || []).map(mapSession);
};

export const fetchTeacherAttendanceEntries = async ({ teacherId, sessionId }) => {
  ensureBackend();

  const rpcPayload = {
    p_teacher_id: teacherId,
    p_session_id: sessionId,
  };

  const { data, error } = await supabase.rpc("attendance_teacher_entries_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_teacher_entries_app")) {
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_teacher_entries",
          rpcPayload
        );
        if (!fallbackError) return (fallbackData || []).map(mapEntry);
      } catch {
        // continue to direct-table fallback below
      }

      return fetchAttendanceEntriesFallback({ sessionId });
    }
    throw toFriendlyAttendanceError(error, "attendance_entries");
  }

  return (data || []).map(mapEntry);
};

export const fetchAdminAttendanceSessions = async ({
  adminId,
  status = "",
  weekStart = null,
  weekEnd = null,
}) => {
  ensureBackend();

  const rpcPayload = {
    p_admin_id: String(adminId || "").trim(),
    p_status: status || null,
    p_week_start: weekStart || null,
    p_week_end: weekEnd || null,
  };

  const { data, error } = await supabase.rpc("attendance_admin_sessions_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_admin_sessions_app")) {
      try {
        const legacyPayload = {
          ...rpcPayload,
          p_admin_id: parseNumericId(adminId),
        };
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_admin_sessions",
          legacyPayload
        );
        if (!fallbackError) return (fallbackData || []).map(mapSession);
      } catch {
        // continue to direct-table fallback below
      }

      return fetchAdminSessionsFallback({ status, weekStart, weekEnd });
    }
    throw toFriendlyAttendanceError(error, "attendance_sessions");
  }

  return (data || []).map(mapSession);
};

export const fetchAdminAttendanceEntries = async ({ adminId, sessionId }) => {
  ensureBackend();

  const rpcPayload = {
    p_admin_id: String(adminId || "").trim(),
    p_session_id: sessionId,
  };

  const { data, error } = await supabase.rpc("attendance_admin_entries_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_admin_entries_app")) {
      try {
        const legacyPayload = {
          ...rpcPayload,
          p_admin_id: parseNumericId(adminId),
        };
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_admin_entries",
          legacyPayload
        );
        if (!fallbackError) return (fallbackData || []).map(mapEntry);
      } catch {
        // continue to direct-table fallback below
      }

      return fetchAttendanceEntriesFallback({ sessionId });
    }
    throw toFriendlyAttendanceError(error, "attendance_entries");
  }

  return (data || []).map(mapEntry);
};

export const reviewAttendanceSession = async ({
  adminId,
  sessionId,
  decision,
  adminNote = "",
}) => {
  ensureBackend();

  const rpcPayload = {
    p_admin_id: String(adminId || "").trim(),
    p_session_id: sessionId,
    p_decision: String(decision || "").trim().toLowerCase(),
    p_admin_note: adminNote,
  };

  const { data, error } = await supabase.rpc("attendance_admin_review_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_admin_review_app")) {
      try {
        const legacyPayload = {
          ...rpcPayload,
          p_admin_id: parseNumericId(adminId),
        };
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_admin_review",
          legacyPayload
        );
        if (!fallbackError) return String(fallbackData || sessionId || "");
      } catch {
        // continue to direct-table fallback below
      }

      return reviewAttendanceFallback({ adminId, sessionId, decision, adminNote });
    }
    throw toFriendlyAttendanceError(error, "attendance_sessions");
  }

  return String(data || sessionId || "");
};

export const deleteAttendanceSessionAsAdmin = async ({ adminId, sessionId }) => {
  ensureBackend();

  const rpcPayload = {
    p_admin_id: String(adminId || "").trim(),
    p_session_id: sessionId,
  };

  const { data, error } = await supabase.rpc("attendance_admin_delete_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_admin_delete_app")) {
      try {
        const legacyPayload = {
          ...rpcPayload,
          p_admin_id: parseNumericId(adminId),
        };
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_admin_delete",
          legacyPayload
        );
        if (!fallbackError) return String(fallbackData || sessionId || "");
      } catch {
        // continue to direct-table fallback below
      }

      return deleteAttendanceSessionFallback({ sessionId });
    }
    throw toFriendlyAttendanceError(error, "attendance tables");
  }

  return String(data || sessionId || "");
};

export const fetchStudentWeeklyAttendance = async ({
  matricule,
  weekStart = null,
  weekEnd = null,
}) => {
  ensureBackend();

  const rpcPayload = {
    p_matricule: matricule,
    p_week_start: weekStart || null,
    p_week_end: weekEnd || null,
  };

  const { data, error } = await supabase.rpc("attendance_student_weekly_app", rpcPayload);

  if (error) {
    if (isRpcMissing(error, "attendance_student_weekly_app")) {
      try {
        const { data: fallbackData, error: fallbackError } = await supabase.rpc(
          "attendance_student_weekly",
          rpcPayload
        );
        if (!fallbackError) {
          return (fallbackData || []).map((row) => ({
            sessionId: String(row?.session_id || ""),
            sessionDate: row?.session_date || null,
            className: String(row?.class_name || "").trim(),
            subject: String(row?.subject || "").trim(),
            mark: String(row?.mark || "").trim().toLowerCase(),
            academicYear: String(row?.academic_year || "").trim(),
            semester: String(row?.semester || "").trim(),
            teacherName: String(row?.teacher_name || "").trim(),
          }));
        }
      } catch {
        // continue to direct-table fallback below
      }

      return fetchStudentWeeklyFallback({ matricule, weekStart, weekEnd });
    }
    throw toFriendlyAttendanceError(error, "attendance tables");
  }

  return (data || []).map((row) => ({
    sessionId: String(row?.session_id || ""),
    sessionDate: row?.session_date || null,
    className: String(row?.class_name || "").trim(),
    subject: String(row?.subject || "").trim(),
    mark: String(row?.mark || "").trim().toLowerCase(),
    academicYear: String(row?.academic_year || "").trim(),
    semester: String(row?.semester || "").trim(),
    teacherName: String(row?.teacher_name || "").trim(),
  }));
};
