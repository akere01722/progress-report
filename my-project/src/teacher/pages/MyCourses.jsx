import { useMemo, useState } from "react";
import { FiBookOpen, FiLayers, FiSearch, FiChevronDown } from "react-icons/fi";

export default function TeacherCourses() {
  const teacherCourses = useMemo(() => [
    {
      level: "Level 100",
      program: "BSc Computer Science",
      department: "Computer Science",
      courses: [
        { code: "CSC101", title: "Introduction to Computing" },
        { code: "MTH101", title: "Mathematics I" },
        { code: "PHY101", title: "Physics I" },
        { code: "STA101", title: "Statistics I" },
      ],
    },
    {
      level: "Level 200",
      program: "BSc Computer Science",
      department: "Computer Science",
      courses: [
        { code: "CSC201", title: "Data Structures" },
        { code: "CSC202", title: "Discrete Mathematics" },
        { code: "CSC203", title: "Digital Logic" },
        { code: "CSC204", title: "Object-Oriented Programming" },
      ],
    },
    {
      level: "Level 300",
      program: "BSc Computer Science",
      department: "Computer Science",
      courses: [
        { code: "CSC301", title: "Operating Systems" },
        { code: "CSC302", title: "Database Systems" },
        { code: "CSC303", title: "Computer Networks" },
        { code: "CSC304", title: "Software Engineering" },
      ],
    },
  ], []);

  const allLevels = useMemo(() => teacherCourses.map((b) => b.level), [teacherCourses]);

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
    () =>
      filteredBlocks.reduce((acc, b) => acc + (b.courses?.length || 0), 0),
    [filteredBlocks]
  );

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Teaching Courses
          </h1>
          <p className="text-gray-500 mt-1">
            Levels and subjects currently assigned to you.
          </p>
        </div>

        {/* Small summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
            Levels: <span className="ml-1 text-gray-900">{filteredBlocks.length}</span>
          </span>
          <span className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
            Courses: <span className="ml-1 text-gray-900">{totalCourses}</span>
          </span>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search */}
          <div className="md:col-span-2 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <FiSearch className="text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by course code or title..."
              className="w-full outline-none text-sm text-gray-700 placeholder:text-gray-400"
            />
          </div>

          {/* Level filter */}
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

      {/* COURSE BLOCKS */}
      <div className="grid gap-6 mt-6">
        {filteredBlocks.map((block, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-blue-600">
                  {block.level}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {block.program} • {block.department}
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

            {/* Courses grid */}
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
                      <p className="font-semibold text-gray-900 truncate">
                        {course.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Assigned • {block.department}
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

            {/* subtle bottom accent */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 opacity-15" />
          </div>
        ))}

        {filteredBlocks.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-lg font-semibold text-gray-900">No results</p>
            <p className="text-gray-500 mt-1">
              Try clearing the search or changing the level filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
