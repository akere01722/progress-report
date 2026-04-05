import { useEffect, useMemo, useState } from "react";
import { FiBookOpen, FiCheckCircle, FiClock } from "react-icons/fi";
import { toast } from "react-toastify";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";

function getSemesterFromDate(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 10 || month <= 1) return "FIRST SEMESTER";
  if (month >= 2 && month <= 5) return "SECOND SEMESTER";
  return "SECOND SEMESTER";
}

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const parseNumericId = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) return null;
  return num;
};

const normalizeSemester = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("first") || raw === "1" || raw.includes("sem 1") || raw.includes("semester 1")) {
    return "FIRST SEMESTER";
  }
  if (raw.includes("second") || raw === "2" || raw.includes("sem 2") || raw.includes("semester 2")) {
    return "SECOND SEMESTER";
  }
  return "";
};

const semesterRank = (semester) => {
  if (semester === "FIRST SEMESTER") return 1;
  if (semester === "SECOND SEMESTER") return 2;
  return 99;
};

export default function StudentCourses() {
  const [userData] = useState(readUserData);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState("");

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (!active) return;
        setBackendError("Supabase is not configured. Check your environment keys.");
        setAllCourses([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const studentColumns = "id,matricule,email,full_name,faculty_id,department_id,program,level";
        let studentRow = null;

        const studentId = parseNumericId(userData?.id);
        if (studentId != null) {
          const { data, error } = await supabase
            .from("students")
            .select(studentColumns)
            .eq("id", studentId)
            .maybeSingle();
          if (error) throw error;
          if (data) studentRow = data;
        }

        if (!studentRow && userData?.matricule) {
          const { data, error } = await supabase
            .from("students")
            .select(studentColumns)
            .ilike("matricule", String(userData.matricule).trim())
            .maybeSingle();
          if (error) throw error;
          if (data) studentRow = data;
        }

        if (!studentRow && userData?.email) {
          const { data, error } = await supabase
            .from("students")
            .select(studentColumns)
            .ilike("email", String(userData.email).trim())
            .maybeSingle();
          if (error) throw error;
          if (data) studentRow = data;
        }

        if (!studentRow) {
          throw new Error("Student profile not found. Please sign in again.");
        }

        const selectCandidates = [
          "id,name,code,semester,is_active,faculty_id,department_id,created_at",
          "id,name,code,semester,is_active,faculty_id,department_id",
          "id,name,code,is_active,faculty_id,department_id",
          "id,name,code,faculty_id,department_id",
        ];

        let subjectRows = [];
        let lastError = null;

        for (const selectColumns of selectCandidates) {
          const { data, error } = await supabase
            .from("subjects")
            .select(selectColumns)
            .eq("faculty_id", studentRow.faculty_id)
            .eq("department_id", studentRow.department_id)
            .order("name", { ascending: true });

          if (error) {
            lastError = error;
            continue;
          }
          subjectRows = data || [];
          lastError = null;
          break;
        }

        if (lastError) throw lastError;

        const baseCourses = (subjectRows || [])
          .filter((row) => row?.is_active !== false)
          .map((row, index) => ({
            id: String(row?.id ?? `course-${index}`),
            code: String(row?.code || "").trim() || "N/A",
            name: String(row?.name || "").trim() || "Unnamed Subject",
            semesterRaw: row?.semester,
          }));

        const half = Math.ceil(baseCourses.length / 2);
        const normalizedCourses = baseCourses.map((course, index) => {
          const normalized = normalizeSemester(course.semesterRaw);
          return {
            id: course.id,
            code: course.code,
            name: course.name,
            semester: normalized || (index < half ? "FIRST SEMESTER" : "SECOND SEMESTER"),
          };
        });

        if (!active) return;
        setAllCourses(normalizedCourses);
        setBackendError(
          normalizedCourses.length === 0
            ? "No subjects found for your faculty and department."
            : ""
        );
      } catch (error) {
        if (!active) return;
        setAllCourses([]);
        setBackendError(error?.message || "Failed to load courses from backend.");
        toast.error(error?.message || "Failed to load courses from backend.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCourses();
    return () => {
      active = false;
    };
  }, [userData]);

  const currentSemester = getSemesterFromDate();

  const offeredCourses = useMemo(() => {
    const currentRank = semesterRank(currentSemester);
    return allCourses.filter((course) => semesterRank(course.semester) < currentRank);
  }, [allCourses, currentSemester]);

  const remainingCourses = useMemo(() => {
    const offeredIds = new Set(offeredCourses.map((course) => course.id));
    return allCourses.filter((course) => !offeredIds.has(course.id));
  }, [allCourses, offeredCourses]);

  const progress = useMemo(() => {
    const total = allCourses.length;
    const completed = offeredCourses.length;
    const remaining = remainingCourses.length;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, remaining, pct };
  }, [allCourses.length, offeredCourses.length, remainingCourses.length]);

  const rows = useMemo(() => {
    const currentRank = semesterRank(currentSemester);
    return allCourses.map((course) => {
      const rank = semesterRank(course.semester);
      let status = "Remaining";
      if (rank < currentRank) status = "Offered";
      if (rank === currentRank) status = "Current";
      return { ...course, status };
    });
  }, [allCourses, currentSemester]);

  const badgeClass = (status) => {
    if (status === "Current") return "border-blue-200 bg-blue-50 text-blue-700";
    if (status === "Offered") return "border-green-200 bg-green-50 text-green-700";
    return "border-red-200 bg-red-50 text-red-700";
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        Loading courses from backend...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
            <p className="mt-1 text-sm text-gray-500">
              Live subjects from your faculty and department.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700">
            Current Semester: {currentSemester}
          </div>
        </div>

        {backendError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {backendError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-700">Total</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-blue-900">
              <FiBookOpen /> {progress.total}
            </p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-semibold text-green-700">Offered</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-green-900">
              <FiCheckCircle /> {progress.completed}
            </p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-700">Remaining</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-red-900">
              <FiClock /> {progress.remaining}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
            <span>Progress</span>
            <span className="text-gray-900">{progress.pct}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Course List</h2>
          <p className="text-xs text-gray-500">{rows.length} course(s)</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Code</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Semester</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((course) => (
                <tr key={course.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-semibold text-gray-900">{course.code}</td>
                  <td className="py-2 pr-3 text-gray-700">{course.name}</td>
                  <td className="py-2 pr-3 text-gray-600">
                    {course.semester === "FIRST SEMESTER" ? "Semester 1" : "Semester 2"}
                  </td>
                  <td className="py-2">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass(
                        course.status
                      )}`}
                    >
                      {course.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
              No courses available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
