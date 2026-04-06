import { normalizeId } from "./registrationData";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const SEMESTER_OPTIONS = ["Semester 1", "Semester 2"];

const MAX_BY_TYPE = {
  CA: 30,
  EXAM: 70,
};

const ENTRY_TABLE_CANDIDATES = ["result_entries", "result_submission_marks"];
const ENTRY_FK_CANDIDATES = [
  "submission_id",
  "result_submission_id",
  "submission",
  "result_submission",
  "submission_ref",
  "report_id",
];
const MISSING_ENTRY_TABLES = new Set();
let preferredEntryTable = "";

const extractEntrySubmissionId = (row) => {
  for (const fk of ENTRY_FK_CANDIDATES) {
    const value = safeText(row?.[fk]);
    if (value) return value;
  }
  return "";
};

const createSubmissionIdMatcher = (submissionIds = []) => {
  const exact = new Set((submissionIds || []).map((id) => safeText(id)).filter(Boolean));
  const normalized = new Set(Array.from(exact).map((id) => normalizeId(id)));

  return (value) => {
    const raw = safeText(value);
    if (!raw) return false;
    if (exact.has(raw)) return true;
    return normalized.has(normalizeId(raw));
  };
};

const resolveEntrySubmissionId = ({
  row,
  submissionIdMatcher = null,
  preferredFk = "",
}) => {
  if (submissionIdMatcher) {
    for (const fk of ENTRY_FK_CANDIDATES) {
      const value = safeText(row?.[fk]);
      if (value && submissionIdMatcher(value)) return value;
    }
  }

  const preferredValue = safeText(row?.[preferredFk]);
  if (preferredValue) return preferredValue;
  return extractEntrySubmissionId(row);
};

const ensureBackend = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
};

const safeText = (value) => String(value ?? "").trim();

const parseNumericId = (value) => {
  const raw = safeText(value);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
};

const toIsoNow = () => new Date().toISOString();

const isRlsViolation = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42501" || message.includes("row-level security policy");
};

const isMissingRelation = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (message.includes("relation") && message.includes("does not exist")) ||
    (message.includes("could not find the table") && message.includes("schema cache"))
  );
};

const isMissingColumn = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42703" ||
    error?.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist"))
  );
};

const extractMissingColumnName = (error) => {
  const message = String(error?.message || "");
  const pgrstMatch = message.match(/Could not find the '([^']+)' column/i);
  if (pgrstMatch?.[1]) return safeText(pgrstMatch[1]);

  const postgresMatch = message.match(/column "?([a-zA-Z0-9_]+)"?.*does not exist/i);
  if (postgresMatch?.[1]) return safeText(postgresMatch[1]);

  return "";
};

const extractNotNullColumnName = (error) => {
  const message = String(error?.message || "");
  const match = message.match(/null value in column "?([a-zA-Z0-9_]+)"?/i);
  if (match?.[1]) return safeText(match[1]);
  return "";
};

const isStudentIdTypeMismatch = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("student_id") &&
    (message.includes("incompatible types") ||
      message.includes("invalid input syntax for type uuid") ||
      message.includes("invalid input syntax for type bigint"))
  );
};

const toFriendlyResultsError = (error, tableHint = "result tables") => {
  if (isRlsViolation(error)) {
    return new Error(
      `Row-level security is blocking ${tableHint}. Disable/rewrite policies for your custom no-auth flow, then refresh.`
    );
  }
  return error;
};

const dedupeBy = (items, toKey) => {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const key = toKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const normalizeSemester = (value) => {
  const raw = safeText(value).toLowerCase();
  if (!raw) return "";
  if (raw === "1" || raw.includes("semester 1") || raw.includes("sem 1") || raw.includes("first")) {
    return "Semester 1";
  }
  if (raw === "2" || raw.includes("semester 2") || raw.includes("sem 2") || raw.includes("second")) {
    return "Semester 2";
  }
  return safeText(value);
};

const normalizeAssessmentType = (value) => {
  const raw = safeText(value).toUpperCase();
  if (raw === "CA") return "CA";
  if (raw === "EXAM") return "EXAM";
  if (raw === "CONTINUOUS ASSESSMENT") return "CA";
  return raw || "EXAM";
};

const normalizeStatus = (value) => {
  const raw = safeText(value).toLowerCase();
  if (raw === "submitted" || raw === "approved" || raw === "rejected") return raw;
  if (!raw) return "submitted";
  return raw;
};

const parseScore = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const clampMark = (value, assessmentType) => {
  const mark = parseScore(value);
  if (mark === null) return null;
  const max = MAX_BY_TYPE[normalizeAssessmentType(assessmentType)] || 100;
  if (mark < 0) return 0;
  if (mark > max) return max;
  return mark;
};

const buildAcademicYear = (startYear) => `${startYear}/${startYear + 1}`;

export const getCurrentAcademicYear = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return buildAcademicYear(startYear);
};

export const getAcademicYearOptions = (count = 4) => {
  const first = Number(getCurrentAcademicYear().slice(0, 4));
  return Array.from({ length: count }, (_, index) => buildAcademicYear(first - index));
};

export const parseClassName = (className) => {
  const trimmed = safeText(className);
  if (!trimmed) return { program: "", level: "" };
  const [program, level] = trimmed.split(" - ").map((part) => safeText(part));
  if (program && level) return { program, level };
  return { program: trimmed, level: "" };
};

const classMatchesStudent = (className, student) => {
  const { program, level } = parseClassName(className);
  const studentProgram = safeText(student?.program);
  const studentLevel = safeText(student?.level);
  if (!program) return false;
  if (normalizeId(program) !== normalizeId(studentProgram)) return false;
  if (!level) return true;
  return normalizeId(level) === normalizeId(studentLevel);
};

export const getStudentsForClass = ({ students = [], className }) =>
  (students || []).filter((student) => classMatchesStudent(className, student));

const readRows = async (table, options = {}) => {
  const { allowRlsBlock = false } = options;
  ensureBackend();

  const { data, error } = await supabase.from(table).select("*").limit(5000);
  if (error) {
    if (isMissingRelation(error)) return [];
    if (allowRlsBlock && isRlsViolation(error)) return [];
    throw toFriendlyResultsError(error, table);
  }

  return Array.isArray(data) ? data : [];
};

const buildFacultyMaps = (rows) => {
  const byId = new Map();
  const byName = new Map();
  const list = [];

  for (const row of rows || []) {
    const id = safeText(row?.id);
    const name = safeText(row?.name || row?.faculty || row?.title);
    if (!name) continue;
    if (id) byId.set(id, { id, name });
    if (!byName.has(normalizeId(name))) {
      byName.set(normalizeId(name), { id, name });
      list.push({ id, name });
    }
  }

  return { byId, byName, list };
};

const buildDepartmentMaps = (rows) => {
  const byId = new Map();
  const byName = new Map();

  for (const row of rows || []) {
    const id = safeText(row?.id);
    const name = safeText(row?.name || row?.department);
    const facultyId = safeText(row?.faculty_id || row?.facultyId);
    if (!name) continue;
    if (id) byId.set(id, { id, name, facultyId });
    if (!byName.has(normalizeId(name))) {
      byName.set(normalizeId(name), { id, name, facultyId });
    }
  }

  return { byId, byName };
};

const buildSubjectMap = (rows) => {
  const byId = new Map();
  for (const row of rows || []) {
    const id = safeText(row?.id);
    const name = safeText(row?.name || row?.subject || row?.title);
    if (!id || !name) continue;
    byId.set(id, {
      id,
      name,
      facultyId: safeText(row?.faculty_id || row?.facultyId),
      departmentId: safeText(row?.department_id || row?.departmentId),
      code: safeText(row?.code),
    });
  }
  return byId;
};

const buildPeriodMap = (rows) => {
  const byId = new Map();
  for (const row of rows || []) {
    const id = safeText(row?.id);
    const academicYear = safeText(row?.academic_year || row?.year || row?.academicYear);
    const semester = normalizeSemester(row?.semester || row?.term);
    if (!id) continue;
    byId.set(id, { id, academicYear, semester, raw: row });
  }
  return byId;
};

const buildStudentMaps = (rows, facultyMaps, departmentMaps) => {
  const byId = new Map();
  const byMatricule = new Map();
  const byName = new Map();
  const list = [];

  for (const row of rows || []) {
    const mapped = mapStudentRow(row, facultyMaps, departmentMaps);
    if (!mapped) continue;
    const id = safeText(mapped.studentId);
    const matriculeKey = normalizeId(mapped.matricule);
    const nameKey = normalizeId(mapped.name);

    if (id) byId.set(id, mapped);
    if (matriculeKey) byMatricule.set(matriculeKey, mapped);
    if (nameKey && !byName.has(nameKey)) byName.set(nameKey, mapped);
    list.push(mapped);
  }

  return { byId, byMatricule, byName, list };
};

const mapTeacherRow = (row, facultyMaps, departmentMaps) => {
  let facultyId = safeText(row?.faculty_id || row?.facultyId);
  let departmentId = safeText(row?.department_id || row?.departmentId);

  const explicitFacultyName = safeText(row?.faculty || row?.faculty_name);
  const explicitDepartmentName = safeText(row?.department || row?.department_name);

  if (!facultyId && explicitFacultyName) {
    facultyId = facultyMaps.byName.get(normalizeId(explicitFacultyName))?.id || "";
  }

  if (!departmentId && explicitDepartmentName) {
    departmentId = departmentMaps.byName.get(normalizeId(explicitDepartmentName))?.id || "";
  }

  const faculty = explicitFacultyName || facultyMaps.byId.get(facultyId)?.name || "";
  const department = explicitDepartmentName || departmentMaps.byId.get(departmentId)?.name || "";

  return {
    id: safeText(row?.id),
    staffId: safeText(row?.staff_id || row?.staffId),
    name: safeText(row?.full_name || row?.name) || "Teacher",
    email: safeText(row?.email),
    facultyId,
    faculty,
    departmentId,
    department,
    employment: safeText(row?.employment),
  };
};

const mapStudentRow = (row, facultyMaps, departmentMaps) => {
  let facultyId = safeText(row?.faculty_id || row?.facultyId);
  let departmentId = safeText(row?.department_id || row?.departmentId);
  const explicitFacultyName = safeText(row?.faculty || row?.faculty_name);
  const explicitDepartmentName = safeText(row?.department || row?.department_name);

  if (!facultyId && explicitFacultyName) {
    facultyId = facultyMaps.byName.get(normalizeId(explicitFacultyName))?.id || "";
  }
  if (!departmentId && explicitDepartmentName) {
    departmentId = departmentMaps.byName.get(normalizeId(explicitDepartmentName))?.id || "";
  }

  return {
    studentId: safeText(row?.id),
    matricule: safeText(row?.matricule),
    name: safeText(row?.full_name || row?.name) || "Student",
    facultyId,
    faculty: explicitFacultyName || facultyMaps.byId.get(facultyId)?.name || "",
    departmentId,
    department: explicitDepartmentName || departmentMaps.byId.get(departmentId)?.name || "",
    program: safeText(row?.program),
    level: safeText(row?.level),
  };
};

const mapAssignmentRow = (row, subjectById) => {
  const className = safeText(row?.class_name || row?.className || row?.class);
  const subjectId = safeText(row?.subject_id || row?.subjectId);
  const linkedSubject = subjectId ? subjectById.get(subjectId) : null;
  const subject =
    safeText(row?.subject || row?.subject_name || row?.subjectName) ||
    linkedSubject?.name ||
    "";

  if (!className || !subject) return null;
  return {
    className,
    subject,
    subjectId,
    facultyId:
      safeText(row?.faculty_id || row?.facultyId) ||
      safeText(linkedSubject?.facultyId),
    departmentId:
      safeText(row?.department_id || row?.departmentId) ||
      safeText(linkedSubject?.departmentId),
  };
};

const pickFacultyByName = (rows, faculty) => {
  const target = normalizeId(faculty);
  if (!target) return null;
  return (
    (rows || []).find((row) => normalizeId(safeText(row?.name || row?.faculty)) === target) || null
  );
};

const pickDepartmentByName = (rows, department, facultyId = "") => {
  const target = normalizeId(department);
  if (!target) return null;
  const wantedFacultyId = safeText(facultyId);

  const candidates = (rows || []).filter(
    (row) => normalizeId(safeText(row?.name || row?.department)) === target
  );
  if (!candidates.length) return null;
  if (!wantedFacultyId) return candidates[0];

  return (
    candidates.find(
      (row) => safeText(row?.faculty_id || row?.facultyId) === wantedFacultyId
    ) || candidates[0]
  );
};

const pickSubjectByName = (rows, subject, facultyId = "", departmentId = "") => {
  const target = normalizeId(subject);
  if (!target) return null;
  const wantedFacultyId = safeText(facultyId);
  const wantedDepartmentId = safeText(departmentId);

  const candidates = (rows || []).filter(
    (row) => normalizeId(safeText(row?.name || row?.subject || row?.title)) === target
  );
  if (!candidates.length) return null;

  const byDepartment =
    wantedDepartmentId &&
    candidates.find(
      (row) => safeText(row?.department_id || row?.departmentId) === wantedDepartmentId
    );
  if (byDepartment) return byDepartment;

  const byFaculty =
    wantedFacultyId &&
    candidates.find(
      (row) => safeText(row?.faculty_id || row?.facultyId) === wantedFacultyId
    );
  if (byFaculty) return byFaculty;

  return candidates[0];
};

const resolveSubmissionForeignKeys = async ({
  facultyId = "",
  faculty = "",
  departmentId = "",
  department = "",
  subjectId = "",
  subject = "",
}) => {
  let resolvedFacultyId = safeText(facultyId);
  let resolvedDepartmentId = safeText(departmentId);
  let resolvedSubjectId = safeText(subjectId);

  const [facultyRows, departmentRows, subjectRows] = await Promise.all([
    readRows("faculties"),
    readRows("departments"),
    readRows("subjects"),
  ]);

  if (!resolvedFacultyId && faculty) {
    const facultyRow = pickFacultyByName(facultyRows, faculty);
    resolvedFacultyId = safeText(facultyRow?.id);
  }

  if (!resolvedDepartmentId && department) {
    const departmentRow = pickDepartmentByName(departmentRows, department, resolvedFacultyId);
    resolvedDepartmentId = safeText(departmentRow?.id);
    if (!resolvedFacultyId) {
      resolvedFacultyId = safeText(departmentRow?.faculty_id || departmentRow?.facultyId);
    }
  }

  let matchedSubjectRow = null;
  if (resolvedSubjectId) {
    matchedSubjectRow =
      (subjectRows || []).find((row) => safeText(row?.id) === resolvedSubjectId) || null;
  }
  if (!matchedSubjectRow && subject) {
    matchedSubjectRow = pickSubjectByName(
      subjectRows,
      subject,
      resolvedFacultyId,
      resolvedDepartmentId
    );
  }

  if (matchedSubjectRow) {
    if (!resolvedSubjectId) resolvedSubjectId = safeText(matchedSubjectRow?.id);
    if (!resolvedFacultyId) {
      resolvedFacultyId = safeText(
        matchedSubjectRow?.faculty_id || matchedSubjectRow?.facultyId
      );
    }
    if (!resolvedDepartmentId) {
      resolvedDepartmentId = safeText(
        matchedSubjectRow?.department_id || matchedSubjectRow?.departmentId
      );
    }
  }

  return {
    facultyId: resolvedFacultyId,
    departmentId: resolvedDepartmentId,
    subjectId: resolvedSubjectId,
  };
};

const getEntryMark = (row, assessmentType) => {
  const type = normalizeAssessmentType(assessmentType);

  const typedKeys =
    type === "CA"
      ? ["ca_score", "ca", "ca_mark", "continuous_assessment", "continuous_assessment_score"]
      : ["exam_score", "exam", "exam_mark", "final_exam", "final_exam_score"];

  const genericKeys = ["mark", "score", "marks", "value"];

  const typedValues = [];
  const genericValues = [];
  for (const key of typedKeys) {
    const mark = parseScore(row?.[key]);
    if (mark !== null && mark >= 0 && mark <= 100) typedValues.push(mark);
  }
  for (const key of genericKeys) {
    const mark = parseScore(row?.[key]);
    if (mark !== null && mark >= 0 && mark <= 100) genericValues.push(mark);
  }

  const typedPositive = typedValues.find((value) => value > 0);
  if (typedPositive !== undefined) return typedPositive;

  const genericPositive = genericValues.find((value) => value > 0);
  if (genericPositive !== undefined) return genericPositive;

  const typedZero = typedValues.find((value) => value === 0);
  if (typedZero !== undefined) return typedZero;

  if (genericValues.length > 0) return genericValues[0];

  // Last-resort fallback for custom schemas: scan numeric score-like columns.
  for (const [key, value] of Object.entries(row || {})) {
    const normalizedKey = normalizeId(key);
    if (!normalizedKey) continue;
    if (
      normalizedKey.includes("id") ||
      normalizedKey.includes("year") ||
      normalizedKey.includes("semester") ||
      normalizedKey.includes("term") ||
      normalizedKey.includes("level") ||
      normalizedKey.includes("faculty") ||
      normalizedKey.includes("department") ||
      normalizedKey.includes("subject")
    ) {
      continue;
    }

    const scoreLike =
      normalizedKey.includes("mark") ||
      normalizedKey.includes("score") ||
      normalizedKey.includes("exam") ||
      normalizedKey.includes("ca");
    if (!scoreLike) continue;
    if (type === "CA" && normalizedKey.includes("exam")) continue;
    if (type === "EXAM" && normalizedKey.includes("ca")) continue;

    const parsed = parseScore(value);
    if (parsed !== null && parsed >= 0 && parsed <= 100) {
      return parsed;
    }
  }

  return null;
};

const mapSubmissionRow = ({ row, refs, teacherById }) => {
  const periodId = safeText(row?.academic_period_id || row?.period_id || row?.periodId);
  const linkedPeriod = periodId ? refs.periodById.get(periodId) : null;
  let facultyId = safeText(row?.faculty_id || row?.facultyId);
  let departmentId = safeText(row?.department_id || row?.departmentId);
  const subjectId = safeText(row?.subject_id || row?.subjectId || row?.course_id);

  const explicitFacultyName = safeText(row?.faculty || row?.faculty_name);
  const explicitDepartmentName = safeText(row?.department || row?.department_name);

  if (!facultyId && explicitFacultyName) {
    facultyId = refs.facultyMaps.byName.get(normalizeId(explicitFacultyName))?.id || "";
  }
  if (!departmentId && explicitDepartmentName) {
    departmentId = refs.departmentMaps.byName.get(normalizeId(explicitDepartmentName))?.id || "";
  }

  const teacherId = safeText(row?.teacher_id || row?.lecturer_id);
  const linkedTeacher = teacherById.get(teacherId);
  const assessmentType = normalizeAssessmentType(
    row?.assessment_type || row?.component || row?.submission_type || row?.type
  );

  return {
    id: safeText(row?.id),
    facultyId,
    faculty:
      explicitFacultyName ||
      refs.facultyMaps.byId.get(facultyId)?.name ||
      linkedTeacher?.faculty ||
      "",
    departmentId,
    department:
      explicitDepartmentName ||
      refs.departmentMaps.byId.get(departmentId)?.name ||
      linkedTeacher?.department ||
      "",
    className: safeText(row?.class_name || row?.className || row?.class),
    subject:
      safeText(row?.subject || row?.subject_name || row?.course_name) ||
      refs.subjectById.get(subjectId)?.name ||
      "",
    subjectId,
    academicYear:
      safeText(row?.academic_year || row?.year || row?.academicYear) ||
      linkedPeriod?.academicYear ||
      "",
    semester: normalizeSemester(row?.semester || row?.term) || linkedPeriod?.semester || "",
    assessmentType,
    teacherId,
    teacherName: safeText(row?.teacher_name || row?.lecturer_name) || linkedTeacher?.name || "",
    teacherStaffId:
      safeText(row?.teacher_staff_id || row?.lecturer_staff_id) || linkedTeacher?.staffId || "",
    status: normalizeStatus(row?.status),
    reviewComment: safeText(row?.review_comment || row?.admin_note || row?.comment),
    submittedAt: row?.submitted_at || row?.created_at || null,
    updatedAt: row?.updated_at || row?.submitted_at || row?.created_at || null,
    reviewedAt: row?.reviewed_at || null,
    marks: [],
    raw: row,
  };
};

const filterSubmissionByScope = ({ submission, faculty, facultyId, academicYear, semester }) => {
  if (academicYear && safeText(submission.academicYear)) {
    if (normalizeId(submission.academicYear) !== normalizeId(academicYear)) return false;
  }

  if (semester && safeText(submission.semester)) {
    if (normalizeId(normalizeSemester(submission.semester)) !== normalizeId(normalizeSemester(semester))) {
      return false;
    }
  }

  const normalizedFacultyId = safeText(facultyId);
  const normalizedFaculty = safeText(faculty);

  if (normalizedFacultyId) {
    if (safeText(submission.facultyId)) {
      return safeText(submission.facultyId) === normalizedFacultyId;
    }
    if (normalizedFaculty && safeText(submission.faculty)) {
      return normalizeId(submission.faculty) === normalizeId(normalizedFaculty);
    }
    return true;
  }

  if (normalizedFaculty) {
    if (safeText(submission.faculty)) {
      return normalizeId(submission.faculty) === normalizeId(normalizedFaculty);
    }
    return true;
  }

  return true;
};

const loadResultEntries = async (submissionIds) => {
  if (!submissionIds.length) return { rows: [], fk: "submission_id", table: "" };

  const combinedRows = [];
  let fallbackFk = "submission_id";
  let fallbackTable = "";
  const submissionIdMatcher = createSubmissionIdMatcher(submissionIds);
  const candidateTables = preferredEntryTable
    ? [preferredEntryTable]
    : ENTRY_TABLE_CANDIDATES.filter((table) => !MISSING_ENTRY_TABLES.has(table));

  for (const table of candidateTables.length ? candidateTables : ENTRY_TABLE_CANDIDATES) {
    let rows = [];
    try {
      rows = await readRows(table, { allowRlsBlock: true });
    } catch (error) {
      if (isMissingRelation(error)) {
        MISSING_ENTRY_TABLES.add(table);
        if (preferredEntryTable === table) preferredEntryTable = "";
        continue;
      }
      throw error;
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      preferredEntryTable = preferredEntryTable || table;
      continue;
    }

    preferredEntryTable = table;

    const presentFks = ENTRY_FK_CANDIDATES.filter((fk) =>
      rows.some((row) => Object.prototype.hasOwnProperty.call(row || {}, fk))
    );
    const fksToCheck = presentFks.length ? presentFks : ENTRY_FK_CANDIDATES;

    if (!fallbackTable) {
      fallbackTable = table;
      fallbackFk = fksToCheck[0] || "submission_id";
    }

    const matchedRows = rows.filter((row) => {
      for (const fk of fksToCheck) {
        const value = safeText(row?.[fk]);
        if (value && submissionIdMatcher(value)) return true;
      }
      return false;
    });

    if (matchedRows.length) {
      combinedRows.push(...matchedRows);
    }
  }

  const dedupedRows = dedupeBy(
    combinedRows,
    (row) =>
      `${safeText(row?.id)}__${extractEntrySubmissionId(row)}__${safeText(
        row?.student_matricule ||
          row?.matricule ||
          row?.student_id ||
          row?.student_name ||
          row?.full_name ||
          row?.name
      )}`
  );

  return {
    rows: dedupedRows,
    fk: fallbackFk,
    table: fallbackTable,
  };
};

const buildResultRefs = async () => {
  const [facultyRows, departmentRows, subjectRows, teacherRows, periodRows, studentRows] = await Promise.all([
    readRows("faculties"),
    readRows("departments"),
    readRows("subjects"),
    readRows("teachers"),
    readRows("academic_periods", { allowRlsBlock: true }),
    readRows("students"),
  ]);

  const facultyMaps = buildFacultyMaps(facultyRows);
  const departmentMaps = buildDepartmentMaps(departmentRows);
  const subjectById = buildSubjectMap(subjectRows);
  const periodById = buildPeriodMap(periodRows);
  const teacherList = (teacherRows || []).map((row) =>
    mapTeacherRow(row, facultyMaps, departmentMaps)
  );
  const teacherById = new Map(teacherList.map((teacher) => [teacher.id, teacher]));
  const studentMaps = buildStudentMaps(studentRows, facultyMaps, departmentMaps);

  return {
    facultyMaps,
    departmentMaps,
    subjectById,
    periodById,
    teacherList,
    teacherById,
    studentById: studentMaps.byId,
    studentByMatricule: studentMaps.byMatricule,
    studentByName: studentMaps.byName,
    periodRows,
  };
};

const fetchMappedSubmissions = async ({
  faculty = "",
  facultyId = "",
  academicYear = "",
  semester = "",
} = {}) => {
  ensureBackend();
  const refs = await buildResultRefs();
  const submissionRows = await readRows("result_submissions");

  const mapped = submissionRows
    .map((row) => mapSubmissionRow({ row, refs, teacherById: refs.teacherById }))
    .filter((submission) =>
      filterSubmissionByScope({
        submission,
        faculty,
        facultyId,
        academicYear,
        semester,
      })
    );

  const submissionIds = mapped.map((item) => item.id).filter(Boolean);
  const submissionIdMatcher = createSubmissionIdMatcher(submissionIds);
  const { rows: entryRows, fk: entryFk } = await loadResultEntries(submissionIds);

  const marksBySubmission = new Map();
  for (const row of entryRows || []) {
    const submissionId = resolveEntrySubmissionId({
      row,
      submissionIdMatcher,
      preferredFk: entryFk,
    });
    if (!submissionId) continue;
    const mapKey = normalizeId(submissionId);
    if (!marksBySubmission.has(mapKey)) marksBySubmission.set(mapKey, []);
    marksBySubmission.get(mapKey).push(row);
  }

  const withMarks = mapped.map((submission) => {
    const sourceRows = marksBySubmission.get(normalizeId(submission.id)) || [];
    const marks = sourceRows
      .map((row) => {
        const mark = getEntryMark(row, submission.assessmentType);
        const studentId = safeText(row?.student_id);
        const nameFromRow = safeText(row?.student_name || row?.full_name || row?.name);
        const linkedStudentById = studentId ? refs.studentById.get(studentId) : null;
        const linkedStudentByName =
          !linkedStudentById && nameFromRow
            ? refs.studentByName.get(normalizeId(nameFromRow))
            : null;
        const linkedStudent = linkedStudentById || linkedStudentByName || null;
        const rawMatricule = safeText(row?.student_matricule || row?.matricule);
        const matricule =
          rawMatricule && normalizeId(rawMatricule) !== "unknown"
            ? rawMatricule
            : safeText(linkedStudent?.matricule);
        const name =
          nameFromRow ||
          safeText(linkedStudent?.name) ||
          "Student";

        if (!matricule && !name && !studentId) return null;
        return {
          studentId,
          matricule,
          name,
          faculty: safeText(row?.faculty),
          department: safeText(row?.department),
          program: safeText(row?.program) || safeText(linkedStudent?.program),
          level: safeText(row?.level) || safeText(linkedStudent?.level),
          mark,
        };
      })
      .filter(Boolean);

    const dedupedMarksMap = new Map();
    for (const markRow of marks) {
      const key =
        normalizeId(markRow.matricule) ||
        normalizeId(markRow.studentId) ||
        normalizeId(markRow.name);
      if (!key) continue;

      const current = dedupedMarksMap.get(key);
      if (!current) {
        dedupedMarksMap.set(key, markRow);
        continue;
      }

      const currentMark = parseScore(current.mark);
      const nextMark = parseScore(markRow.mark);
      const currentScore =
        (currentMark !== null ? 2 : 0) +
        (currentMark !== null && currentMark > 0 ? 2 : 0) +
        (safeText(current.matricule) ? 1 : 0) +
        (safeText(current.name) ? 1 : 0);
      const nextScore =
        (nextMark !== null ? 2 : 0) +
        (nextMark !== null && nextMark > 0 ? 2 : 0) +
        (safeText(markRow.matricule) ? 1 : 0) +
        (safeText(markRow.name) ? 1 : 0);

      dedupedMarksMap.set(key, nextScore >= currentScore ? markRow : current);
    }

    return {
      ...submission,
      marks: Array.from(dedupedMarksMap.values()),
    };
  });

  return withMarks.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.submittedAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.submittedAt || 0).getTime();
    return dateB - dateA;
  });
};

export const getSubmissionsForFacultyPeriod = async ({
  faculty = "",
  facultyId = "",
  academicYear = "",
  semester = "",
} = {}) =>
  fetchMappedSubmissions({
    faculty,
    facultyId,
    academicYear,
    semester,
  });

const findMatchingSubmission = ({
  submissions,
  faculty,
  facultyId,
  academicYear,
  semester,
  className,
  subject,
  assessmentType,
  ignoreAssessmentType = false,
}) =>
  submissions.find((submission) => {
    const classMatch = normalizeId(submission.className) === normalizeId(className);
    const subjectMatch = normalizeId(submission.subject) === normalizeId(subject);
    const submissionTypeRaw = safeText(
      submission.assessmentType ||
        submission?.raw?.assessment_type ||
        submission?.raw?.submission_type ||
        submission?.raw?.component ||
        submission?.raw?.type
    );
    const typeMatch = ignoreAssessmentType
      ? true
      : !submissionTypeRaw ||
        normalizeAssessmentType(submissionTypeRaw) === normalizeAssessmentType(assessmentType);
    if (!classMatch || !subjectMatch || !typeMatch) return false;

    if (academicYear && normalizeId(submission.academicYear) !== normalizeId(academicYear)) {
      return false;
    }
    if (
      semester &&
      normalizeId(normalizeSemester(submission.semester)) !== normalizeId(normalizeSemester(semester))
    ) {
      return false;
    }

    if (facultyId && safeText(submission.facultyId)) {
      return safeText(submission.facultyId) === safeText(facultyId);
    }
    if (faculty && safeText(submission.faculty)) {
      return normalizeId(submission.faculty) === normalizeId(faculty);
    }
    return true;
  }) || null;

const ensureAcademicPeriod = async ({ academicYear, semester }) => {
  const targetYear = safeText(academicYear) || getCurrentAcademicYear();
  const targetSemester = normalizeSemester(semester) || SEMESTER_OPTIONS[0];

  let periods = [];
  try {
    periods = await readRows("academic_periods", { allowRlsBlock: true });
  } catch {
    return { id: "", academicYear: targetYear, semester: targetSemester };
  }
  const existing = periods.find(
    (row) =>
      normalizeId(safeText(row?.academic_year || row?.year || row?.academicYear)) ===
        normalizeId(targetYear) &&
      normalizeId(normalizeSemester(row?.semester || row?.term)) === normalizeId(targetSemester)
  );

  if (existing) {
    return {
      id: safeText(existing?.id),
      academicYear: targetYear,
      semester: targetSemester,
    };
  }

  const payloads = [
    { academic_year: targetYear, semester: targetSemester, is_active: false },
    { academic_year: targetYear, semester: targetSemester },
    { year: targetYear, semester: targetSemester },
    { academic_year: targetYear, term: targetSemester },
  ];

  for (const payload of payloads) {
    const { data, error } = await supabase.from("academic_periods").insert([payload]).select("*").limit(1);
    if (!error) {
      const row = Array.isArray(data) ? data[0] : null;
      return {
        id: safeText(row?.id),
        academicYear: targetYear,
        semester: targetSemester,
      };
    }

    if (isMissingRelation(error)) {
      return { id: "", academicYear: targetYear, semester: targetSemester };
    }
    if (isRlsViolation(error)) {
      return { id: "", academicYear: targetYear, semester: targetSemester };
    }
    if (isMissingColumn(error)) continue;
    if (String(error?.message || "").toLowerCase().includes("duplicate")) {
      return { id: "", academicYear: targetYear, semester: targetSemester };
    }

    // For custom no-auth setups, period linking is optional.
    // We can continue using academic_year + semester without period_id.
    continue;
  }

  return { id: "", academicYear: targetYear, semester: targetSemester };
};

const updateSubmissionStatusToSubmitted = async ({
  submissionId,
  teacherId,
  teacherName,
  teacherStaffId,
  now,
}) => {
  const payloads = [
    {
      status: "submitted",
      submitted_at: now,
      updated_at: now,
      review_comment: "",
      reviewed_at: null,
      teacher_id: teacherId || null,
      teacher_name: teacherName || null,
      teacher_staff_id: teacherStaffId || null,
    },
    {
      status: "submitted",
      submitted_at: now,
      updated_at: now,
      admin_note: "",
      teacher_id: teacherId || null,
      teacher_name: teacherName || null,
      teacher_staff_id: teacherStaffId || null,
    },
    {
      status: "submitted",
      submitted_at: now,
      teacher_id: teacherId || null,
      teacher_name: teacherName || null,
      teacher_staff_id: teacherStaffId || null,
    },
    {
      status: "submitted",
    },
  ];

  for (const payload of payloads) {
    const { error } = await supabase.from("result_submissions").update(payload).eq("id", submissionId);
    if (!error) return;
    if (isMissingColumn(error)) continue;
    throw toFriendlyResultsError(error, "result_submissions");
  }

  throw new Error("Unable to update submission status. Check result_submissions columns.");
};

const syncSubmissionScopeFields = async ({
  submissionId,
  faculty = "",
  facultyId = "",
  department = "",
  departmentId = "",
  className = "",
  subject = "",
  subjectId = "",
  academicYear = "",
  semester = "",
  periodId = "",
}) => {
  if (!submissionId) return;

  const numericFacultyId = parseNumericId(facultyId);
  const numericDepartmentId = parseNumericId(departmentId);
  const numericSubjectId = parseNumericId(subjectId);
  const numericPeriodId = parseNumericId(periodId);

  const payloads = [
    {
      faculty_id: numericFacultyId || safeText(facultyId) || null,
      department_id: numericDepartmentId || safeText(departmentId) || null,
      subject_id: numericSubjectId || safeText(subjectId) || null,
      class_name: className || null,
      subject: subject || null,
      academic_year: academicYear || null,
      semester: normalizeSemester(semester) || null,
      academic_period_id: numericPeriodId || safeText(periodId) || null,
      updated_at: toIsoNow(),
    },
    {
      faculty_id: numericFacultyId || safeText(facultyId) || null,
      department_id: numericDepartmentId || safeText(departmentId) || null,
      subject_id: numericSubjectId || safeText(subjectId) || null,
      class_name: className || null,
      subject_name: subject || null,
      year: academicYear || null,
      term: normalizeSemester(semester) || null,
      period_id: numericPeriodId || safeText(periodId) || null,
      updated_at: toIsoNow(),
    },
    {
      faculty: faculty || null,
      department: department || null,
      class_name: className || null,
      subject: subject || null,
      academic_year: academicYear || null,
      semester: normalizeSemester(semester) || null,
      updated_at: toIsoNow(),
    },
    {
      faculty: faculty || null,
      department: department || null,
      class: className || null,
      subject_name: subject || null,
      year: academicYear || null,
      term: normalizeSemester(semester) || null,
      updated_at: toIsoNow(),
    },
  ];

  for (const payload of payloads) {
    const { error } = await supabase.from("result_submissions").update(payload).eq("id", submissionId);
    if (!error) return;
    if (isMissingColumn(error)) continue;
    if (isRlsViolation(error)) return;
  }
};

const insertSubmissionRecord = async ({
  faculty,
  facultyId,
  department,
  departmentId,
  className,
  subject,
  subjectId,
  academicYear,
  semester,
  assessmentType,
  teacherId,
  teacherName,
  teacherStaffId,
  periodId,
  now,
}) => {
  const numericFacultyId = parseNumericId(facultyId);
  const numericDepartmentId = parseNumericId(departmentId);
  const numericSubjectId = parseNumericId(subjectId);
  const numericPeriodId = parseNumericId(periodId);
  const normalizedSemester = normalizeSemester(semester);
  const type = normalizeAssessmentType(assessmentType);
  const resolvedFacultyId = numericFacultyId || safeText(facultyId) || null;
  const resolvedDepartmentId = numericDepartmentId || safeText(departmentId) || null;
  const resolvedSubjectId = numericSubjectId || safeText(subjectId) || null;
  const resolvedPeriodId = numericPeriodId || safeText(periodId) || null;
  const resolvedTeacherId = safeText(teacherId) || null;
  const resolvedTeacherName = safeText(teacherName) || "Teacher";
  const resolvedTeacherStaffId = safeText(teacherStaffId) || "";

  const payloads = [
    {
      faculty,
      department,
      class_name: className,
      subject,
      academic_year: academicYear,
      semester: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      review_comment: "",
      submitted_at: now,
      updated_at: now,
    },
    {
      faculty_id: resolvedFacultyId,
      department_id: resolvedDepartmentId,
      class_name: className,
      subject_id: resolvedSubjectId,
      subject,
      academic_period_id: resolvedPeriodId,
      academic_year: academicYear,
      semester: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
    {
      faculty_id: resolvedFacultyId,
      department_id: resolvedDepartmentId,
      class_name: className,
      subject_id: resolvedSubjectId,
      period_id: resolvedPeriodId,
      academic_year: academicYear,
      semester: normalizedSemester,
      submission_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty_id: resolvedFacultyId,
      department_id: resolvedDepartmentId,
      class_name: className,
      subject_id: resolvedSubjectId,
      period_id: resolvedPeriodId,
      academic_year: academicYear,
      semester: normalizedSemester,
      component: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty_id: resolvedFacultyId,
      department_id: resolvedDepartmentId,
      class_name: className,
      subject_id: resolvedSubjectId,
      academic_year: academicYear,
      semester: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty_id: resolvedFacultyId,
      department_id: resolvedDepartmentId,
      class_name: className,
      course_id: resolvedSubjectId,
      academic_year: academicYear,
      semester: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty,
      department,
      class: className,
      subject,
      academic_year: academicYear,
      semester: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty,
      department,
      class_name: className,
      subject_name: subject,
      academic_year: academicYear,
      semester: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty,
      department,
      class_name: className,
      subject,
      year: academicYear,
      semester: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
    {
      faculty,
      department,
      class_name: className,
      subject,
      year: academicYear,
      term: normalizedSemester,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
    {
      faculty_id: resolvedFacultyId,
      department_id: resolvedDepartmentId,
      class_name: className,
      subject_id: resolvedSubjectId,
      subject,
      academic_period_id: resolvedPeriodId,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
    {
      faculty_id: resolvedFacultyId,
      department_id: resolvedDepartmentId,
      class_name: className,
      subject_id: resolvedSubjectId,
      subject,
      period_id: resolvedPeriodId,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
    {
      faculty,
      department,
      class_name: className,
      subject,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
      updated_at: now,
    },
    {
      class_name: className,
      subject,
      assessment_type: type,
      teacher_id: resolvedTeacherId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty,
      department,
      class_name: className,
      subject,
      year: academicYear,
      term: normalizedSemester,
      type,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty,
      department,
      class_name: className,
      subject,
      year: academicYear,
      semester: normalizedSemester,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
    },
    {
      faculty,
      department,
      class_name: className,
      subject,
      teacher_id: resolvedTeacherId,
      teacher_name: resolvedTeacherName,
      teacher_staff_id: resolvedTeacherStaffId,
      status: "submitted",
      submitted_at: now,
    },
    {
      class_name: className,
      subject,
      teacher_id: resolvedTeacherId,
      status: "submitted",
      submitted_at: now,
    },
  ];

  const uniquePayloads = dedupeBy(payloads, (payload) => JSON.stringify(payload));

  let lastError = null;
  for (const payload of uniquePayloads) {
    let candidatePayload = { ...payload };
    let adaptedForMissingColumns = false;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const { data, error } = await supabase
        .from("result_submissions")
        .insert([candidatePayload])
        .select("*")
        .limit(1);

      if (!error) {
        const inserted = Array.isArray(data) ? data[0] : null;
        const id = safeText(inserted?.id);
        if (id) return id;
        // Insert may succeed but select can be restricted; caller can refetch by unique keys.
        return "";
      }

      if (isMissingColumn(error)) {
        lastError = error;
        const missingColumn = extractMissingColumnName(error);
        if (!missingColumn) break;
        if (!Object.prototype.hasOwnProperty.call(candidatePayload, missingColumn)) break;

        const nextPayload = { ...candidatePayload };
        delete nextPayload[missingColumn];
        if (Object.keys(nextPayload).length === Object.keys(candidatePayload).length) break;

        candidatePayload = nextPayload;
        adaptedForMissingColumns = true;
        continue;
      }

      const message = String(error?.message || "").toLowerCase();
      if (message.includes("duplicate")) {
        return "";
      }

      if (
        error?.code === "22P02" || // invalid text representation / type cast
        error?.code === "42804" || // datatype mismatch
        error?.code === "23502" || // not-null violation
        error?.code === "23503" || // foreign key violation
        error?.code === "23514" // check violation
      ) {
        lastError = error;
        break;
      }

      throw toFriendlyResultsError(error, "result_submissions");
    }

    if (adaptedForMissingColumns) {
      continue;
    }
  }

  if (lastError) {
    const details = [lastError?.message, lastError?.details, lastError?.hint]
      .filter(Boolean)
      .join(" | ");
    throw new Error(
      details
        ? `Unable to create result submission. ${details}`
        : "Unable to create result submission. Check result_submissions columns and required fields."
    );
  }

  return "";
};

const resolveEntriesTable = async () => {
  const candidateTables = preferredEntryTable
    ? [preferredEntryTable]
    : ENTRY_TABLE_CANDIDATES.filter((table) => !MISSING_ENTRY_TABLES.has(table));

  for (const table of candidateTables.length ? candidateTables : ENTRY_TABLE_CANDIDATES) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (!error) {
      preferredEntryTable = table;
      return table;
    }
    if (isMissingRelation(error)) {
      MISSING_ENTRY_TABLES.add(table);
      if (preferredEntryTable === table) preferredEntryTable = "";
      continue;
    }
    throw toFriendlyResultsError(error, table);
  }
  throw new Error("Neither result_entries nor result_submission_marks table exists.");
};

const deleteEntriesForSubmission = async (table, submissionId) => {
  let deletedAnyPath = false;
  let checkedAnyPath = false;

  for (const fk of ENTRY_FK_CANDIDATES) {
    const { error } = await supabase.from(table).delete().eq(fk, submissionId);
    if (!error) {
      deletedAnyPath = true;
      checkedAnyPath = true;
      continue;
    }
    if (isMissingColumn(error)) continue;
    throw toFriendlyResultsError(error, table);
  }

  if (checkedAnyPath || deletedAnyPath) return;
  throw new Error(`Unable to clear old entries in ${table}. Missing submission foreign key.`);
};

const insertEntriesRows = async ({
  table,
  submissionId,
  marks,
  assessmentType,
  faculty,
  department,
  facultyId = "",
  departmentId = "",
  className = "",
  subject = "",
}) => {
  const type = normalizeAssessmentType(assessmentType);
  const normalizedFacultyId = safeText(facultyId);
  const normalizedDepartmentId = safeText(departmentId);

  const rows = dedupeBy(
    (marks || [])
      .map((row) => {
        const mark = clampMark(row?.mark, type);
        if (mark === null) return null;
        return {
          studentId: safeText(row?.studentId),
          matricule: safeText(row?.matricule),
          studentName: safeText(row?.name || row?.studentName || row?.full_name),
          program: safeText(row?.program),
          level: safeText(row?.level),
          facultyId: safeText(row?.facultyId || row?.faculty_id),
          departmentId: safeText(row?.departmentId || row?.department_id),
          mark,
        };
      })
      .filter((row) => row && row.matricule && row.studentName),
    (row) => normalizeId(row.matricule || row.studentId)
  );

  if (rows.length === 0) {
    throw new Error("No valid student marks to save.");
  }

  const payloadSets = [
    rows.map((row) => ({
      submission_id: submissionId,
      submission_ref: submissionId,
      report_id: submissionId,
      submission: submissionId,
      result_submission: submissionId,
      result_submission_id: submissionId,
      student_id: parseNumericId(row.studentId) || row.studentId || null,
      student_matricule: row.matricule,
      student_name: row.studentName,
      faculty,
      department,
      faculty_id: row.facultyId || normalizedFacultyId || null,
      department_id: row.departmentId || normalizedDepartmentId || null,
      class_name: className || null,
      subject,
      program: row.program,
      level: row.level || null,
      mark: row.mark,
      assessment_type: type,
    })),
    rows.map((row) => ({
      submission_id: submissionId,
      submission_ref: submissionId,
      report_id: submissionId,
      submission: submissionId,
      result_submission: submissionId,
      result_submission_id: submissionId,
      student_id: parseNumericId(row.studentId) || row.studentId || null,
      matricule: row.matricule,
      student_name: row.studentName,
      faculty,
      department,
      faculty_id: row.facultyId || normalizedFacultyId || null,
      department_id: row.departmentId || normalizedDepartmentId || null,
      class_name: className || null,
      subject,
      program: row.program,
      level: row.level || null,
      score: row.mark,
      assessment_type: type,
    })),
    rows.map((row) => ({
      submission_id: submissionId,
      submission_ref: submissionId,
      report_id: submissionId,
      submission: submissionId,
      result_submission: submissionId,
      result_submission_id: submissionId,
      student_id: parseNumericId(row.studentId) || row.studentId || null,
      matricule: row.matricule,
      student_name: row.studentName,
      faculty,
      department,
      faculty_id: row.facultyId || normalizedFacultyId || null,
      department_id: row.departmentId || normalizedDepartmentId || null,
      class_name: className || null,
      subject,
      program: row.program,
      level: row.level || null,
      ca_score: type === "CA" ? row.mark : null,
      exam_score: type === "EXAM" ? row.mark : null,
      assessment_type: type,
    })),
    rows.map((row) => ({
      result_submission_id: submissionId,
      submission_id: submissionId,
      submission_ref: submissionId,
      report_id: submissionId,
      submission: submissionId,
      result_submission: submissionId,
      student_id: parseNumericId(row.studentId) || row.studentId || null,
      matricule: row.matricule,
      student_name: row.studentName,
      faculty,
      department,
      faculty_id: row.facultyId || normalizedFacultyId || null,
      department_id: row.departmentId || normalizedDepartmentId || null,
      class_name: className || null,
      subject,
      ca_score: type === "CA" ? row.mark : null,
      exam_score: type === "EXAM" ? row.mark : null,
      assessment_type: type,
    })),
    rows.map((row) => ({
      result_submission_id: submissionId,
      submission_id: submissionId,
      submission_ref: submissionId,
      report_id: submissionId,
      submission: submissionId,
      result_submission: submissionId,
      student_matricule: row.matricule,
      student_name: row.studentName,
      mark: row.mark,
    })),
    rows.map((row) => ({
      submission_id: submissionId,
      submission_ref: submissionId,
      report_id: submissionId,
      submission: submissionId,
      result_submission: submissionId,
      result_submission_id: submissionId,
      student_matricule: row.matricule,
      student_name: row.studentName,
      mark: row.mark,
    })),
    rows.map((row) => ({
      submission_id: submissionId,
      submission_ref: submissionId,
      report_id: submissionId,
      submission: submissionId,
      result_submission: submissionId,
      result_submission_id: submissionId,
      matricule: row.matricule,
      student_name: row.studentName,
      score: row.mark,
    })),
  ];

  const withRequiredFallbacks = (rowsInput, requiredColumn) => {
    let applied = false;

    const nextRows = rowsInput.map((entry) => {
      const row = { ...entry };
      const current = row[requiredColumn];
      if (current !== undefined && current !== null && safeText(current) !== "") {
        return row;
      }

      let fallback;
      switch (requiredColumn) {
        case "submission_id":
        case "result_submission_id":
          fallback = submissionId;
          break;
        case "student_matricule":
        case "matricule":
          fallback = row.student_matricule || row.matricule || "UNKNOWN";
          break;
        case "student_name":
        case "full_name":
        case "name":
          fallback = row.student_name || row.full_name || row.name || "Student";
          break;
        case "mark":
        case "score": {
          const parsed = parseScore(row.mark ?? row.score ?? row.ca_score ?? row.exam_score);
          fallback = parsed === null ? undefined : parsed;
          break;
        }
        case "ca_score": {
          const parsed = parseScore(row.mark ?? row.score ?? row.ca_score);
          fallback = type === "CA" ? (parsed === null ? undefined : parsed) : 0;
          break;
        }
        case "exam_score": {
          const parsed = parseScore(row.mark ?? row.score ?? row.exam_score);
          fallback = type === "EXAM" ? (parsed === null ? undefined : parsed) : 0;
          break;
        }
        case "assessment_type":
        case "type":
        case "component":
          fallback = type;
          break;
        case "faculty":
          fallback = faculty || "Unknown";
          break;
        case "department":
          fallback = department || "Unknown";
          break;
        case "faculty_id":
          fallback = row.faculty_id || normalizedFacultyId || null;
          break;
        case "department_id":
          fallback = row.department_id || normalizedDepartmentId || null;
          break;
        case "program":
          fallback = row.program || "General";
          break;
        case "level":
          fallback = row.level || "N/A";
          break;
        case "class_name":
        case "class":
          fallback = className || "Class";
          break;
        case "subject":
        case "subject_name":
          fallback = subject || "Subject";
          break;
        default:
          fallback = undefined;
      }

      if (
        fallback === undefined ||
        fallback === null ||
        (typeof fallback === "string" && safeText(fallback) === "")
      ) {
        return row;
      }

      row[requiredColumn] = fallback;
      applied = true;
      return row;
    });

    return { rows: nextRows, applied };
  };

  let lastError = null;
  for (const payloadRows of payloadSets) {
    let candidateRows = payloadRows.map((row) => ({ ...row }));

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const { error } = await supabase.from(table).insert(candidateRows);
      if (!error) return;

      if (isStudentIdTypeMismatch(error)) {
        candidateRows = candidateRows.map((row) => {
          const next = { ...row };
          delete next.student_id;
          return next;
        });
        lastError = error;
        continue;
      }

      if (isMissingColumn(error)) {
        lastError = error;
        const missingColumn = extractMissingColumnName(error);
        if (!missingColumn) break;

        const hasColumn = candidateRows.some((row) =>
          Object.prototype.hasOwnProperty.call(row, missingColumn)
        );
        if (!hasColumn) break;

        candidateRows = candidateRows.map((row) => {
          const next = { ...row };
          delete next[missingColumn];
          return next;
        });
        continue;
      }

      if (error?.code === "23502") {
        lastError = error;
        const requiredColumn = extractNotNullColumnName(error);
        if (!requiredColumn) break;
        const { rows: nextRows, applied } = withRequiredFallbacks(candidateRows, requiredColumn);
        if (!applied) break;
        candidateRows = nextRows;
        continue;
      }

      if (
        error?.code === "22P02" || // invalid text representation / type cast
        error?.code === "42804" || // datatype mismatch
        error?.code === "23503" || // foreign key violation
        error?.code === "23514" // check violation
      ) {
        lastError = error;
        break;
      }

      throw toFriendlyResultsError(error, table);
    }
  }

  if (lastError) {
    const details = [lastError?.message, lastError?.details, lastError?.hint]
      .filter(Boolean)
      .join(" | ");
    throw new Error(
      details
        ? `Unable to insert marks. ${details}`
        : "Unable to insert marks. Check result_entries columns (submission_id, matricule/student_name, score fields)."
    );
  }
};

export const saveResultSubmission = async ({
  faculty = "",
  facultyId = "",
  department = "",
  departmentId = "",
  className = "",
  subject = "",
  subjectId = "",
  academicYear = "",
  semester = "",
  assessmentType = "CA",
  teacherId = "",
  teacherName = "",
  teacherStaffId = "",
  marks = [],
}) => {
  ensureBackend();

  const now = toIsoNow();
  const type = normalizeAssessmentType(assessmentType);
  const resolvedForeignKeys = await resolveSubmissionForeignKeys({
    facultyId,
    faculty,
    departmentId,
    department,
    subjectId,
    subject,
  });
  const effectiveFacultyId = safeText(resolvedForeignKeys?.facultyId || facultyId);
  const effectiveDepartmentId = safeText(resolvedForeignKeys?.departmentId || departmentId);
  const effectiveSubjectId = safeText(resolvedForeignKeys?.subjectId || subjectId);
  const period = await ensureAcademicPeriod({ academicYear, semester });

  const submissions = await fetchMappedSubmissions({
    faculty,
    facultyId: effectiveFacultyId,
    academicYear: period.academicYear,
    semester: period.semester,
  });

  const existing = findMatchingSubmission({
    submissions,
    faculty,
    facultyId: effectiveFacultyId,
    academicYear: period.academicYear,
    semester: period.semester,
    className,
    subject,
    assessmentType: type,
  });

  let submissionId = existing?.id || "";
  let statusSyncedToSubmitted = false;

  if (submissionId) {
    await updateSubmissionStatusToSubmitted({
      submissionId,
      teacherId,
      teacherName,
      teacherStaffId,
      now,
    });
    statusSyncedToSubmitted = true;
  } else {
    submissionId = await insertSubmissionRecord({
      faculty,
      facultyId: effectiveFacultyId,
      department,
      departmentId: effectiveDepartmentId,
      className,
      subject,
      subjectId: effectiveSubjectId,
      academicYear: period.academicYear,
      semester: period.semester,
      assessmentType: type,
      teacherId,
      teacherName,
      teacherStaffId,
      periodId: period.id,
      now,
    });

    if (!submissionId) {
      const refreshed = await fetchMappedSubmissions({
        faculty,
        facultyId: effectiveFacultyId,
        academicYear: period.academicYear,
        semester: period.semester,
      });
      submissionId =
        findMatchingSubmission({
          submissions: refreshed,
          faculty,
          facultyId: effectiveFacultyId,
          academicYear: period.academicYear,
          semester: period.semester,
          className,
          subject,
          assessmentType: type,
        })?.id || "";

      if (!submissionId) {
        submissionId =
          findMatchingSubmission({
            submissions: refreshed,
            faculty,
            facultyId: effectiveFacultyId,
            academicYear: period.academicYear,
            semester: period.semester,
            className,
            subject,
            assessmentType: type,
            ignoreAssessmentType: true,
          })?.id || "";
      }
    }
  }

  if (!submissionId) {
    throw new Error("Unable to resolve submission row. Check unique constraints in result_submissions.");
  }

  await syncSubmissionScopeFields({
    submissionId,
    faculty,
    facultyId: effectiveFacultyId,
    department,
    departmentId: effectiveDepartmentId,
    className,
    subject,
    subjectId: effectiveSubjectId,
    academicYear: period.academicYear,
    semester: period.semester,
    periodId: period.id,
  });

  // If we resolved an existing row after insert fallback (for example duplicate keys),
  // ensure admin sees it as a fresh teacher submission.
  if (!statusSyncedToSubmitted) {
    await updateSubmissionStatusToSubmitted({
      submissionId,
      teacherId,
      teacherName,
      teacherStaffId,
      now,
    });
  }

  const entriesTable = await resolveEntriesTable();
  await deleteEntriesForSubmission(entriesTable, submissionId);
  await insertEntriesRows({
    table: entriesTable,
    submissionId,
    marks,
    assessmentType: type,
    faculty,
    department,
    facultyId: effectiveFacultyId,
    departmentId: effectiveDepartmentId,
    className,
    subject,
  });

  const latest = await fetchMappedSubmissions({
    faculty,
    facultyId: effectiveFacultyId,
    academicYear: period.academicYear,
    semester: period.semester,
  });

  return latest.find((item) => item.id === submissionId) || null;
};

export const reviewResultSubmission = async ({
  submissionId,
  status,
  reviewerName = "",
  comment = "",
}) => {
  ensureBackend();
  const now = toIsoNow();
  const targetStatus = normalizeStatus(status) === "approved" ? "approved" : "rejected";

  const payloads = [
    {
      status: targetStatus,
      review_comment: safeText(comment),
      reviewed_at: now,
      updated_at: now,
    },
    {
      status: targetStatus,
      admin_note: safeText(comment),
      reviewed_at: now,
      updated_at: now,
    },
    {
      status: targetStatus,
      comment: safeText(comment),
      reviewed_at: now,
    },
    { status: targetStatus },
  ];

  for (const payload of payloads) {
    const { error } = await supabase.from("result_submissions").update(payload).eq("id", submissionId);
    if (!error) return { id: submissionId, status: targetStatus, reviewerName, comment };
    if (isMissingColumn(error)) continue;
    throw toFriendlyResultsError(error, "result_submissions");
  }

  throw new Error("Unable to review submission. Check review columns in result_submissions.");
};

const mapPublicationRow = ({ row, refs }) => {
  const periodId = safeText(row?.academic_period_id || row?.period_id || row?.periodId);
  const linkedPeriod = periodId ? refs.periodById.get(periodId) : null;

  let facultyId = safeText(row?.faculty_id || row?.facultyId);
  const explicitFaculty = safeText(row?.faculty || row?.faculty_name);
  if (!facultyId && explicitFaculty) {
    facultyId = refs.facultyMaps.byName.get(normalizeId(explicitFaculty))?.id || "";
  }

  return {
    id: safeText(row?.id),
    facultyId,
    faculty: explicitFaculty || refs.facultyMaps.byId.get(facultyId)?.name || "",
    academicYear:
      safeText(row?.academic_year || row?.year || row?.academicYear) ||
      linkedPeriod?.academicYear ||
      "",
    semester: normalizeSemester(row?.semester || row?.term) || linkedPeriod?.semester || "",
    status: normalizeStatus(row?.status || "published"),
    publishedAt: row?.published_at || row?.created_at || null,
    raw: row,
  };
};

const isPublicationMatch = ({
  publication,
  faculty = "",
  facultyId = "",
  academicYear = "",
  semester = "",
}) => {
  if (safeText(facultyId) && safeText(publication.facultyId)) {
    if (safeText(publication.facultyId) !== safeText(facultyId)) return false;
  } else if (safeText(faculty) && safeText(publication.faculty)) {
    if (normalizeId(publication.faculty) !== normalizeId(faculty)) return false;
  }

  if (academicYear && safeText(publication.academicYear)) {
    if (normalizeId(publication.academicYear) !== normalizeId(academicYear)) return false;
  }

  if (semester && safeText(publication.semester)) {
    if (
      normalizeId(normalizeSemester(publication.semester)) !==
      normalizeId(normalizeSemester(semester))
    ) {
      return false;
    }
  }

  return true;
};

export const fetchPublishedPeriodsForFaculty = async ({ faculty = "", facultyId = "" } = {}) => {
  ensureBackend();
  const refs = await buildResultRefs();
  const publicationRows = await readRows("result_publications");
  const mapped = publicationRows
    .map((row) => mapPublicationRow({ row, refs }))
    .filter((row) => row.status === "published")
    .filter((row) => isPublicationMatch({ publication: row, faculty, facultyId }));

  const deduped = dedupeBy(
    mapped,
    (row) =>
      `${normalizeId(row.facultyId || row.faculty)}__${normalizeId(row.academicYear)}__${normalizeId(
        normalizeSemester(row.semester)
      )}`
  );

  return deduped.sort((a, b) => {
    const yearA = Number(String(a.academicYear || "").slice(0, 4)) || 0;
    const yearB = Number(String(b.academicYear || "").slice(0, 4)) || 0;
    if (yearA !== yearB) return yearB - yearA;
    return normalizeId(a.semester) < normalizeId(b.semester) ? 1 : -1;
  });
};

export const publishFacultyResults = async ({
  faculty = "",
  facultyId = "",
  academicYear = "",
  semester = "",
  adminName = "",
}) => {
  ensureBackend();
  const now = toIsoNow();
  const period = await ensureAcademicPeriod({ academicYear, semester });
  const refs = await buildResultRefs();

  const publicationRows = await readRows("result_publications");
  const mappedPublications = publicationRows.map((row) => mapPublicationRow({ row, refs }));
  const existing = mappedPublications.find((row) =>
    isPublicationMatch({
      publication: row,
      faculty,
      facultyId,
      academicYear: period.academicYear,
      semester: period.semester,
    })
  );

  if (existing?.id) {
    const updatePayloads = [
      { status: "published", published_at: now, updated_at: now },
      { status: "published", published_at: now },
      { status: "published" },
    ];

    for (const payload of updatePayloads) {
      const { error } = await supabase.from("result_publications").update(payload).eq("id", existing.id);
      if (!error) return { ...existing, status: "published", publishedAt: now, adminName };
      if (isMissingColumn(error)) continue;
      throw toFriendlyResultsError(error, "result_publications");
    }
  }

  const numericFacultyId = parseNumericId(facultyId);
  const numericPeriodId = parseNumericId(period.id);
  const payloads = [
    {
      faculty,
      academic_year: period.academicYear,
      semester: period.semester,
      status: "published",
      published_at: now,
    },
    {
      faculty_id: numericFacultyId,
      academic_period_id: numericPeriodId || period.id || null,
      academic_year: period.academicYear,
      semester: period.semester,
      status: "published",
      published_at: now,
    },
    {
      faculty_id: numericFacultyId,
      period_id: numericPeriodId || period.id || null,
      status: "published",
      published_at: now,
    },
  ];

  for (const payload of payloads) {
    const { data, error } = await supabase
      .from("result_publications")
      .insert([payload])
      .select("*")
      .limit(1);

    if (!error) {
      const row = Array.isArray(data) ? data[0] : null;
      return {
        id: safeText(row?.id),
        facultyId: safeText(row?.faculty_id || row?.facultyId) || safeText(facultyId),
        faculty: safeText(row?.faculty) || faculty,
        academicYear: period.academicYear,
        semester: period.semester,
        status: "published",
        publishedAt: row?.published_at || now,
        adminName,
      };
    }

    if (isMissingColumn(error)) continue;
    throw toFriendlyResultsError(error, "result_publications");
  }

  throw new Error("Unable to publish faculty results. Check result_publications columns.");
};

const gradeFromTotal = (total) => {
  if (total >= 70) return "A";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= 45) return "D";
  if (total >= 40) return "E";
  return "F";
};

const remarkFromGrade = (grade) => {
  if (grade === "A") return "Excellent";
  if (grade === "B") return "Very Good";
  if (grade === "C") return "Good";
  if (grade === "D" || grade === "E") return "Pass";
  return "Fail";
};

export const fetchStudentPublishedResults = async ({
  faculty = "",
  facultyId = "",
  matricule = "",
  studentId = "",
  academicYear = "",
  semester = "",
}) => {
  ensureBackend();
  const normalizedMatricule = normalizeId(matricule);
  const normalizedStudentId = safeText(studentId);

  const publishedPeriods = await fetchPublishedPeriodsForFaculty({ faculty, facultyId });
  const publication =
    publishedPeriods.find(
      (period) =>
        normalizeId(period.academicYear) === normalizeId(academicYear) &&
        normalizeId(normalizeSemester(period.semester)) === normalizeId(normalizeSemester(semester))
    ) || null;

  if (!publication) {
    return { published: false, publication: null, rows: [] };
  }

  const approvedSubmissions = (await getSubmissionsForFacultyPeriod({
    faculty,
    facultyId,
    academicYear,
    semester,
  })).filter((submission) => normalizeStatus(submission.status) === "approved");

  const grouped = new Map();
  for (const submission of approvedSubmissions) {
    const pairKey = `${normalizeId(submission.className)}__${normalizeId(submission.subject)}`;
    if (!grouped.has(pairKey)) {
      grouped.set(pairKey, {
        className: submission.className,
        subject: submission.subject,
        academicYear: submission.academicYear,
        semester: submission.semester,
        students: new Map(),
      });
    }

    const target = grouped.get(pairKey);
    for (const markRow of submission.marks || []) {
      const key = normalizeId(markRow.matricule || markRow.studentId);
      if (!key) continue;
      if (!target.students.has(key)) {
        target.students.set(key, {
          studentId: safeText(markRow.studentId),
          matricule: safeText(markRow.matricule),
          studentName: safeText(markRow.name),
          ca: null,
          exam: null,
        });
      }

      const student = target.students.get(key);
      if (normalizeAssessmentType(submission.assessmentType) === "CA") {
        student.ca = parseScore(markRow.mark);
      } else {
        student.exam = parseScore(markRow.mark);
      }
    }
  }

  const rows = [];
  for (const course of grouped.values()) {
    for (const studentRow of course.students.values()) {
      const isTargetStudent =
        (normalizedMatricule && normalizeId(studentRow.matricule) === normalizedMatricule) ||
        (normalizedStudentId && safeText(studentRow.studentId) === normalizedStudentId);
      if (!isTargetStudent) continue;

      const total =
        Number.isFinite(studentRow.ca) && Number.isFinite(studentRow.exam)
          ? Number(studentRow.ca) + Number(studentRow.exam)
          : null;
      const grade = total === null ? "" : gradeFromTotal(total);
      const remark = total === null ? "Incomplete" : remarkFromGrade(grade);

      rows.push({
        className: course.className,
        subject: course.subject,
        academicYear: course.academicYear,
        semester: course.semester,
        studentId: studentRow.studentId,
        matricule: studentRow.matricule,
        studentName: studentRow.studentName,
        ca: studentRow.ca,
        exam: studentRow.exam,
        total,
        grade,
        remark,
      });
    }
  }

  rows.sort((a, b) => {
    if (a.className !== b.className) return a.className.localeCompare(b.className);
    return a.subject.localeCompare(b.subject);
  });

  return {
    published: true,
    publication,
    rows,
  };
};

export const fetchTeacherResultContext = async ({
  teacherUserId = "",
  staffId = "",
  email = "",
} = {}) => {
  ensureBackend();
  const refs = await buildResultRefs();
  const assignmentRows = await readRows("teacher_assignments");
  const studentRows = await readRows("students");

  const teacherList = refs.teacherList;
  const targetId = safeText(teacherUserId);
  const targetStaffId = normalizeId(staffId);
  const targetEmail = normalizeId(email);

  const teacher =
    teacherList.find((row) => {
      const byId = targetId && safeText(row.id) === targetId;
      const byStaff = targetStaffId && normalizeId(row.staffId) === targetStaffId;
      const byEmail = targetEmail && normalizeId(row.email) === targetEmail;
      return byId || byStaff || byEmail;
    }) || null;

  if (!teacher) {
    throw new Error("Teacher profile not found. Please sign in again.");
  }

  const teacherAssignments = dedupeBy(
    (assignmentRows || [])
      .filter((row) => safeText(row?.teacher_id || row?.teacherId) === safeText(teacher.id))
      .map((row) => mapAssignmentRow(row, refs.subjectById))
      .filter(Boolean),
    (row) => `${normalizeId(row.className)}__${normalizeId(row.subject)}`
  );

  const allStudents = (studentRows || []).map((row) =>
    mapStudentRow(row, refs.facultyMaps, refs.departmentMaps)
  );

  const students = allStudents.filter((student) => {
    if (teacher.facultyId && student.facultyId) {
      if (safeText(student.facultyId) !== safeText(teacher.facultyId)) return false;
    } else if (teacher.faculty && student.faculty) {
      if (normalizeId(student.faculty) !== normalizeId(teacher.faculty)) return false;
    }

    if (teacher.departmentId && student.departmentId) {
      return safeText(student.departmentId) === safeText(teacher.departmentId);
    }

    if (teacher.department && student.department) {
      return normalizeId(student.department) === normalizeId(teacher.department);
    }

    return true;
  });

  return {
    teacher,
    assignments: teacherAssignments,
    students,
  };
};

export const fetchAdminResultOverview = async ({ academicYear, semester }) => {
  ensureBackend();
  const refs = await buildResultRefs();
  const [submissionRows, publicationRows, assignmentRows] = await Promise.all([
    fetchMappedSubmissions({ academicYear, semester }),
    readRows("result_publications"),
    readRows("teacher_assignments"),
  ]);

  const mappedPublications = publicationRows.map((row) => mapPublicationRow({ row, refs }));

  const facultyFromTeachers = refs.teacherList
    .map((teacher) => ({ id: teacher.facultyId, name: teacher.faculty }))
    .filter((row) => row.name);
  const facultyFromSubmissions = submissionRows
    .map((row) => ({ id: row.facultyId, name: row.faculty }))
    .filter((row) => row.name);
  const facultyCandidates = [...refs.facultyMaps.list, ...facultyFromTeachers, ...facultyFromSubmissions];

  const faculties = dedupeBy(
    facultyCandidates,
    (row) => normalizeId(row.id || row.name)
  ).sort((a, b) => a.name.localeCompare(b.name));

  const assignmentByTeacher = new Map();
  for (const row of assignmentRows || []) {
    const teacherId = safeText(row?.teacher_id || row?.teacherId);
    const mapped = mapAssignmentRow(row, refs.subjectById);
    if (!teacherId || !mapped) continue;
    if (!assignmentByTeacher.has(teacherId)) assignmentByTeacher.set(teacherId, []);
    assignmentByTeacher.get(teacherId).push(mapped);
  }

  const summaries = faculties.map((facultyRow) => {
    const teachersInFaculty = refs.teacherList.filter((teacher) => {
      if (facultyRow.id && teacher.facultyId) {
        return safeText(teacher.facultyId) === safeText(facultyRow.id);
      }
      return normalizeId(teacher.faculty) === normalizeId(facultyRow.name);
    });

    const requiredPairs = dedupeBy(
      teachersInFaculty.flatMap((teacher) => assignmentByTeacher.get(teacher.id) || []),
      (item) => `${normalizeId(item.className)}__${normalizeId(item.subject)}`
    );

    const statusList = [];
    for (const pair of requiredPairs) {
      const ca = submissionRows.find(
        (row) =>
          filterSubmissionByScope({
            submission: row,
            faculty: facultyRow.name,
            facultyId: facultyRow.id,
            academicYear,
            semester,
          }) &&
          normalizeId(row.className) === normalizeId(pair.className) &&
          normalizeId(row.subject) === normalizeId(pair.subject) &&
          normalizeAssessmentType(row.assessmentType) === "CA"
      );
      const exam = submissionRows.find(
        (row) =>
          filterSubmissionByScope({
            submission: row,
            faculty: facultyRow.name,
            facultyId: facultyRow.id,
            academicYear,
            semester,
          }) &&
          normalizeId(row.className) === normalizeId(pair.className) &&
          normalizeId(row.subject) === normalizeId(pair.subject) &&
          normalizeAssessmentType(row.assessmentType) === "EXAM"
      );

      statusList.push(ca?.status || "missing");
      statusList.push(exam?.status || "missing");
    }

    const requiredComponents = requiredPairs.length * 2;
    const approvedComponents = statusList.filter((item) => item === "approved").length;
    const submittedComponents = statusList.filter((item) => item === "submitted").length;
    const rejectedComponents = statusList.filter((item) => item === "rejected").length;
    const missingComponents = statusList.filter((item) => item === "missing").length;
    const canPublish =
      requiredComponents > 0 && approvedComponents === requiredComponents && missingComponents === 0;

    const published = mappedPublications.some((publication) =>
      isPublicationMatch({
        publication,
        faculty: facultyRow.name,
        facultyId: facultyRow.id,
        academicYear,
        semester,
      })
    );

    return {
      faculty: facultyRow.name,
      facultyId: facultyRow.id || "",
      requiredPairs: requiredPairs.length,
      requiredComponents,
      approvedComponents,
      submittedComponents,
      rejectedComponents,
      missingComponents,
      canPublish,
      progressPercent:
        requiredComponents === 0
          ? 0
          : Math.round((approvedComponents / requiredComponents) * 100),
      published,
    };
  });

  return {
    faculties,
    summaries,
    submissions: submissionRows,
  };
};
