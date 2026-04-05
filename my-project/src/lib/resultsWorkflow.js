import {
  STUDENTS_STORAGE_KEY,
  TEACHERS_STORAGE_KEY,
  normalizeId,
  safeReadArray,
} from "./registrationData";

export const RESULT_SUBMISSIONS_STORAGE_KEY = "result_submissions_v1";
export const RESULT_PUBLICATIONS_STORAGE_KEY = "result_publications_v1";

export const SEMESTER_OPTIONS = ["Semester 1", "Semester 2"];

const MAX_BY_TYPE = {
  CA: 30,
  EXAM: 70,
};

const buildAcademicYear = (startYear) => `${startYear}/${startYear + 1}`;

export const getCurrentAcademicYear = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const startYear = month >= 9 ? year : year - 1;
  return buildAcademicYear(startYear);
};

export const getAcademicYearOptions = (count = 4) => {
  const first = Number(getCurrentAcademicYear().slice(0, 4));
  return Array.from({ length: count }, (_, index) => buildAcademicYear(first - index));
};

const safeWrite = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const normalizeAssessmentType = (value) =>
  String(value || "")
    .trim()
    .toUpperCase() === "CA"
    ? "CA"
    : "EXAM";

export const parseClassName = (className) => {
  const trimmed = String(className || "").trim();
  if (!trimmed) return { program: "", level: "" };

  const [program, level] = trimmed.split(" - ").map((part) => part?.trim() || "");
  if (program && level) return { program, level };
  return { program: trimmed, level: "" };
};

const buildCoursePairKey = ({ className, subject }) =>
  `${normalizeId(className)}__${normalizeId(subject)}`;

const buildSubmissionId = ({
  assessmentType,
  faculty,
  academicYear,
  semester,
  className,
  subject,
}) =>
  [
    normalizeAssessmentType(assessmentType),
    normalizeId(faculty),
    normalizeId(academicYear),
    normalizeId(semester),
    normalizeId(className),
    normalizeId(subject),
  ].join("__");

const buildPublicationId = ({ faculty, academicYear, semester }) =>
  [
    "pub",
    normalizeId(faculty),
    normalizeId(academicYear),
    normalizeId(semester),
  ].join("__");

const clampMark = (mark, assessmentType) => {
  const max = MAX_BY_TYPE[normalizeAssessmentType(assessmentType)];
  const n = Number(mark);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > max) return max;
  return n;
};

const dedupeBy = (items, toKey) => {
  const seen = new Set();
  const result = [];
  items.forEach((item) => {
    const key = toKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
};

export const readResultSubmissions = () =>
  safeReadArray(RESULT_SUBMISSIONS_STORAGE_KEY, []).filter(
    (item) => item && typeof item === "object"
  );

export const readResultPublications = () =>
  safeReadArray(RESULT_PUBLICATIONS_STORAGE_KEY, []).filter(
    (item) => item && typeof item === "object"
  );

export const getTeachersData = () => safeReadArray(TEACHERS_STORAGE_KEY, []);
export const getStudentsData = () => safeReadArray(STUDENTS_STORAGE_KEY, []);

export const findTeacherByUser = (userData) => {
  const teachers = getTeachersData();
  const targetStaffId = normalizeId(userData?.staffId);
  const targetEmail = normalizeId(userData?.email);
  const targetId = String(userData?.id ?? "");

  return (
    teachers.find((teacher) => {
      const byId = targetId && String(teacher.id ?? "") === targetId;
      const byStaffId = targetStaffId && normalizeId(teacher.staffId) === targetStaffId;
      const byEmail = targetEmail && normalizeId(teacher.email) === targetEmail;
      return byId || byStaffId || byEmail;
    }) || null
  );
};

export const getTeacherAssignments = (teacher) =>
  dedupeBy(
    (Array.isArray(teacher?.assignments) ? teacher.assignments : [])
      .map((row) => ({
        className: String(row?.className || "").trim(),
        subject: String(row?.subject || "").trim(),
      }))
      .filter((row) => row.className && row.subject),
    (row) => buildCoursePairKey(row)
  );

const studentMatchesClass = (student, className) => {
  const { program, level } = parseClassName(className);
  if (!program) return false;

  const studentProgram = String(student?.program || "").trim();
  const studentLevel = String(student?.level || "").trim();

  const programMatch = normalizeId(studentProgram) === normalizeId(program);
  if (!programMatch) return false;

  if (!level) return true;
  return normalizeId(studentLevel) === normalizeId(level);
};

export const getStudentsForClass = ({ faculty, className }) => {
  const students = getStudentsData();
  return students
    .filter((student) => {
      const facultyMatch = faculty
        ? normalizeId(student.faculty) === normalizeId(faculty)
        : true;
      return facultyMatch && studentMatchesClass(student, className);
    })
    .map((student) => ({
      studentId: String(student.id ?? ""),
      matricule: String(student.matricule || ""),
      name: String(student.name || "Unnamed Student"),
      faculty: String(student.faculty || ""),
      department: String(student.department || ""),
      program: String(student.program || ""),
      level: String(student.level || ""),
    }));
};

export const saveResultSubmission = (payload) => {
  const submissions = readResultSubmissions();
  const assessmentType = normalizeAssessmentType(payload.assessmentType);
  const id = buildSubmissionId({
    ...payload,
    assessmentType,
  });

  const now = new Date().toISOString();
  const marks = dedupeBy(
    (Array.isArray(payload.marks) ? payload.marks : [])
      .map((mark) => {
        const normalized = clampMark(mark?.mark, assessmentType);
        if (normalized === null) return null;

        return {
          studentId: String(mark.studentId || ""),
          matricule: String(mark.matricule || ""),
          name: String(mark.name || ""),
          faculty: String(mark.faculty || ""),
          department: String(mark.department || ""),
          program: String(mark.program || ""),
          level: String(mark.level || ""),
          mark: normalized,
        };
      })
      .filter(Boolean),
    (mark) => normalizeId(mark.matricule || mark.studentId)
  );

  const existing = submissions.find((item) => item.id === id);
  const record = {
    id,
    faculty: String(payload.faculty || ""),
    department: String(payload.department || ""),
    className: String(payload.className || ""),
    subject: String(payload.subject || ""),
    academicYear: String(payload.academicYear || getCurrentAcademicYear()),
    semester: String(payload.semester || SEMESTER_OPTIONS[0]),
    assessmentType,
    teacherId: String(payload.teacherId || ""),
    teacherName: String(payload.teacherName || ""),
    teacherStaffId: String(payload.teacherStaffId || ""),
    marks,
    status: "submitted",
    reviewComment: "",
    submittedAt: now,
    updatedAt: now,
    reviewedAt: null,
    reviewedBy: "",
    ...(existing || {}),
  };

  const next = submissions.filter((item) => item.id !== id);
  next.unshift(record);
  safeWrite(RESULT_SUBMISSIONS_STORAGE_KEY, next);
  return record;
};

export const reviewResultSubmission = ({ submissionId, status, reviewerName, comment = "" }) => {
  const targetStatus = status === "approved" ? "approved" : "rejected";
  const submissions = readResultSubmissions();
  const now = new Date().toISOString();

  const next = submissions.map((submission) =>
    submission.id === submissionId
      ? {
          ...submission,
          status: targetStatus,
          reviewComment: String(comment || ""),
          reviewedAt: now,
          reviewedBy: String(reviewerName || "Admin"),
          updatedAt: now,
        }
      : submission
  );

  safeWrite(RESULT_SUBMISSIONS_STORAGE_KEY, next);
  return next.find((submission) => submission.id === submissionId) || null;
};

export const publishFacultyResults = ({ faculty, academicYear, semester, adminName }) => {
  const publications = readResultPublications();
  const id = buildPublicationId({ faculty, academicYear, semester });
  const now = new Date().toISOString();

  const publication = {
    id,
    faculty: String(faculty || ""),
    academicYear: String(academicYear || getCurrentAcademicYear()),
    semester: String(semester || SEMESTER_OPTIONS[0]),
    publishedAt: now,
    publishedBy: String(adminName || "Admin"),
    status: "published",
  };

  const next = publications.filter((item) => item.id !== id);
  next.unshift(publication);
  safeWrite(RESULT_PUBLICATIONS_STORAGE_KEY, next);
  return publication;
};

export const isFacultyPublished = ({ faculty, academicYear, semester }) => {
  const id = buildPublicationId({ faculty, academicYear, semester });
  return readResultPublications().some((item) => item.id === id);
};

export const getFaculties = () => {
  const students = getStudentsData().map((student) => String(student.faculty || "").trim());
  const teachers = getTeachersData().map((teacher) => String(teacher.faculty || "").trim());
  return dedupeBy(
    [...students, ...teachers].filter(Boolean).map((faculty) => ({ faculty })),
    (item) => normalizeId(item.faculty)
  ).map((item) => item.faculty);
};

const getRequiredCoursePairsForFaculty = (faculty) => {
  const teachers = getTeachersData().filter(
    (teacher) => normalizeId(teacher.faculty) === normalizeId(faculty)
  );

  return dedupeBy(
    teachers.flatMap((teacher) =>
      getTeacherAssignments(teacher).map((assignment) => ({
        faculty: String(teacher.faculty || faculty),
        department: String(teacher.department || ""),
        className: assignment.className,
        subject: assignment.subject,
      }))
    ),
    (entry) => buildCoursePairKey(entry)
  );
};

const findSubmissionByPairAndType = ({
  submissions,
  faculty,
  academicYear,
  semester,
  className,
  subject,
  assessmentType,
}) =>
  submissions.find(
    (submission) =>
      normalizeId(submission.faculty) === normalizeId(faculty) &&
      normalizeId(submission.academicYear) === normalizeId(academicYear) &&
      normalizeId(submission.semester) === normalizeId(semester) &&
      normalizeId(submission.className) === normalizeId(className) &&
      normalizeId(submission.subject) === normalizeId(subject) &&
      normalizeAssessmentType(submission.assessmentType) ===
        normalizeAssessmentType(assessmentType)
  ) || null;

export const getFacultyWorkflowSummary = ({ faculty, academicYear, semester }) => {
  const requiredPairs = getRequiredCoursePairsForFaculty(faculty);
  const submissions = readResultSubmissions();

  const matrix = requiredPairs.map((pair) => {
    const ca = findSubmissionByPairAndType({
      submissions,
      faculty,
      academicYear,
      semester,
      className: pair.className,
      subject: pair.subject,
      assessmentType: "CA",
    });
    const exam = findSubmissionByPairAndType({
      submissions,
      faculty,
      academicYear,
      semester,
      className: pair.className,
      subject: pair.subject,
      assessmentType: "EXAM",
    });

    return {
      ...pair,
      caStatus: ca?.status || "missing",
      examStatus: exam?.status || "missing",
      caSubmission: ca,
      examSubmission: exam,
    };
  });

  const requiredComponents = matrix.length * 2;
  const statusList = matrix.flatMap((row) => [row.caStatus, row.examStatus]);
  const approvedComponents = statusList.filter((status) => status === "approved").length;
  const submittedComponents = statusList.filter((status) => status === "submitted").length;
  const rejectedComponents = statusList.filter((status) => status === "rejected").length;
  const missingComponents = statusList.filter((status) => status === "missing").length;
  const canPublish =
    requiredComponents > 0 && approvedComponents === requiredComponents && missingComponents === 0;

  return {
    faculty,
    academicYear,
    semester,
    requiredPairs: matrix.length,
    requiredComponents,
    approvedComponents,
    submittedComponents,
    rejectedComponents,
    missingComponents,
    canPublish,
    matrix,
    progressPercent:
      requiredComponents === 0
        ? 0
        : Math.round((approvedComponents / requiredComponents) * 100),
  };
};

export const getSubmissionsForFacultyPeriod = ({ faculty, academicYear, semester }) =>
  readResultSubmissions()
    .filter(
      (submission) =>
        normalizeId(submission.faculty) === normalizeId(faculty) &&
        normalizeId(submission.academicYear) === normalizeId(academicYear) &&
        normalizeId(submission.semester) === normalizeId(semester)
    )
    .sort((a, b) => new Date(b.updatedAt || b.submittedAt || 0) - new Date(a.updatedAt || a.submittedAt || 0));

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

export const getCombinedCourseRows = ({ faculty, academicYear, semester }) => {
  const approved = getSubmissionsForFacultyPeriod({ faculty, academicYear, semester }).filter(
    (submission) => submission.status === "approved"
  );

  const groupedPairs = {};
  approved.forEach((submission) => {
    const pairKey = buildCoursePairKey({
      className: submission.className,
      subject: submission.subject,
    });

    if (!groupedPairs[pairKey]) {
      groupedPairs[pairKey] = {
        faculty: submission.faculty,
        department: submission.department,
        className: submission.className,
        subject: submission.subject,
        academicYear: submission.academicYear,
        semester: submission.semester,
        ca: null,
        exam: null,
      };
    }

    if (normalizeAssessmentType(submission.assessmentType) === "CA") {
      groupedPairs[pairKey].ca = submission;
    } else {
      groupedPairs[pairKey].exam = submission;
    }
  });

  const rows = [];

  Object.values(groupedPairs).forEach((pair) => {
    const markMap = {};

    (pair.ca?.marks || []).forEach((row) => {
      const key = normalizeId(row.matricule || row.studentId);
      if (!key) return;
      markMap[key] = {
        ...row,
        ca: row.mark,
        exam: null,
      };
    });

    (pair.exam?.marks || []).forEach((row) => {
      const key = normalizeId(row.matricule || row.studentId);
      if (!key) return;

      if (!markMap[key]) {
        markMap[key] = {
          ...row,
          ca: null,
          exam: row.mark,
        };
        return;
      }

      markMap[key] = {
        ...markMap[key],
        exam: row.mark,
      };
    });

    Object.values(markMap).forEach((studentRow) => {
      const ca = Number.isFinite(Number(studentRow.ca)) ? Number(studentRow.ca) : null;
      const exam = Number.isFinite(Number(studentRow.exam)) ? Number(studentRow.exam) : null;
      const total = ca === null || exam === null ? null : ca + exam;
      const grade = total === null ? "" : gradeFromTotal(total);
      const remark = total === null ? "Incomplete" : remarkFromGrade(grade);

      rows.push({
        faculty: pair.faculty,
        department: pair.department,
        className: pair.className,
        subject: pair.subject,
        academicYear: pair.academicYear,
        semester: pair.semester,
        studentId: String(studentRow.studentId || ""),
        matricule: String(studentRow.matricule || ""),
        studentName: String(studentRow.name || "Unnamed Student"),
        program: String(studentRow.program || ""),
        level: String(studentRow.level || ""),
        ca,
        exam,
        total,
        grade,
        remark,
      });
    });
  });

  return rows.sort((a, b) => {
    if (a.className !== b.className) return a.className.localeCompare(b.className);
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    return a.studentName.localeCompare(b.studentName);
  });
};

export const getPublishedPeriodsForFaculty = (faculty) =>
  readResultPublications()
    .filter(
      (publication) =>
        normalizeId(publication.faculty) === normalizeId(faculty) &&
        publication.status === "published"
    )
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

export const getStudentPublishedResults = ({
  matricule,
  faculty,
  academicYear,
  semester,
}) => {
  const published = isFacultyPublished({ faculty, academicYear, semester });
  if (!published) {
    return { published: false, rows: [], publication: null };
  }

  const publication =
    getPublishedPeriodsForFaculty(faculty).find(
      (item) =>
        normalizeId(item.academicYear) === normalizeId(academicYear) &&
        normalizeId(item.semester) === normalizeId(semester)
    ) || null;

  const rows = getCombinedCourseRows({ faculty, academicYear, semester }).filter(
    (row) => normalizeId(row.matricule) === normalizeId(matricule)
  );

  return {
    published: true,
    rows,
    publication,
  };
};
