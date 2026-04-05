import { useMemo, useState } from "react";
import { FiBookOpen, FiLayers, FiSearch, FiChevronDown } from "react-icons/fi";
import {
  TEACHERS_STORAGE_KEY,
  normalizeId,
  safeReadArray,
} from "../../lib/registrationData";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const DEMO_TEACHER = {
  id: "demo-teacher",
  name: "John Acha",
  email: "john.acha@school.edu",
  staffId: "TCH-26-001",
  faculty: "Engineering",
  department: "Software Engineering",
  program: "BSc",
  level: "Level 3",
  assignments: [
    { className: "BSc - Level 2", subject: "Data Structures" },
    { className: "BSc - Level 3", subject: "Operating Systems" },
    { className: "BSc - Level 3", subject: "Database Systems" },
    { className: "BSc - Level 4", subject: "Software Engineering" },
  ],
};

const buildCourseCode = (subject, className, index) => {
  const levelMatch = String(className || "").match(/Level\s*(\d+)/i);
  const levelPrefix = levelMatch ? levelMatch[1] : "M";
  const initials = String(subject || "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0].toUpperCase())
    .join("");
  const suffix = String(index).padStart(2, "0");
  return `${initials || "SUB"}${levelPrefix}${suffix}`;
};

const splitClassName = (className) => {
  const trimmed = String(className || "").trim();
  if (!trimmed) return { level: "Unassigned", program: "Unassigned" };

  const parts = trimmed.split(" - ");
  if (parts.length === 2) return { program: parts[0], level: parts[1] };

  return { program: trimmed, level: trimmed };
};

export default function TeacherCourses() {
  const userData = useMemo(() => readUserData(), []);

  const teacherView = useMemo(() => {
    const teachers = safeReadArray(TEACHERS_STORAGE_KEY, []);
    const targetStaffId = normalizeId(userData?.staffId);
    const targetEmail = normalizeId(userData?.email);
    const targetId = String(userData?.id ?? "");

    const matchedTeacher = teachers.find((item) => {
      const byId = targetId && String(item.id ?? "") === targetId;
      const byStaffId = targetStaffId && normalizeId(item.staffId) === targetStaffId;
      const byEmail = targetEmail && normalizeId(item.email) === targetEmail;
      return byId || byStaffId || byEmail;
    });

    if (matchedTeacher) return { teacher: matchedTeacher, isPreview: false };
    if (teachers.length > 0) return { teacher: teachers[0], isPreview: true };
    return { teacher: DEMO_TEACHER, isPreview: true };
  }, [userData]);

  const teacherCourses = useMemo(() => {
    const teacher = teacherView.teacher;
    const grouped = {};
    const assignments = Array.isArray(teacher.assignments) ? teacher.assignments : [];

    assignments.forEach((assignment, assignmentIndex) => {
      const className = String(assignment?.className || "").trim();
      const subject = String(assignment?.subject || "").trim();
      if (!className || !subject) return;

      if (!grouped[className]) {
        const { program, level } = splitClassName(className);
        grouped[className] = {
          level,
          program,
          department: teacher.department || "General",
          courses: [],
        };
      }

      const courseExists = grouped[className].courses.some(
        (course) => normalizeId(course.title) === normalizeId(subject)
      );
      if (courseExists) return;

      grouped[className].courses.push({
        code: buildCourseCode(subject, className, assignmentIndex + 1),
        title: subject,
      });
    });

    return Object.values(grouped);
  }, [teacherView.teacher]);

  const isPreview = teacherView.isPreview;

  const allLevels = useMemo(
    () => Array.from(new Set(teacherCourses.map((b) => b.level))),
    [teacherCourses]
  );

  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  const filteredBlocks = useMemo(() => {
    const q = search.trim().toLowerCase();

    return teacherCourses
      .filter((b) => (levelFilter ? b.level === levelFilter : true))
      .map((b) => {
        if (!q) return b;

        const courses = b.courses.filter(
          (c) =>
            c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
        );

        return { ...b, courses };
      })
      .filter((b) => b.courses.length > 0);
  }, [teacherCourses, search, levelFilter]);

  const totalCourses = useMemo(
    () => filteredBlocks.reduce((acc, b) => acc + (b.courses?.length || 0), 0),
    [filteredBlocks]
  );

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Teaching Courses
          </h1>
          <p className="text-gray-500 mt-1">
            Classes and subjects assigned by the admin.
          </p>
          {isPreview && (
            <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Preview data mode
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
            Levels: <span className="ml-1 text-gray-900">{filteredBlocks.length}</span>
          </span>
          <span className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
            Courses: <span className="ml-1 text-gray-900">{totalCourses}</span>
          </span>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiSearch className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject name or code..."
              className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400"
            />
          </div>

          <div className="relative">
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700"
            >
              <option value="">All Levels</option>
              {allLevels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900">{totalCourses}</span>{" "}
          course(s)
          {levelFilter ? (
            <>
              {" "}
              in <span className="font-semibold text-gray-900">{levelFilter}</span>
            </>
          ) : null}
          {search.trim() ? (
            <>
              {" "}
              for "<span className="font-semibold text-gray-900">{search.trim()}</span>"
            </>
          ) : null}
          .
        </p>
      </div>

      <div className="grid gap-6 mt-6">
        {filteredBlocks.map((block, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-blue-600">{block.level}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {block.program} - {block.department}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100 px-3 py-2 text-xs font-semibold">
                  {block.courses.length} course(s)
                </span>
                <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <FiLayers className="text-xl" />
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {block.courses.map((course, i) => (
                  <div
                    key={i}
                    className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 hover:bg-blue-50 hover:border-blue-100 transition"
                  >
                    <span className="shrink-0 rounded-xl bg-blue-100 text-blue-700 text-xs font-extrabold px-3 py-1.5">
                      {course.code}
                    </span>

                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{course.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Assigned - {block.department}
                      </p>
                    </div>

                    <div className="ml-auto h-10 w-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-blue-600 group-hover:border-blue-200 transition">
                      <FiBookOpen />
                    </div>
                  </div>
                ))}
              </div>

              {block.courses.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
                  No courses match your search in this level.
                </div>
              )}
            </div>

            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 opacity-15" />
          </div>
        ))}

        {filteredBlocks.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-lg font-semibold text-gray-900">No assigned courses found</p>
            <p className="text-gray-500 mt-1">
              Ask admin to assign your classes and subjects.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
