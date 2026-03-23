import { useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiBookOpen,
  FiLayers,
  FiSearch,
  FiCalendar,
  FiRefreshCw,
} from "react-icons/fi";

export default function TeacherAttendance() {
  const levelsData = useMemo(() => ({
    "Level 100": {
      program: "BSc Computer Science",
      courses: [
        { code: "CSC101", title: "Introduction to Computing" },
        { code: "MTH101", title: "Mathematics I" },
      ],
      students: [
        { id: "ST1001", name: "Alice Nfor" },
        { id: "ST1002", name: "Brian Tamba" },
        { id: "ST1003", name: "Clara Mbua" },
        { id: "ST1004", name: "Daniel Fonkeng" },
      ],
    },
    "Level 200": {
      program: "BSc Computer Science",
      courses: [
        { code: "CSC201", title: "Data Structures" },
        { code: "CSC202", title: "Discrete Mathematics" },
      ],
      students: [
        { id: "ST2001", name: "Emmanuel Tita" },
        { id: "ST2002", name: "Grace Forbi" },
        { id: "ST2003", name: "Henry Nsoh" },
      ],
    },
  }), []);

  const levelOptions = Object.keys(levelsData);

  // ✅ placeholders (same fix like CA/Exams)
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");

  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState({}); // { studentId: "present" | "absent" }
  const [sessionDate, setSessionDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });

  const courseOptions = useMemo(() => {
    if (!selectedLevel) return [];
    return levelsData[selectedLevel].courses;
  }, [levelsData, selectedLevel]);

  const students = useMemo(() => {
    if (!selectedLevel || !selectedCourse) return [];
    return levelsData[selectedLevel].students;
  }, [levelsData, selectedLevel, selectedCourse]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [students, search]);

  const canUseTable = Boolean(selectedLevel && selectedCourse);

  const toggleAttendance = (studentId, status) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const markedCount = useMemo(() => {
    if (!canUseTable) return 0;
    return students.filter((s) => attendance[s.id]).length;
  }, [students, attendance, canUseTable]);

  const presentCount = useMemo(() => {
    if (!canUseTable) return 0;
    return students.filter((s) => attendance[s.id] === "present").length;
  }, [students, attendance, canUseTable]);

  const absentCount = useMemo(() => {
    if (!canUseTable) return 0;
    return students.filter((s) => attendance[s.id] === "absent").length;
  }, [students, attendance, canUseTable]);

  const clearMarks = () => setAttendance({});

  const submit = () => {
    // Replace with Supabase later
    alert(
      `Attendance saved!\nDate: ${sessionDate}\nLevel: ${selectedLevel}\nCourse: ${selectedCourse}\nMarked: ${markedCount}/${students.length}`
    );
  };

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Attendance
          </h1>
          <p className="text-gray-500 mt-1">
            Select level and course, then mark students present or absent.
          </p>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
            Marked: <span className="ml-1 text-gray-900">{markedCount}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900">{canUseTable ? students.length : 0}</span>
          </span>
          <span className="inline-flex items-center rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
            Present: <span className="ml-1">{presentCount}</span>
          </span>
          <span className="inline-flex items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            Absent: <span className="ml-1">{absentCount}</span>
          </span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Level */}
          <div className="lg:col-span-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiLayers className="text-blue-600" />
            <select
              value={selectedLevel}
              onChange={(e) => {
                const lvl = e.target.value;
                setSelectedLevel(lvl);
                setSelectedCourse(""); // reset
                setSearch("");
                setAttendance({});
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

          {/* Course */}
          <div className="lg:col-span-5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiBookOpen className="text-blue-600" />
            <select
              value={selectedCourse}
              disabled={!selectedLevel}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSearch("");
                setAttendance({});
              }}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700 disabled:opacity-60"
            >
              <option value="" disabled>
                Select Course
              </option>
              {courseOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiCalendar className="text-blue-600" />
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full bg-transparent outline-none text-sm font-semibold text-gray-700"
            />
          </div>

          {/* Search */}
          <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiSearch className="text-gray-400" />
            <input
              value={search}
              disabled={!canUseTable}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student..."
              className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-gray-500">
            {canUseTable
              ? `Marking attendance for ${selectedLevel} • ${selectedCourse} • ${sessionDate}`
              : "Choose Level → Course to load students."}
          </p>

          <button
            type="button"
            onClick={clearMarks}
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <FiRefreshCw />
            Clear marks
          </button>
        </div>
      </div>

      {/* TABLE */}
      {canUseTable && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Student List</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tap “Present” or “Absent” for each student.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const bulk = {};
                  students.forEach((s) => (bulk[s.id] = "present"));
                  setAttendance(bulk);
                }}
                className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 transition"
              >
                Mark all Present
              </button>

              <button
                type="button"
                onClick={() => {
                  const bulk = {};
                  students.forEach((s) => (bulk[s.id] = "absent"));
                  setAttendance(bulk);
                }}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
              >
                Mark all Absent
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-5 sm:px-6 py-3 font-semibold text-gray-600">
                    Student ID
                  </th>
                  <th className="text-left px-5 sm:px-6 py-3 font-semibold text-gray-600">
                    Name
                  </th>
                  <th className="text-center px-5 sm:px-6 py-3 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-center px-5 sm:px-6 py-3 font-semibold text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student) => {
                  const status = attendance[student.id];

                  return (
                    <tr key={student.id} className="border-t hover:bg-gray-50 transition">
                      <td className="px-5 sm:px-6 py-3 font-semibold text-gray-900 whitespace-nowrap">
                        {student.id}
                      </td>

                      <td className="px-5 sm:px-6 py-3 text-gray-700">
                        {student.name}
                      </td>

                      <td className="px-5 sm:px-6 py-3 text-center">
                        {status ? (
                          <span
                            className={[
                              "inline-flex items-center justify-center rounded-xl border px-3 py-1 text-xs font-extrabold",
                              status === "present"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-red-200 bg-red-50 text-red-700",
                            ].join(" ")}
                          >
                            {status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not Marked</span>
                        )}
                      </td>

                      <td className="px-5 sm:px-6 py-3">
                        <div className="flex flex-col sm:flex-row justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleAttendance(student.id, "present")}
                            className={`
                              inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition
                              ${
                                status === "present"
                                  ? "bg-green-600 text-white shadow-sm"
                                  : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                              }
                            `}
                          >
                            <FiCheckCircle />
                            Present
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleAttendance(student.id, "absent")}
                            className={`
                              inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition
                              ${
                                status === "absent"
                                  ? "bg-red-600 text-white shadow-sm"
                                  : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                              }
                            `}
                          >
                            <FiXCircle />
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No students match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ACTION BAR */}
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-500">
              Marked <span className="font-semibold text-gray-900">{markedCount}</span>{" "}
              out of <span className="font-semibold text-gray-900">{students.length}</span>{" "}
              students.
            </p>

            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition hover:-translate-y-0.5"
            >
              Submit Attendance
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
