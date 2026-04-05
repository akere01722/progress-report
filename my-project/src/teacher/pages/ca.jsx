import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiBookOpen,
  FiCalendar,
  FiLayers,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUpload,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  SEMESTER_OPTIONS,
  fetchTeacherResultContext,
  getAcademicYearOptions,
  getCurrentAcademicYear,
  getStudentsForClass,
  getSubmissionsForFacultyPeriod,
  saveResultSubmission,
} from "../../lib/resultsBackendWorkflow";

const CA_DRAFTS_KEY = "teacher_ca_drafts";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const buildDraftId = ({ teacherKey, academicYear, semester, className, subject }) =>
  [teacherKey, academicYear, semester, className, subject]
    .map((part) => String(part || "").trim().toLowerCase())
    .join("__");

const readDrafts = () => {
  try {
    const raw = localStorage.getItem(CA_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeDrafts = (drafts) => {
  localStorage.setItem(CA_DRAFTS_KEY, JSON.stringify(drafts));
};

const STATUS_STYLES = {
  submitted: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

export default function UploadCAMarks() {
  const userData = useMemo(() => readUserData(), []);

  const [teacher, setTeacher] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState("");

  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [semester, setSemester] = useState(SEMESTER_OPTIONS[0]);
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftMeta, setDraftMeta] = useState(null);
  const [draftMessage, setDraftMessage] = useState("");

  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const yearOptions = useMemo(() => getAcademicYearOptions(5), []);

  useEffect(() => {
    let active = true;

    const loadContext = async () => {
      setContextLoading(true);
      setContextError("");

      try {
        const context = await fetchTeacherResultContext({
          teacherUserId: userData?.id,
          staffId: userData?.staffId,
          email: userData?.email,
        });

        if (!active) return;

        setTeacher(context.teacher || null);
        setAssignments(Array.isArray(context.assignments) ? context.assignments : []);
        setAllStudents(Array.isArray(context.students) ? context.students : []);
      } catch (error) {
        if (!active) return;
        setTeacher(null);
        setAssignments([]);
        setAllStudents([]);
        setContextError(error?.message || "Failed to load teacher profile.");
      } finally {
        if (active) setContextLoading(false);
      }
    };

    void loadContext();

    return () => {
      active = false;
    };
  }, [userData?.email, userData?.id, userData?.staffId]);

  const reloadSubmissions = useCallback(async () => {
    if (!teacher) {
      setSubmissions([]);
      return;
    }

    setLoadingSubmissions(true);
    try {
      const list = await getSubmissionsForFacultyPeriod({
        faculty: teacher.faculty,
        facultyId: teacher.facultyId,
        academicYear,
        semester,
      });
      setSubmissions(Array.isArray(list) ? list : []);
    } catch (error) {
      setSubmissions([]);
      toast.error(error?.message || "Failed to load submission status.");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [teacher, academicYear, semester]);

  useEffect(() => {
    void reloadSubmissions();
  }, [reloadSubmissions]);

  const classOptions = useMemo(
    () => Array.from(new Set((assignments || []).map((item) => item.className))),
    [assignments]
  );

  const subjectOptions = useMemo(
    () =>
      (assignments || [])
        .filter((item) => item.className === className)
        .map((item) => item.subject),
    [assignments, className]
  );

  useEffect(() => {
    if (!subjectOptions.includes(subject)) setSubject("");
  }, [subjectOptions, subject]);

  const students = useMemo(
    () => getStudentsForClass({ students: allStudents, className }),
    [allStudents, className]
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (student) =>
        String(student.name || "")
          .toLowerCase()
          .includes(q) ||
        String(student.matricule || "")
          .toLowerCase()
          .includes(q)
    );
  }, [students, search]);

  const canShowTable = Boolean(teacher && academicYear && semester && className && subject);

  const draftId = canShowTable
    ? buildDraftId({
        teacherKey: teacher.staffId || teacher.id,
        academicYear,
        semester,
        className,
        subject,
      })
    : "";

  const hasAnyMark = useMemo(
    () => Object.values(marks).some((value) => String(value ?? "").trim() !== ""),
    [marks]
  );

  const currentSubmission = useMemo(() => {
    if (!canShowTable) return null;
    return (
      submissions.find(
        (submission) =>
          submission.assessmentType === "CA" &&
          submission.className === className &&
          submission.subject === subject
      ) || null
    );
  }, [canShowTable, submissions, className, subject]);

  useEffect(() => {
    if (!canShowTable) {
      setDraftMeta(null);
      setDraftMessage("");
      return;
    }

    const drafts = readDrafts();
    const draft = drafts[draftId];
    if (!draft) {
      setMarks({});
      setDraftMeta(null);
      setDraftMessage("No saved draft for this class and course.");
      return;
    }

    setMarks(draft.marks || {});
    setDraftMeta(draft);
    setDraftMessage("Saved draft loaded. You can continue editing.");
  }, [canShowTable, draftId]);

  const handleMarkChange = (studentMatricule, value) => {
    if (value === "") {
      setMarks((prev) => ({ ...prev, [studentMatricule]: "" }));
      return;
    }

    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n <= 30) {
      setMarks((prev) => ({ ...prev, [studentMatricule]: value }));
    }
  };

  const saveDraft = async () => {
    if (!canShowTable || !teacher) return;

    const cleanedMarks = Object.fromEntries(
      Object.entries(marks).filter(([, value]) => String(value ?? "").trim() !== "")
    );

    if (Object.keys(cleanedMarks).length === 0) {
      toast.error("Enter at least one mark before saving a draft.");
      return;
    }

    setSavingDraft(true);
    try {
      const drafts = readDrafts();
      const payload = {
        id: draftId,
        faculty: teacher.faculty,
        department: teacher.department,
        className,
        subject,
        academicYear,
        semester,
        marks: cleanedMarks,
        updatedAt: new Date().toISOString(),
      };
      drafts[draftId] = payload;
      writeDrafts(drafts);
      setDraftMeta(payload);
      setDraftMessage("Draft saved. You can edit or delete it later.");
      toast.success("CA draft saved.");
    } finally {
      setSavingDraft(false);
    }
  };

  const deleteDraft = () => {
    if (!canShowTable || !draftMeta) return;

    const drafts = readDrafts();
    if (drafts[draftId]) {
      delete drafts[draftId];
      writeDrafts(drafts);
    }

    setMarks({});
    setDraftMeta(null);
    setDraftMessage("Draft deleted.");
    toast.info("CA draft deleted.");
  };

  const submit = async () => {
    if (!canShowTable || !teacher) return;

    if (!hasAnyMark) {
      toast.error("Enter marks before submitting.");
      return;
    }

    if (students.length === 0) {
      toast.error("No students found in this class.");
      return;
    }

    const missingStudents = students.filter(
      (student) => String(marks[student.matricule] ?? "").trim() === ""
    );

    if (missingStudents.length > 0) {
      toast.error("Fill marks for all students before submitting.");
      return;
    }

    const payloadMarks = students.map((student) => ({
      ...student,
      mark: marks[student.matricule],
    }));

    const selectedAssignment =
      assignments.find(
        (item) => item.className === className && item.subject === subject
      ) || null;

    setSaving(true);
    try {
      await saveResultSubmission({
        faculty: teacher.faculty,
        facultyId: teacher.facultyId || selectedAssignment?.facultyId || "",
        department: teacher.department,
        departmentId: teacher.departmentId || selectedAssignment?.departmentId || "",
        className,
        subject,
        subjectId: selectedAssignment?.subjectId || "",
        academicYear,
        semester,
        assessmentType: "CA",
        teacherId: teacher.id,
        teacherName: teacher.name,
        teacherStaffId: teacher.staffId,
        marks: payloadMarks,
      });

      await reloadSubmissions();
      toast.success("CA marks submitted. Waiting for admin approval.");
      setDraftMessage("Submission sent to admin for approval.");
    } catch (error) {
      toast.error(error?.message || "Failed to submit CA marks.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Submit Continuous Assessment (CA)
          </h1>
          <p className="text-gray-500 mt-1">
            Select year, semester, class and course, then submit CA marks for admin approval.
          </p>
        </div>
      </div>

      {contextLoading && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Loading teacher result context...
        </div>
      )}

      {contextError && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {contextError}
        </div>
      )}

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <select
              value={academicYear}
              onChange={(e) => {
                setAcademicYear(e.target.value);
                setMarks({});
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
              disabled={!teacher}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setMarks({});
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
              disabled={!teacher}
            >
              {SEMESTER_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiLayers className="text-blue-600" />
            <select
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setMarks({});
                setSearch("");
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
              disabled={!teacher}
            >
              <option value="">Select Class</option>
              {classOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiBookOpen className="text-blue-600" />
            <select
              value={subject}
              disabled={!className || !teacher}
              onChange={(e) => {
                setSubject(e.target.value);
                setMarks({});
                setSearch("");
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              <option value="">Select Subject</option>
              {subjectOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiSearch className="text-gray-400" />
            <input
              value={search}
              disabled={!canShowTable}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span>
            Faculty: <span className="font-semibold text-gray-900">{teacher?.faculty || "-"}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            Department: <span className="font-semibold text-gray-900">{teacher?.department || "-"}</span>
          </span>
          {loadingSubmissions && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500">Loading status...</span>
            </>
          )}
          {currentSubmission && !loadingSubmissions && (
            <>
              <span className="text-gray-300">|</span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  STATUS_STYLES[currentSubmission.status] || "border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                Status: {currentSubmission.status}
              </span>
            </>
          )}
        </div>
      </div>

      {canShowTable && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 sm:px-6 py-3 text-left font-semibold text-gray-600">
                    Matricule
                  </th>
                  <th className="px-5 sm:px-6 py-3 text-left font-semibold text-gray-600">
                    Student Name
                  </th>
                  <th className="px-5 sm:px-6 py-3 text-center font-semibold text-gray-600">
                    CA / 30
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.matricule} className="border-t hover:bg-gray-50 transition">
                    <td className="px-5 sm:px-6 py-3 font-semibold text-gray-900">
                      {student.matricule}
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-gray-700">{student.name}</td>
                    <td className="px-5 sm:px-6 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={marks[student.matricule] ?? ""}
                        onChange={(e) => handleMarkChange(student.matricule, e.target.value)}
                        className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0-30"
                      />
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                      No students match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 sm:px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
            {draftMeta?.updatedAt
              ? `Draft last saved: ${new Date(draftMeta.updatedAt).toLocaleString()}`
              : draftMessage}
          </div>

          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-3">
            <button
              onClick={saveDraft}
              disabled={savingDraft || !canShowTable}
              className={`
                inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3
                text-sm font-semibold shadow-sm transition
                ${
                  savingDraft || !canShowTable
                    ? "bg-gray-200 text-gray-500"
                    : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
                }
              `}
              type="button"
            >
              <FiSave />
              {savingDraft ? "Saving Draft..." : draftMeta ? "Update Draft" : "Save Draft"}
            </button>

            <button
              onClick={deleteDraft}
              disabled={!draftMeta}
              className={`
                inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3
                text-sm font-semibold shadow-sm transition
                ${
                  draftMeta
                    ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                    : "bg-gray-200 text-gray-500"
                }
              `}
              type="button"
            >
              <FiTrash2 />
              Delete Draft
            </button>

            <button
              onClick={submit}
              disabled={saving || !hasAnyMark}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3
                text-sm font-semibold text-white shadow-sm transition
                ${
                  saving || !hasAnyMark
                    ? "bg-blue-400"
                    : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5"
                }`}
              type="button"
            >
              <FiUpload />
              {saving ? "Submitting..." : "Submit CA Marks"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
