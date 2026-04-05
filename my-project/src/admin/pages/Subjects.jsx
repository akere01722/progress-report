import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

const defaultForm = {
  facultyId: "",
  departmentId: "",
  name: "",
  code: "",
  semester: "Semester 1",
  isActive: true,
};

const SEMESTER_OPTIONS = ["Semester 1", "Semester 2"];

function SubjectFormModal({
  open,
  mode,
  onClose,
  onSubmit,
  form,
  setForm,
  faculties,
  departments,
  hasSemesterColumn,
  submitting,
}) {
  if (!open) return null;

  const formDepartments = form.facultyId
    ? departments.filter((department) => String(department.faculty_id) === String(form.facultyId))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-6 py-5 text-white">
          <p className="text-2xl font-bold">{mode === "edit" ? "Edit Subject" : "Add Subject"}</p>
          <p className="mt-1 text-sm text-blue-50">
            Fill one long form and save subject details to the backend.
          </p>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-gray-700">Faculty</label>
            <select
              value={form.facultyId}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  facultyId: e.target.value,
                  departmentId: "",
                }))
              }
              className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              required
              disabled={!form.facultyId || submitting}
            >
              <option value="">Select Department</option>
              {formDepartments.map((department) => (
                <option key={department.id} value={String(department.id)}>
                  {department.name}
                </option>
              ))}
            </select>

            <label className="block text-sm font-semibold text-gray-700">Subject Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Data Structures and Algorithms"
              className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={submitting}
            />

            <label className="block text-sm font-semibold text-gray-700">Subject Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g. SWE-02"
              className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={submitting}
            />

            <label className="block text-sm font-semibold text-gray-700">Semester</label>
            <select
              value={form.semester}
              onChange={(e) => setForm((prev) => ({ ...prev, semester: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              required
              disabled={submitting || !hasSemesterColumn}
            >
              {SEMESTER_OPTIONS.map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
            {!hasSemesterColumn && (
              <p className="text-xs font-medium text-amber-700">
                Backend `subjects.semester` column is missing. Add it to save semester assignments.
              </p>
            )}

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Status</p>
                <p className="text-xs text-gray-500">Set whether this subject is active.</p>
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  disabled={submitting}
                />
                <span className="text-sm font-medium text-gray-700">
                  {form.isActive ? "Active" : "Inactive"}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                disabled={submitting}
              >
                <FiX className="inline mr-1" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                <FiPlus className="inline mr-1" />
                {submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Subject"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function DeleteSubjectModal({ open, subject, onCancel, onConfirm, deleting }) {
  if (!open || !subject) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900">Delete Subject</h3>
        <p className="mt-2 text-sm text-gray-600">
          Delete <span className="font-semibold">{subject.name}</span> ({subject.code})?
        </p>

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

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState(false);
  const [backendError, setBackendError] = useState("");
  const [semesterWarning, setSemesterWarning] = useState("");
  const [hasSemesterColumn, setHasSemesterColumn] = useState(true);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    facultyId: "",
    departmentId: "",
    semester: "",
    status: "",
  });

  const [form, setForm] = useState(defaultForm);
  const [formMode, setFormMode] = useState(null);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  const departmentById = useMemo(
    () =>
      new Map(
        departments.map((department) => [
          String(department.id),
          {
            name: department.name,
            faculty_id: String(department.faculty_id),
          },
        ])
      ),
    [departments]
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

  const filteredSubjects = useMemo(() => {
    const q = query.trim().toLowerCase();

    return subjects.filter((subject) => {
      const searchMatch = !q
        ? true
        : [subject.name, subject.code, subject.facultyName, subject.departmentName]
            .join(" ")
            .toLowerCase()
            .includes(q);
      const facultyMatch = filters.facultyId
        ? String(subject.faculty_id) === String(filters.facultyId)
        : true;
      const departmentMatch = filters.departmentId
        ? String(subject.department_id) === String(filters.departmentId)
        : true;
      const semesterMatch = filters.semester
        ? String(subject.semester || "").toLowerCase() === String(filters.semester).toLowerCase()
        : true;
      const statusMatch = filters.status
        ? (filters.status === "active" ? subject.is_active : !subject.is_active)
        : true;
      return searchMatch && facultyMatch && departmentMatch && semesterMatch && statusMatch;
    });
  }, [subjects, query, filters]);

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
        const [
          { data: facultiesData, error: facultiesError },
          { data: departmentsData, error: departmentsError },
        ] = await Promise.all([
          supabase.from("faculties").select("id,name,code").order("name", { ascending: true }),
          supabase
            .from("departments")
            .select("id,name,faculty_id,code")
            .order("name", { ascending: true }),
        ]);

        if (facultiesError) throw facultiesError;
        if (departmentsError) throw departmentsError;
        const selectCandidates = [
          "id,faculty_id,department_id,name,code,semester,is_active,created_at",
          "id,faculty_id,department_id,name,code,semester,is_active",
          "id,faculty_id,department_id,name,code,is_active,created_at",
          "id,faculty_id,department_id,name,code,is_active",
        ];

        let subjectsData = [];
        let lastSubjectError = null;
        let semesterAvailable = true;

        for (const selectColumns of selectCandidates) {
          const orderColumn = selectColumns.includes("created_at") ? "created_at" : "name";
          const orderAscending = !selectColumns.includes("created_at");
          const { data, error } = await supabase
            .from("subjects")
            .select(selectColumns)
            .order(orderColumn, { ascending: orderAscending });

          if (error) {
            lastSubjectError = error;
            if (
              error.code === "42703" &&
              String(error.message || "").toLowerCase().includes("semester")
            ) {
              semesterAvailable = false;
            }
            continue;
          }

          subjectsData = data || [];
          lastSubjectError = null;
          break;
        }

        if (lastSubjectError) throw lastSubjectError;

        const facultiesRows = facultiesData || [];
        const departmentsRows = departmentsData || [];
        const facultyMap = new Map(
          facultiesRows.map((faculty) => [String(faculty.id), faculty.name])
        );
        const departmentMap = new Map(
          departmentsRows.map((department) => [
            String(department.id),
            {
              name: department.name,
              faculty_id: String(department.faculty_id),
            },
          ])
        );

        const mapped = (subjectsData || []).map((row) => {
          const facultyId = row?.faculty_id != null ? String(row.faculty_id) : "";
          const departmentId = row?.department_id != null ? String(row.department_id) : "";

          return {
            id: String(row.id),
            faculty_id: facultyId,
            department_id: departmentId,
            facultyName: facultyMap.get(facultyId) || "Unknown",
            departmentName: departmentMap.get(departmentId)?.name || "Unknown",
            name: String(row.name || "").trim(),
            code: String(row.code || "").trim(),
            semester: String(row?.semester || "").trim() || "Semester 1",
            is_active: row.is_active !== false,
          };
        });

        setFaculties(facultiesRows);
        setDepartments(departmentsRows);
        setSubjects(mapped);
        setHasSemesterColumn(semesterAvailable);
        setSemesterWarning(
          semesterAvailable
            ? ""
            : "Semester assignment column is missing in backend subjects table."
        );
        setBackendError("");
      } catch (error) {
        setBackendError(error?.message || "Failed to load subjects.");
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    refreshData(true);
  }, [refreshData]);

  const openAdd = () => {
    setForm(defaultForm);
    setEditingSubjectId(null);
    setFormMode("add");
  };

  const openEdit = (subject) => {
    setEditingSubjectId(subject.id);
    setForm({
      facultyId: String(subject.faculty_id || ""),
      departmentId: String(subject.department_id || ""),
      name: subject.name || "",
      code: subject.code || "",
      semester: subject.semester || "Semester 1",
      isActive: subject.is_active !== false,
    });
    setFormMode("edit");
  };

  const closeFormModal = () => {
    if (savingSubject) return;
    setFormMode(null);
    setEditingSubjectId(null);
    setForm(defaultForm);
  };

  const saveSubject = async (e) => {
    e.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      toast.error("Supabase is not configured.");
      return;
    }

    const name = String(form.name || "").trim();
    const code = String(form.code || "").trim().toUpperCase();
    const semester = String(form.semester || "Semester 1").trim() || "Semester 1";
    const facultyId = String(form.facultyId || "");
    const departmentId = String(form.departmentId || "");

    if (!name || !code || !facultyId || !departmentId) {
      toast.error("Fill all required fields.");
      return;
    }

    const selectedDepartment = departmentById.get(departmentId);
    if (!selectedDepartment || String(selectedDepartment.faculty_id) !== facultyId) {
      toast.error("Selected department does not belong to the selected faculty.");
      return;
    }

    const duplicate = subjects.some((subject) => {
      if (formMode === "edit" && String(subject.id) === String(editingSubjectId)) return false;
      return (
        String(subject.department_id) === departmentId &&
        (subject.name.toLowerCase() === name.toLowerCase() ||
          subject.code.toLowerCase() === code.toLowerCase())
      );
    });

    if (duplicate) {
      toast.error("Subject name or code already exists in this department.");
      return;
    }

    setSavingSubject(true);
    try {
      if (formMode === "edit" && editingSubjectId) {
        const updatePayload = {
          faculty_id: facultyId,
          department_id: departmentId,
          name,
          code,
          is_active: Boolean(form.isActive),
          ...(hasSemesterColumn ? { semester } : {}),
        };
        let { error } = await supabase
          .from("subjects")
          .update(updatePayload)
          .eq("id", editingSubjectId);

        if (
          error &&
          error.code === "42703" &&
          String(error.message || "").toLowerCase().includes("semester")
        ) {
          setHasSemesterColumn(false);
          setSemesterWarning("Semester assignment column is missing in backend subjects table.");
          const { semester: _SEMESTER, ...retryPayload } = updatePayload;
          ({ error } = await supabase
            .from("subjects")
            .update(retryPayload)
            .eq("id", editingSubjectId));
          if (!error) {
            toast.warning(
              "Saved, but semester was not stored because subjects.semester is missing."
            );
          }
        }
        if (error) throw error;
        toast.success("Subject updated.");
      } else {
        const insertPayload = {
          faculty_id: facultyId,
          department_id: departmentId,
          name,
          code,
          is_active: Boolean(form.isActive),
          ...(hasSemesterColumn ? { semester } : {}),
        };
        let { error } = await supabase.from("subjects").insert([insertPayload]);
        if (
          error &&
          error.code === "42703" &&
          String(error.message || "").toLowerCase().includes("semester")
        ) {
          setHasSemesterColumn(false);
          setSemesterWarning("Semester assignment column is missing in backend subjects table.");
          const { semester: _SEMESTER, ...retryPayload } = insertPayload;
          ({ error } = await supabase.from("subjects").insert([retryPayload]));
          if (!error) {
            toast.warning(
              "Saved, but semester was not stored because subjects.semester is missing."
            );
          }
        }
        if (error) throw error;
        toast.success("Subject created.");
      }

      closeFormModal();
      await refreshData(false);
    } catch (error) {
      toast.error(error?.message || "Failed to save subject.");
    } finally {
      setSavingSubject(false);
    }
  };

  const openDelete = (subject) => {
    setSubjectToDelete(subject);
  };

  const closeDelete = () => {
    if (deletingSubject) return;
    setSubjectToDelete(null);
  };

  const deleteSubject = async () => {
    if (!subjectToDelete?.id) return;

    setDeletingSubject(true);
    try {
      const { error } = await supabase
        .from("subjects")
        .delete()
        .eq("id", subjectToDelete.id);
      if (error) throw error;

      setSubjectToDelete(null);
      toast.success("Subject deleted.");
      await refreshData(false);
    } catch (error) {
      toast.error(error?.message || "Failed to delete subject.");
    } finally {
      setDeletingSubject(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="w-full p-8 text-center text-gray-500">Loading subjects from backend...</div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-8 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-4xl font-bold leading-tight">Subject Management</h2>
            <p className="mt-2 text-white/90">
              Register and manage subjects by faculty/department filters.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => refreshData(false)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              disabled={refreshing}
            >
              <FiRefreshCw />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
            >
              <FiPlus />
              Add Subject
            </button>
          </div>
        </div>
      </div>

      {backendError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {backendError}
        </div>
      )}
      {semesterWarning && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700">
          {semesterWarning}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-gray-900">Filter Subjects</h3>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject name/code"
            className="rounded-lg border px-3 py-2 xl:col-span-2"
          />

          <select
            value={filters.facultyId}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                facultyId: e.target.value,
                departmentId: "",
              }))
            }
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
            value={filters.semester}
            onChange={(e) => setFilters((prev) => ({ ...prev, semester: e.target.value }))}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">All Semesters</option>
            {SEMESTER_OPTIONS.map((semester) => (
              <option key={semester} value={semester}>
                {semester}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-lg border px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredSubjects.length}</span> of{" "}
          <span className="font-semibold">{subjects.length}</span> subject(s).
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Faculty</th>
                <th className="py-2 pr-3">Department</th>
                <th className="py-2 pr-3">Semester</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-medium">{subject.name}</td>
                  <td className="py-2 pr-3">{subject.code}</td>
                  <td className="py-2 pr-3">{subject.facultyName}</td>
                  <td className="py-2 pr-3">{subject.departmentName}</td>
                  <td className="py-2 pr-3">{subject.semester || "-"}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        subject.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {subject.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(subject)}
                        className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"
                        title="Edit subject"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        onClick={() => openDelete(subject)}
                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 hover:bg-red-100"
                        title="Delete subject"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSubjects.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SubjectFormModal
        open={formMode === "add" || formMode === "edit"}
        mode={formMode}
        onClose={closeFormModal}
        onSubmit={saveSubject}
        form={form}
        setForm={setForm}
        faculties={faculties}
        departments={departments}
        hasSemesterColumn={hasSemesterColumn}
        submitting={savingSubject}
      />

      <DeleteSubjectModal
        open={Boolean(subjectToDelete)}
        subject={subjectToDelete}
        onCancel={closeDelete}
        onConfirm={deleteSubject}
        deleting={deletingSubject}
      />
    </div>
  );
}
