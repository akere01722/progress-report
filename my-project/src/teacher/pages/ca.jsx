import { useMemo, useState } from "react";
import { FiUpload, FiBookOpen, FiLayers, FiCalendar, FiSearch } from "react-icons/fi";

export default function UploadCAMarks() {
  const academicData = useMemo(() => ({
    "Level 100": {
      semesters: {
        "Semester 1": {
          courses: [
            { code: "CSC101", title: "Intro to Computing" },
            { code: "MTH101", title: "Mathematics I" },
          ],
          students: [
            { id: "ST1001", name: "Alice Nfor" },
            { id: "ST1002", name: "Brian Tamba" },
            { id: "ST1003", name: "Clara Mbua" },
          ],
        },
        "Semester 2": {
          courses: [{ code: "CSC102", title: "Programming I" }],
          students: [
            { id: "ST1001", name: "Alice Nfor" },
            { id: "ST1002", name: "Brian Tamba" },
          ],
        },
      },
    },
    "Level 200": {
      semesters: {
        "Semester 1": {
          courses: [{ code: "CSC201", title: "Data Structures" }],
          students: [
            { id: "ST2001", name: "Daniel Fonkeng" },
            { id: "ST2002", name: "Emmanuel Tita" },
          ],
        },
      },
    },
  }), []);

  const levelOptions = Object.keys(academicData);

  // ✅ placeholders
  const [level, setLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [course, setCourse] = useState("");

  const [search, setSearch] = useState("");
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const semesterOptions = useMemo(() => {
    if (!level) return [];
    return Object.keys(academicData[level].semesters);
  }, [academicData, level]);

  const courses = useMemo(() => {
    if (!level || !semester) return [];
    return academicData[level].semesters[semester].courses;
  }, [academicData, level, semester]);

  const students = useMemo(() => {
    if (!level || !semester) return [];
    return academicData[level].semesters[semester].students;
  }, [academicData, level, semester]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [students, search]);

  const handleMarkChange = (studentId, value) => {
    if (value === "") {
      setMarks((prev) => ({ ...prev, [studentId]: "" }));
      return;
    }
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n <= 30) {
      setMarks((prev) => ({ ...prev, [studentId]: value }));
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      alert("CA marks submitted successfully!");
    } finally {
      setSaving(false);
    }
  };

  const canShowTable = Boolean(level && semester && course);

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Upload Continuous Assessment (CA)
          </h1>
          <p className="text-gray-500 mt-1">
            Select level, semester and course to enter CA marks.
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Level */}
          <div className="lg:col-span-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiLayers className="text-blue-600" />
            <select
              value={level}
              onChange={(e) => {
                const lvl = e.target.value;
                setLevel(lvl);
                setSemester("");
                setCourse("");
                setSearch("");
                setMarks({});
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
            >
              <option value="" disabled>
                Select Level
              </option>
              {levelOptions.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Semester */}
          <div className="lg:col-span-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <select
              value={semester}
              disabled={!level}
              onChange={(e) => {
                const sem = e.target.value;
                setSemester(sem);
                setCourse("");
                setSearch("");
                setMarks({});
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              <option value="" disabled>
                Select Semester
              </option>
              {semesterOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div className="lg:col-span-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiBookOpen className="text-blue-600" />
            <select
              value={course}
              disabled={!level || !semester}
              onChange={(e) => {
                setCourse(e.target.value);
                setSearch("");
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              <option value="" disabled>
                Select Course
              </option>
              {courses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
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

        <p className="mt-3 text-sm text-gray-500">
          {canShowTable
            ? `Now entering CA marks for ${level} • ${semester} • ${course}`
            : "Choose Level → Semester → Course to load students."}
        </p>
      </div>

      {/* TABLE (only after all dropdowns selected) */}
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
                  <tr key={student.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-5 sm:px-6 py-3 font-semibold text-gray-900">
                      {student.id}
                    </td>
                    <td className="px-5 sm:px-6 py-3 text-gray-700">{student.name}</td>
                    <td className="px-5 sm:px-6 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={marks[student.id] ?? ""}
                        onChange={(e) => handleMarkChange(student.id, e.target.value)}
                        className="w-24 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0–30"
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

          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={submit}
              disabled={saving}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3
                text-sm font-semibold text-white shadow-sm transition
                ${saving ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5"}`}
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
