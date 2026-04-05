import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiMail, FiPlus, FiRefreshCw, FiTrash2, FiUser, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  DEFAULT_SYSTEM_PASSWORD,
  PROGRAMS,
  STUDENTS_STORAGE_KEY,
  generateStudentMatricule,
  writeArray,
} from "../../lib/registrationData";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const ALL_LEVEL_OPTIONS = ["Level 1", "Level 2", "Level 3", "Level 4"];
const HND_LEVEL_OPTIONS = ["Level 1", "Level 2", "Level 3"];
const BSC_LEVEL_OPTIONS = ["Level 1", "Level 2", "Level 3", "Level 4"];

const requiresLevel = (program) => program === "HND" || program === "BSc";
const isMastersProgram = (program) => program === "Masters I" || program === "Masters II";

const getLevelOptionsForProgram = (program) => {
  if (program === "HND") {
    return HND_LEVEL_OPTIONS;
  }
  if (program === "BSc") {
    return BSC_LEVEL_OPTIONS;
  }
  return [];
};

const defaultForm = {
  name: "",
  email: "",
  facultyId: "",
  departmentId: "",
  program: "",
  level: "",
};

const buildDepartmentKey = (facultyId, departmentName) =>
  `${String(facultyId || "").trim()}::${String(departmentName || "")
    .trim()
    .toLowerCase()}`;

const buildLookups = (faculties, departments) => {
  const facultiesById = new Map(
    faculties.map((faculty) => [String(faculty.id), { ...faculty, id: String(faculty.id) }])
  );
  const facultyIdByName = new Map(
    faculties.map((faculty) => [String(faculty.name || "").trim().toLowerCase(), String(faculty.id)])
  );

  const departmentsById = new Map(
    departments.map((department) => [
      String(department.id),
      {
        ...department,
        id: String(department.id),
        faculty_id: String(department.faculty_id),
      },
    ])
  );

  const departmentIdByFacultyName = new Map(
    departments.map((department) => [
      buildDepartmentKey(department.faculty_id, department.name),
      String(department.id),
    ])
  );

  return {
    facultiesById,
    facultyIdByName,
    departmentsById,
    departmentIdByFacultyName,
  };
};

const mapStudentRow = (row, lookups) => {
  const facultyNameRaw = String(row?.faculty || "").trim();
  const departmentNameRaw = String(row?.department || "").trim();

  let facultyId = row?.faculty_id != null ? String(row.faculty_id) : "";
  if (!facultyId && facultyNameRaw) {
    facultyId = lookups.facultyIdByName.get(facultyNameRaw.toLowerCase()) || "";
  }

  const facultyFromLookup = facultyId ? lookups.facultiesById.get(facultyId) : null;
  const facultyName = facultyFromLookup?.name || facultyNameRaw || "Unknown";

  let departmentId = row?.department_id != null ? String(row.department_id) : "";
  if (!departmentId && facultyId && departmentNameRaw) {
    departmentId =
      lookups.departmentIdByFacultyName.get(buildDepartmentKey(facultyId, departmentNameRaw)) ||
      "";
  }

  const departmentFromLookup = departmentId ? lookups.departmentsById.get(departmentId) : null;
  const departmentName = departmentFromLookup?.name || departmentNameRaw || "Unknown";

  return {
    id: row.id,
    name: String(row?.full_name ?? row?.name ?? "").trim(),
    email: String(row?.email ?? "").trim(),
    matricule: String(row?.matricule ?? ""),
    facultyId,
    faculty: facultyName,
    departmentId,
    department: departmentName,
    program: String(row?.program ?? "").trim(),
    level: String(row?.level ?? "").trim(),
  };
};

const shouldFallbackToLegacyPayload = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("faculty_id") || message.includes("department_id");
};

function StudentFormModal({
  open,
  mode,
  onClose,
  onSubmit,
  form,
  setForm,
  faculties,
  departments,
  formError,
  submitting,
}) {
  if (!open) return null;

  const needsLevel = requiresLevel(form.program);
  const levelOptions = getLevelOptionsForProgram(form.program);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-6 py-5 text-white">
          <p className="text-xl font-bold">
            {mode === "edit" ? "Edit Student" : "Register Student"}
          </p>
          <p className="mt-1 text-sm text-blue-50">
            Scroll up/down in this form to review all fields before saving.
          </p>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Full Name</label>
            <div className="relative">
              <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={submitting}
              />
            </div>

            <label className="block text-sm font-semibold text-gray-700">Email</label>
            <div className="relative">
              <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="student@school.edu"
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={submitting}
              />
            </div>

            <label className="block text-sm font-semibold text-gray-700">Faculty</label>
            <select
              value={form.facultyId}
              onChange={(e) => {
                const nextFacultyId = e.target.value;
                setForm((prev) => {
                  const nextLevelOptions = getLevelOptionsForProgram(prev.program);
                  const safeLevel = nextLevelOptions.includes(prev.level) ? prev.level : "";
                  return {
                    ...prev,
                    facultyId: nextFacultyId,
                    departmentId: "",
                    level: safeLevel,
                  };
                });
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={submitting}
            >
              <option value="">Select Faculty</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={String(faculty.id)}>
                  {faculty.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700">Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((prev) => ({ ...prev, departmentId: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              disabled={!form.facultyId || submitting}
              required
            >
              <option value="">Select Department</option>
              {departments.map((department) => (
                <option key={department.id} value={String(department.id)}>
                  {department.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700">Program</label>
            <select
              value={form.program}
              onChange={(e) => {
                const nextProgram = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  program: nextProgram,
                  level: getLevelOptionsForProgram(nextProgram).includes(prev.level)
                    ? prev.level
                    : "",
                }));
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={submitting}
            >
              <option value="">Select Program</option>
              {PROGRAMS.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>

            {needsLevel && (
              <>
                <label className="block text-sm font-semibold text-gray-700">Level</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                >
                  <option value="">Select Level</option>
                  {levelOptions.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </>
            )}

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              Matricule is generated by the system. All users login with one system password:{" "}
              <span className="font-semibold">{DEFAULT_SYSTEM_PASSWORD}</span>
            </div>

            {formError && <p className="text-sm font-semibold text-red-600">{formError}</p>}

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                disabled={submitting}
              >
                <FiX />
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={submitting}
              >
                <FiPlus />
                {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Register Student"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ open, title, message, onCancel, onConfirm, deleting }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [backendError, setBackendError] = useState("");

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    facultyId: "",
    departmentId: "",
    program: "",
    level: "",
  });

  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [lastRegistered, setLastRegistered] = useState(null);

  const fetchStudentsFromBackend = useCallback(async (facultiesData, departmentsData) => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const lookups = buildLookups(facultiesData, departmentsData);
    return (data || []).map((row) => mapStudentRow(row, lookups));
  }, []);

  const fetchCatalog = useCallback(async () => {
    if (!supabase) return { facultiesData: [], departmentsData: [] };

    const [{ data: facultiesData, error: facultiesError }, { data: departmentsData, error: departmentsError }] =
      await Promise.all([
        supabase.from("faculties").select("id, name, code").order("name", { ascending: true }),
        supabase
          .from("departments")
          .select("id, faculty_id, name, code")
          .order("name", { ascending: true }),
      ]);

    if (facultiesError) throw facultiesError;
    if (departmentsError) throw departmentsError;

    return {
      facultiesData: facultiesData || [],
      departmentsData: departmentsData || [],
    };
  }, []);

  const refreshData = useCallback(
    async (withFullLoader = true) => {
      if (!isSupabaseConfigured || !supabase) {
        setBackendError(
          "Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
        );
        setInitialLoading(false);
        return;
      }

      if (withFullLoader) setInitialLoading(true);
      else setRefreshing(true);

      try {
        const { facultiesData, departmentsData } = await fetchCatalog();

        const studentsData = await fetchStudentsFromBackend(facultiesData, departmentsData);

        setFaculties(facultiesData);
        setDepartments(departmentsData);
        setStudents(studentsData);
        if (facultiesData.length === 0) {
          setBackendError(
            "No faculties found in backend. Seed faculties/departments in Supabase SQL Editor."
          );
        } else {
          setBackendError("");
        }
      } catch (error) {
        const message = error?.message || "Could not load students from backend.";
        setBackendError(message);
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [fetchCatalog, fetchStudentsFromBackend]
  );

  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  useEffect(() => {
    const cacheRows = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      matricule: student.matricule,
      faculty: student.faculty,
      department: student.department,
      program: student.program,
      level: student.level,
    }));

    writeArray(STUDENTS_STORAGE_KEY, cacheRows);
  }, [students]);

  const formDepartments = useMemo(
    () =>
      form.facultyId
        ? departments.filter((department) => String(department.faculty_id) === String(form.facultyId))
        : [],
    [form.facultyId, departments]
  );

  const filterDepartments = useMemo(
    () =>
      filters.facultyId
        ? departments.filter(
            (department) => String(department.faculty_id) === String(filters.facultyId)
          )
        : [],
    [filters.facultyId, departments]
  );

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return students.filter((student) => {
      const searchMatch = !q
        ? true
        : [
            student.name,
            student.matricule,
            student.faculty,
            student.department,
            student.program,
            student.level,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);

      const facultyMatch = filters.facultyId
        ? String(student.facultyId) === String(filters.facultyId)
        : true;
      const departmentMatch = filters.departmentId
        ? String(student.departmentId) === String(filters.departmentId)
        : true;
      const programMatch = filters.program ? student.program === filters.program : true;
      const levelMatch = filters.level ? student.level === filters.level : true;

      return searchMatch && facultyMatch && departmentMatch && programMatch && levelMatch;
    });
  }, [students, query, filters]);

  const showLevelFilter = !isMastersProgram(filters.program);
  const filterLevelOptions = useMemo(() => {
    if (!filters.program) return ALL_LEVEL_OPTIONS;
    return getLevelOptionsForProgram(filters.program);
  }, [filters.program]);

  const openRegister = () => {
    setForm(defaultForm);
    setFormError("");
    setEditingStudentId(null);
    setModalMode("register");
  };

  const openEdit = (student) => {
    setForm({
      name: student.name,
      email: student.email,
      facultyId: student.facultyId ? String(student.facultyId) : "",
      departmentId: student.departmentId ? String(student.departmentId) : "",
      program: student.program,
      level: student.level || "",
    });
    setFormError("");
    setEditingStudentId(student.id);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingStudentId(null);
    setFormError("");
  };

  const saveStudent = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setFormError("Supabase is not configured.");
      return;
    }

    const email = form.email.trim().toLowerCase();
    const needsLevel = requiresLevel(form.program);
    const allowedLevelOptions = getLevelOptionsForProgram(form.program);

    if (
      !form.name.trim() ||
      !email ||
      !form.facultyId ||
      !form.departmentId ||
      !form.program ||
      (needsLevel && !form.level)
    ) {
      setFormError("Please fill all required fields.");
      return;
    }

    if (needsLevel && !allowedLevelOptions.includes(form.level)) {
      setFormError("Selected level does not match the faculty/program rules.");
      return;
    }

    const facultyId = Number(form.facultyId);
    const departmentId = Number(form.departmentId);
    const selectedFaculty = faculties.find((faculty) => String(faculty.id) === String(form.facultyId));
    const selectedDepartment = departments.find(
      (department) => String(department.id) === String(form.departmentId)
    );

    if (!Number.isFinite(facultyId) || !Number.isFinite(departmentId)) {
      setFormError("Please select valid faculty and department.");
      return;
    }

    if (
      !selectedFaculty ||
      !selectedDepartment ||
      String(selectedDepartment.faculty_id) !== String(form.facultyId)
    ) {
      setFormError("Selected department does not belong to the selected faculty.");
      return;
    }

    const emailExists = students.some(
      (student) =>
        String(student.email).toLowerCase() === email && String(student.id) !== String(editingStudentId)
    );

    if (emailExists) {
      setFormError("That email is already used by another student.");
      return;
    }

    setFormSubmitting(true);
    setFormError("");

    try {
      const normalizedPayload = {
        full_name: form.name.trim(),
        email,
        faculty_id: facultyId,
        department_id: departmentId,
        program: form.program,
        level: needsLevel ? form.level : null,
      };

      const legacyPayload = {
        full_name: form.name.trim(),
        email,
        faculty: selectedFaculty.name,
        department: selectedDepartment.name,
        program: form.program,
        level: needsLevel ? form.level : null,
      };

      if (modalMode === "edit" && editingStudentId) {
        const { error: normalizedError } = await supabase
          .from("students")
          .update(normalizedPayload)
          .eq("id", editingStudentId);

        if (normalizedError) {
          if (shouldFallbackToLegacyPayload(normalizedError)) {
            const { error: legacyError } = await supabase
              .from("students")
              .update(legacyPayload)
              .eq("id", editingStudentId);
            if (legacyError) throw legacyError;
          } else {
            throw normalizedError;
          }
        }

        await refreshData(false);
        toast.success("Student updated successfully.");
        closeModal();
        return;
      }

      const departmentCode = String(selectedDepartment.code || "").trim().toUpperCase();
      const matricule = generateStudentMatricule(students, departmentCode);
      const { error: normalizedError } = await supabase
        .from("students")
        .insert([{ ...normalizedPayload, matricule }]);

      if (normalizedError) {
        if (shouldFallbackToLegacyPayload(normalizedError)) {
          const { error: legacyError } = await supabase
            .from("students")
            .insert([{ ...legacyPayload, matricule }]);
          if (legacyError) throw legacyError;
        } else {
          throw normalizedError;
        }
      }

      await refreshData(false);
      setLastRegistered({
        name: form.name.trim(),
        matricule,
        level: needsLevel ? form.level : "N/A",
      });
      toast.success("Student registered successfully.");
      closeModal();
    } catch (error) {
      const message = error?.message || "Could not save student.";
      setFormError(message);
      toast.error(message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete || !supabase) return;

    setDeleting(true);
    try {
      const { error } = await supabase.from("students").delete().eq("id", studentToDelete.id);
      if (error) throw error;

      await refreshData(false);
      toast.success("Student deleted.");
      setStudentToDelete(null);
    } catch (error) {
      const message = error?.message || "Could not delete student.";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Student Registration</h2>
            <p className="mt-1 text-sm text-blue-50">
              Register and manage students by class using level/program/faculty filters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshData(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              disabled={refreshing || initialLoading}
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={openRegister}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              disabled={initialLoading}
            >
              <FiPlus />
              Register Student
            </button>
          </div>
        </div>
      </div>

      {backendError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {backendError}
        </div>
      )}

      {lastRegistered && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Student registered: <span className="font-semibold">{lastRegistered.name}</span> |
          Matricule: <span className="font-semibold"> {lastRegistered.matricule}</span> | Level:
          <span className="font-semibold"> {lastRegistered.level}</span>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-gray-900">Filter Students By Class</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name/matricule"
            className="rounded-lg border px-3 py-2 xl:col-span-2"
          />

          <select
            value={filters.facultyId}
            onChange={(e) => {
              const nextFacultyId = e.target.value;
              setFilters((prev) => {
                const nextLevelOptions = prev.program
                  ? getLevelOptionsForProgram(prev.program)
                  : ALL_LEVEL_OPTIONS;
                return {
                  ...prev,
                  facultyId: nextFacultyId,
                  departmentId: "",
                  level: nextLevelOptions.includes(prev.level) ? prev.level : "",
                };
              });
            }}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">All Faculties</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={String(faculty.id)}>
                {faculty.name}
              </option>
            ))}
          </select>

          <select
            value={filters.departmentId}
            onChange={(e) => setFilters((prev) => ({ ...prev, departmentId: e.target.value }))}
            className="rounded-lg border px-3 py-2 disabled:bg-gray-50"
            disabled={!filters.facultyId}
          >
            <option value="">All Departments</option>
            {filterDepartments.map((department) => (
              <option key={department.id} value={String(department.id)}>
                {department.name}
              </option>
            ))}
          </select>

          <select
            value={filters.program}
            onChange={(e) => {
              const nextProgram = e.target.value;
              setFilters((prev) => ({
                ...prev,
                program: nextProgram,
                level: isMastersProgram(nextProgram)
                  ? ""
                  : getLevelOptionsForProgram(nextProgram).includes(prev.level)
                    ? prev.level
                    : "",
              }));
            }}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">All Programs</option>
            {PROGRAMS.map((program) => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>

          {showLevelFilter && (
            <select
              value={filters.level}
              onChange={(e) => setFilters((prev) => ({ ...prev, level: e.target.value }))}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">All Levels</option>
              {filterLevelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          )}
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredStudents.length}</span> of{" "}
          <span className="font-semibold">{students.length}</span> students.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Matricule</th>
                <th className="py-2 pr-3">Faculty</th>
                <th className="py-2 pr-3">Department</th>
                <th className="py-2 pr-3">Program</th>
                <th className="py-2 pr-3">Level</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{student.name}</td>
                  <td className="py-2 pr-3 font-semibold">{student.matricule}</td>
                  <td className="py-2 pr-3">{student.faculty}</td>
                  <td className="py-2 pr-3">{student.department}</td>
                  <td className="py-2 pr-3">{student.program}</td>
                  <td className="py-2 pr-3">{student.level || "N/A"}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(student)}
                        className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                        title="Edit Student"
                        disabled={initialLoading || refreshing}
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => setStudentToDelete(student)}
                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                        title="Delete Student"
                        disabled={initialLoading || refreshing}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {initialLoading && (
          <p className="mt-3 text-sm text-gray-600">Loading students from backend...</p>
        )}

        {!initialLoading && filteredStudents.length === 0 && (
          <p className="mt-3 text-sm text-gray-600">No students found.</p>
        )}
      </div>

      <StudentFormModal
        open={Boolean(modalMode)}
        mode={modalMode}
        onClose={closeModal}
        onSubmit={saveStudent}
        form={form}
        setForm={setForm}
        faculties={faculties}
        departments={formDepartments}
        formError={formError}
        submitting={formSubmitting}
      />

      <ConfirmDeleteModal
        open={Boolean(studentToDelete)}
        title="Delete Student"
        message={
          studentToDelete
            ? `Are you sure you want to delete ${studentToDelete.name}? This action cannot be undone.`
            : ""
        }
        onCancel={() => setStudentToDelete(null)}
        onConfirm={confirmDeleteStudent}
        deleting={deleting}
      />
    </div>
  );
}
