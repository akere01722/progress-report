import { useEffect, useMemo, useState } from "react";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";

export default function Students() {
  const [loading, setLoading] = useState(true);

  // Lookups
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [levels, setLevels] = useState([]);

  // Filters (UUIDs)
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [levelId, setLevelId] = useState("");

  // List
  const [students, setStudents] = useState([]);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Create user popup
  const [creating, setCreating] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");

  const [formMatricule, setFormMatricule] = useState("");
  const [formBatch, setFormBatch] = useState("2025/2026");

  const [formFacultyId, setFormFacultyId] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formProgramId, setFormProgramId] = useState("");
  const [formLevelId, setFormLevelId] = useState("");

  const loadLookups = async () => {
    const [fRes, dRes, pRes, lRes] = await Promise.all([
      supabase.from("faculties").select("id,name").order("name"),
      supabase.from("departments").select("id,name,faculty_id").order("name"),
      supabase.from("programs").select("id,name,department_id").order("name"),
      supabase.from("levels").select("id,name").order("name"),
    ]);

    if (fRes.error) throw fRes.error;
    if (dRes.error) throw dRes.error;
    if (pRes.error) throw pRes.error;
    if (lRes.error) throw lRes.error;

    setFaculties(fRes.data || []);
    setDepartments(dRes.data || []);
    setPrograms(pRes.data || []);
    setLevels(lRes.data || []);
  };

  const fetchStudents = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, profile_id, matricule, batch, status, faculty_id, department_id, program_id, level_id, created_at");

      if (studentsError) {
        console.error("Students fetch error:", studentsError.message);

        if (studentsError.code === "42703" || studentsError.message.includes("created_at")) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("students")
            .select("id, profile_id, matricule, batch, status, faculty_id, department_id, program_id, level_id");

          if (fallbackError) throw fallbackError;

          setStudents(
            (fallbackData || []).map((row) => ({
              id: row.id,
              profile_id: row.profile_id,
              name: "Unknown",
              email: "",
              username: "",
              matricule: row.matricule || "",
              batch: row.batch || "",
              status: row.status || "active",
              faculty_id: row.faculty_id,
              department_id: row.department_id,
              program_id: row.program_id,
              level_id: row.level_id,
            }))
          );
          return;
        }

        throw studentsError;
      }

      const profileIds = [...new Set((studentsData || []).map((s) => s.profile_id).filter(Boolean))];

      let profilesMap = {};

      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, username")
          .in("id", profileIds);

        if (!profilesError && profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const studentsWithProfiles = (studentsData || []).map((row) => ({
        id: row.id,
        profile_id: row.profile_id,
        name: profilesMap[row.profile_id]?.full_name || "Unknown",
        email: profilesMap[row.profile_id]?.email || "",
        username: profilesMap[row.profile_id]?.username || "",
        matricule: row.matricule || "",
        batch: row.batch || "",
        status: row.status || "active",
        faculty_id: row.faculty_id,
        department_id: row.department_id,
        program_id: row.program_id,
        level_id: row.level_id,
        created_at: row.created_at,
      }));

      studentsWithProfiles.sort((a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setStudents(studentsWithProfiles);
    } catch (err) {
      console.error("fetchStudents error:", err);
      throw err;
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadLookups();
        await fetchStudents();
      } catch (e) {
        alert(e?.message || "Failed to load students.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredDepartments = useMemo(() => {
    if (!facultyId) return [];
    return departments.filter((d) => d.faculty_id === facultyId);
  }, [departments, facultyId]);

  const filteredPrograms = useMemo(() => {
    if (!departmentId) return [];
    return programs.filter((p) => p.department_id === departmentId);
  }, [programs, departmentId]);

  const formDepartments = useMemo(() => {
    if (!formFacultyId) return [];
    return departments.filter((d) => d.faculty_id === formFacultyId);
  }, [departments, formFacultyId]);

  const formPrograms = useMemo(() => {
    if (!formDepartmentId) return [];
    return programs.filter((p) => p.department_id === formDepartmentId);
  }, [programs, formDepartmentId]);

  const filteredStudentsList = useMemo(() => {
    return students.filter((s) => {
      const f = facultyId ? s.faculty_id === facultyId : true;
      const d = departmentId ? s.department_id === departmentId : true;
      const p = programId ? s.program_id === programId : true;
      const l = levelId ? s.level_id === levelId : true;
      return f && d && p && l;
    });
  }, [students, facultyId, departmentId, programId, levelId]);

  const summary = `Showing ${filteredStudentsList.length} student(s)`;

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormUsername("");
    setFormMatricule("");
    setFormBatch("2025/2026");
    setFormFacultyId("");
    setFormDepartmentId("");
    setFormProgramId("");
    setFormLevelId("");
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const payload = {
        email: formEmail.trim().toLowerCase(),
        role: "student",
        full_name: formName.trim(),
        username: formUsername.trim() ? formUsername.trim().toLowerCase() : null,
        matricule: formMatricule.trim(),
        batch: formBatch.trim(),
        faculty_id: formFacultyId,
        department_id: formDepartmentId,
        program_id: formProgramId,
        level_id: formLevelId,
      };

      console.log("Submitting student payload:", payload);

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: payload,
      });

      console.log("Function response data:", data);
      console.log("Function response error:", error);

      if (error) {
        throw new Error(error.message || "Edge Function returned an error");
      }

      if (!data?.ok) {
        throw new Error(data?.error || "Failed to create student");
      }

      setCreatedCreds({
        email: data?.email || payload.email,
        username: data?.username || payload.username || "",
        tempPassword: data?.tempPassword || null,
        note: data?.note || "",
      });

      setShowCredsModal(true);
      setShowRegisterModal(false);
      resetForm();
      await fetchStudents();
    } catch (err) {
      console.error("Create student failed:", err);
      alert(err?.message || "Failed to create student.");
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      setLoading(true);

      const profileUpdate = {
        full_name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        username: formUsername.trim().toLowerCase() || null,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", selectedStudent.profile_id);

      if (profileError) throw profileError;

      const studentUpdate = {
        matricule: formMatricule.trim(),
        batch: formBatch.trim(),
        faculty_id: formFacultyId,
        department_id: formDepartmentId,
        program_id: formProgramId,
        level_id: formLevelId,
      };

      const { error: studentError } = await supabase
        .from("students")
        .update(studentUpdate)
        .eq("id", selectedStudent.id);

      if (studentError) throw studentError;

      alert("Student updated successfully!");
      setShowEditModal(false);
      await fetchStudents();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      setFormName(selectedStudent.name || "");
      setFormEmail(selectedStudent.email || "");
      setFormUsername(selectedStudent.username || "");
      setFormMatricule(selectedStudent.matricule || "");
      setFormBatch(selectedStudent.batch || "");
      setFormFacultyId(selectedStudent.faculty_id || "");
      setFormDepartmentId(selectedStudent.department_id || "");
      setFormProgramId(selectedStudent.program_id || "");
      setFormLevelId(selectedStudent.level_id || "");
    }
  }, [selectedStudent]);

  const handleDelete = () => {
    alert("Delete will be wired later safely.");
    setShowDeleteModal(false);
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Students Management</h1>

        <button
          onClick={() => {
            resetForm();
            setShowRegisterModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          + Register Student
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              className="border p-3 rounded-lg"
              value={facultyId}
              onChange={(e) => {
                setFacultyId(e.target.value);
                setDepartmentId("");
                setProgramId("");
                setLevelId("");
              }}
            >
              <option value="">Select Faculty</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <select
              className="border p-3 rounded-lg"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setProgramId("");
                setLevelId("");
              }}
              disabled={!facultyId}
            >
              <option value="">Select Department</option>
              {filteredDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              className="border p-3 rounded-lg"
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                setLevelId("");
              }}
              disabled={!departmentId}
            >
              <option value="">Select Program</option>
              {filteredPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="border p-3 rounded-lg"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              disabled={!programId}
            >
              <option value="">Select Level</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchStudents}
            disabled={loading}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 ml-2"
            title="Refresh students"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <p className="text-gray-600 font-medium">{summary}</p>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-8">
        <div className="grid grid-cols-[1.2fr_1.8fr_2.2fr_1.2fr_1fr_1fr] gap-6 p-4 border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 sticky top-0">
          <span>Matricule</span>
          <span>Name</span>
          <span>Email</span>
          <span>Batch</span>
          <span>Status</span>
          <span className="text-center">Actions</span>
        </div>

        <div className="mt-4 space-y-4">
          {filteredStudentsList.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[1.2fr_1.8fr_2.2fr_1.2fr_1fr_1fr] gap-6 items-center bg-gray-50 hover:bg-gray-100 p-4 rounded-lg transition"
            >
              <span className="font-medium">{s.matricule || "—"}</span>
              <span>{s.name}</span>
              <span className="block max-w-[320px] truncate text-gray-700">{s.email}</span>
              <span>{s.batch || "—"}</span>

              <span className="inline-flex w-fit px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                {s.status}
              </span>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setSelectedStudent(s);
                    setShowEditModal(true);
                  }}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                  title="Edit"
                >
                  <FiEdit />
                </button>

                <button
                  onClick={() => {
                    setSelectedStudent(s);
                    setShowDeleteModal(true);
                  }}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                  title="Delete"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}

          {filteredStudentsList.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No students found for the selected filters.
            </div>
          )}
        </div>
      </div>

      {showCredsModal && createdCreds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Student Account Created ✅</h2>
            <p className="text-sm text-gray-600 mb-4">
              Share these login details. If no password is shown, use "Forgot password".
            </p>

            <div className="bg-gray-50 border rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Email</span>
                <span className="font-semibold">{createdCreds.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Username</span>
                <span className="font-semibold">{createdCreds.username || "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Temp Password</span>
                <span className="font-semibold">{createdCreds.tempPassword || "—"}</span>
              </div>
              {createdCreds.note && (
                <p className="text-xs text-gray-500 mt-2">{createdCreds.note}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${createdCreds.email}\nTemp Password: ${createdCreds.tempPassword || "-"}`
                  );
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg font-semibold"
              >
                Copy
              </button>
              <button
                onClick={() => setShowCredsModal(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Register Student</h2>

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
              <input
                type="text"
                placeholder="Username (optional)"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                className="border p-2 w-full rounded"
              />
              <input
                type="text"
                placeholder="Matricule (e.g. ACC/25/0001)"
                value={formMatricule}
                onChange={(e) => setFormMatricule(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />
              <input
                type="text"
                placeholder="Batch (e.g. 2025/2026)"
                value={formBatch}
                onChange={(e) => setFormBatch(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />

              <select
                value={formFacultyId}
                onChange={(e) => {
                  setFormFacultyId(e.target.value);
                  setFormDepartmentId("");
                  setFormProgramId("");
                  setFormLevelId("");
                }}
                className="border p-2 w-full rounded"
                required
              >
                <option value="">Select Faculty</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                value={formDepartmentId}
                onChange={(e) => {
                  setFormDepartmentId(e.target.value);
                  setFormProgramId("");
                  setFormLevelId("");
                }}
                className="border p-2 w-full rounded"
                disabled={!formFacultyId}
                required
              >
                <option value="">Select Department</option>
                {formDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={formProgramId}
                onChange={(e) => {
                  setFormProgramId(e.target.value);
                  setFormLevelId("");
                }}
                className="border p-2 w-full rounded"
                disabled={!formDepartmentId}
                required
              >
                <option value="">Select Program</option>
                {formPrograms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={formLevelId}
                onChange={(e) => setFormLevelId(e.target.value)}
                className="border p-2 w-full rounded"
                disabled={!formProgramId}
                required
              >
                <option value="">Select Level</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Edit Student</h2>
            <p className="text-sm text-gray-600">
              Next step: update both <b>profiles</b> and <b>students</b>.
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Delete Student</h2>
            <p className="text-sm text-gray-600">
              Next step: delete student safely (and optionally disable auth user).
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
