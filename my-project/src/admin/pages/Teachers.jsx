import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { FiEdit, FiUserPlus, FiUserX } from "react-icons/fi";

const employmentTypes = ["Full-Time", "Part-Time", "Visiting"];

export default function Teachers() {
  const [loading, setLoading] = useState(true);

  // Lookups
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employment, setEmployment] = useState("");

  // List
  const [teachers, setTeachers] = useState([]);

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const [creating, setCreating] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formStaffId, setFormStaffId] = useState("");
  const [formEmployment, setFormEmployment] = useState("Full-Time");

  const [formFacultyId, setFormFacultyId] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");

  const loadLookups = async () => {
    const [fRes, dRes] = await Promise.all([
      supabase.from("faculties").select("id,name").order("name"),
      supabase.from("departments").select("id,name,faculty_id").order("name"),
    ]);

    if (fRes.error) throw fRes.error;
    if (dRes.error) throw dRes.error;

    setFaculties(fRes.data || []);
    setDepartments(dRes.data || []);
  };

  const fetchTeachers = async () => {
    try {
      // Get teachers with specific columns (avoid * which may cause issues)
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("id, profile_id, staff_id, faculty_id, department_id, employment, status, created_at");

      if (teachersError) {
        console.error("Teachers fetch error:", teachersError.message);
        
        // Try without created_at if it doesn't exist (PostgreSQL error code 42703)
        if (teachersError.code === "42703" || teachersError.message.includes("created_at")) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("teachers")
            .select("id, profile_id, staff_id, faculty_id, department_id, employment, status");
          
          if (fallbackError) throw fallbackError;
          
          setTeachers(
            (fallbackData || []).map((row) => ({
              id: row.id,
              profile_id: row.profile_id,
              staff_id: row.staff_id || "",
              faculty_id: row.faculty_id,
              department_id: row.department_id,
              employment: row.employment || "",
              status: row.status || "active",
              name: "Unknown",
              email: "",
              username: "",
            }))
          );
          return;
        }
        
        throw teachersError;
      }

      // Collect unique profile IDs
      const profileIds = [...new Set((teachersData || [])
        .map(t => t.profile_id)
        .filter(Boolean))];
      
      let profilesMap = {};
      
      // Fetch profiles separately if we have profile IDs
      if (profileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, username")
          .in("id", profileIds);
        
        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Map teachers with their profile data
      const teachersWithProfiles = (teachersData || []).map((row) => ({
        id: row.id,
        profile_id: row.profile_id,
        staff_id: row.staff_id || "",
        faculty_id: row.faculty_id,
        department_id: row.department_id,
        employment: row.employment || "",
        status: row.status || "active",
        name: profilesMap[row.profile_id]?.full_name || "Unknown",
        email: profilesMap[row.profile_id]?.email || "",
        username: profilesMap[row.profile_id]?.username || "",
        created_at: row.created_at,
      }));

      // Sort by created_at in JavaScript if available
      teachersWithProfiles.sort((a, b) => {
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setTeachers(teachersWithProfiles);
    } catch (err) {
      console.error("fetchTeachers error:", err);
      throw err;
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadLookups();
        await fetchTeachers();
      } catch (e) {
        alert(e?.message || "Failed to load teachers.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredDepartments = useMemo(() => {
    if (!facultyId) return [];
    return departments.filter((d) => d.faculty_id === facultyId);
  }, [departments, facultyId]);

  const formDepartments = useMemo(() => {
    if (!formFacultyId) return [];
    return departments.filter((d) => d.faculty_id === formFacultyId);
  }, [departments, formFacultyId]);

  const filteredTeachersList = useMemo(() => {
    return teachers.filter((t) => {
      const f = facultyId ? t.faculty_id === facultyId : true;
      const d = departmentId ? t.department_id === departmentId : true;
      const e = employment ? t.employment === employment : true;
      return f && d && e;
    });
  }, [teachers, facultyId, departmentId, employment]);

  const summary = `Showing ${filteredTeachersList.length} teacher(s)`;

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormUsername("");
    setFormStaffId("");
    setFormEmployment("Full-Time");
    setFormFacultyId("");
    setFormDepartmentId("");
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const payload = {
        email: formEmail.trim().toLowerCase(),
        role: "teacher",
        full_name: formName.trim(),
        username: formUsername.trim() ? formUsername.trim().toLowerCase() : null,

        staff_id: formStaffId.trim(),
        employment: formEmployment,

        faculty_id: formFacultyId || null,
        department_id: formDepartmentId, // required by your edge function
      };

      const { data, error } = await supabase.functions.invoke("create-user", {
        body: payload,
      });

      if (error) throw error;

      setCreatedCreds({
        email: data?.email || payload.email,
        username: data?.username || payload.username || "",
        tempPassword: data?.tempPassword || null,
        note: data?.note || "",
      });
      setShowCredsModal(true);

      setShowRegisterModal(false);
      resetForm();
      await fetchTeachers();
    } catch (err) {
      alert(err?.message || "Failed to create teacher. Check Edge Function logs.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Teachers Management</h1>

        <button
          onClick={() => {
            resetForm();
            setShowRegisterModal(true);
          }}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          + Register Teacher
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="border p-3 rounded-lg"
            value={facultyId}
            onChange={(e) => {
              setFacultyId(e.target.value);
              setDepartmentId("");
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
            onChange={(e) => setDepartmentId(e.target.value)}
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
            value={employment}
            onChange={(e) => setEmployment(e.target.value)}
          >
            <option value="">Employment Type</option>
            {employmentTypes.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-gray-600 font-medium">{summary}</p>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow-lg rounded-xl p-8">
        <div className="grid grid-cols-[1.2fr_1.8fr_2.2fr_1.2fr_1fr_1fr] gap-6 font-semibold text-gray-600 border-b-2 p-4 text-sm items-center">
          <span>Staff ID</span>
          <span>Name</span>
          <span>Email</span>
          <span>Employment</span>
          <span>Status</span>
          <span className="text-center">Actions</span>
        </div>

        <div className="mt-4 space-y-4">
          {filteredTeachersList.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[1.2fr_1.8fr_2.2fr_1.2fr_1fr_1fr] gap-6 items-center bg-gray-50 hover:bg-gray-100 p-4 rounded-lg transition"
            >
              <span className="font-medium">{t.staff_id || "—"}</span>
              <span>{t.name}</span>
              <span className="block max-w-[320px] truncate text-gray-700">{t.email}</span>
              <span>{t.employment || "—"}</span>

              <span className="inline-flex w-fit px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                {t.status}
              </span>

              <div className="flex justify-center gap-3">
                <button className="p-2 bg-blue-100 text-blue-600 rounded-lg" title="Edit (next)">
                  <FiEdit />
                </button>
                <button className="p-2 bg-green-100 text-green-600 rounded-lg" title="Assign courses (next)">
                  <FiUserPlus />
                </button>
                <button className="p-2 bg-red-100 text-red-600 rounded-lg" title="Delete (next)">
                  <FiUserX />
                </button>
              </div>
            </div>
          ))}

          {filteredTeachersList.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No teachers found for the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* CREDENTIALS MODAL */}
      {showCredsModal && createdCreds && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Teacher Account Created ✅</h2>
            <p className="text-sm text-gray-600 mb-4">
              Share these login details. If no password is shown, use “Forgot password”.
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

      {/* REGISTER MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Register Teacher</h2>

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
                placeholder="Staff ID (e.g. ACC-T001)"
                value={formStaffId}
                onChange={(e) => setFormStaffId(e.target.value)}
                className="border p-2 w-full rounded"
                required
              />

              <select
                value={formEmployment}
                onChange={(e) => setFormEmployment(e.target.value)}
                className="border p-2 w-full rounded"
              >
                {employmentTypes.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>

              <select
                value={formFacultyId}
                onChange={(e) => {
                  setFormFacultyId(e.target.value);
                  setFormDepartmentId("");
                }}
                className="border p-2 w-full rounded"
              >
                <option value="">Select Faculty (optional)</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              <select
                value={formDepartmentId}
                onChange={(e) => setFormDepartmentId(e.target.value)}
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
    </div>
  );
}