import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Upload,
  ClipboardCheck,
  CalendarDays,
  Bell,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

/**
 * ✅ Fixes requested:
 * 1) Remove "ST LOUIS UNIVERSITY INSTITUTE" and student name from header:
 *    - That text is NOT in this component. It’s coming from your Layout/Header/Breadcrumb component.
 *    - So here we only render a clean dashboard header (no school name / student name).
 *
 * 2) Semester auto-updates based on report sent:
 *    - We compute currentSemester automatically from date (can be replaced with your DB/report status later).
 *    - Also updated the activity text to use the computed semester.
 */

export default function TeacherDashboard() {
  const navigate = useNavigate();

  // ✅ Auto semester (basic logic): Jan–Jun => Semester 1, Jul–Dec => Semester 2
  const currentSemester = useMemo(() => {
    const m = new Date().getMonth() + 1;
    return m <= 6 ? "Semester 1" : "Semester 2";
  }, []);

  const stats = [
    {
      title: "Classes Today",
      value: "2",
      icon: CalendarDays,
      hint: "Next class in 45 mins",
      onClick: () => navigate("/teacher/attendance"),
    },
    {
      title: "Pending Attendance",
      value: "3",
      icon: ClipboardCheck,
      hint: "Needs submission",
      onClick: () => navigate("/teacher/attendance"),
    },
    {
      title: "Pending Uploads",
      value: "4",
      icon: Upload,
      hint: "CA / Exams",
      onClick: () => navigate("/teacher/uploads"), // change if your route is different
    },
    {
      title: "Unread Messages",
      value: "5",
      icon: Bell,
      hint: "Students & Admin",
      onClick: () => navigate("/teacher/inbox"),
    },
  ];

  // ✅ Activity uses auto semester
  const activities = [
    "Attendance submitted for CSC301 (Level 300)",
    "CA marks uploaded for CSC201 (Level 200)",
    "New message received from Admin (Report verification)",
    `Exam upload window updated for ${currentSemester}`,
  ];

  return (
    <div className="w-full">
      {/* HEADER (clean, no school name, no student name) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Teacher Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Your teaching summary for today • <span className="font-semibold">{currentSemester}</span>
          </p>
        </div>

        {/* Top buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/teacher/schedule")} // change route if needed
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:-translate-y-0.5 transition"
          >
            <CalendarDays className="h-4 w-4" />
            This Week
          </button>

          <button
            onClick={() => navigate("/teacher/notifications")} // change route if needed
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:opacity-95 hover:-translate-y-0.5 transition"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </button>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              onClick={s.onClick}
              className="text-left group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden hover:-translate-y-0.5"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">{s.title}</p>
                    <p className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
                      {s.value}
                    </p>
                    <p className="mt-2 text-xs sm:text-sm text-gray-500">
                      {s.hint}
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm group-hover:opacity-95 transition">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-gray-600">
                    <ArrowUpRight className="h-4 w-4" />
                    View details
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    Updated today
                  </span>
                </div>
              </div>

              <div className="h-1 w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 opacity-20" />
            </button>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        {/* SNAPSHOT */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Teaching Snapshot
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Attendance, uploads, and schedules at a glance.
              </p>
            </div>

            <button className="hidden sm:inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Export
            </button>
          </div>

          <div className="px-5 sm:px-6 pb-6">
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 sm:p-8">
              <div className="flex flex-col items-center justify-center text-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-gray-800" />
                </div>
                <p className="font-medium text-gray-900">Charts Coming Soon</p>
                <p className="text-sm text-gray-500 max-w-md">
                  When you connect real data, graphs will appear here (attendance, uploads,
                  notifications, and sessions).
                </p>

                <div className="mt-5 w-full max-w-xl">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    {[20, 32, 26, 40, 30, 52, 35, 45, 34, 58, 44, 50].map((h, i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-white border border-gray-200"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary chips */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Attendance Completed</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">3/6</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Uploads Completed</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">5</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Current Semester</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">{currentSemester}</p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => navigate("/teacher/attendance")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:opacity-95 hover:-translate-y-0.5 transition"
              >
                <ClipboardCheck className="h-4 w-4" />
                Mark Attendance
              </button>

              <button
                onClick={() => navigate("/teacher/upload-ca")} // change route if needed
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 transition"
              >
                <Upload className="h-4 w-4" />
                Upload CA
              </button>

              <button
                onClick={() => navigate("/teacher/courses")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 transition"
              >
                <BookOpen className="h-4 w-4" />
                My Courses
              </button>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY (fix “cropped text” issue by using break-words + min-w-0) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Latest updates from your teaching tasks.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-gray-900" />
              Live
            </span>
          </div>

          <div className="px-5 sm:px-6 pb-6">
            <ul className="space-y-3">
              {activities.map((text, idx) => (
                <li
                  key={idx}
                  className="flex gap-3 rounded-2xl border border-gray-100 p-4 hover:bg-gray-50 transition"
                >
                  <div className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {idx === 0
                        ? "Just now"
                        : idx === 1
                        ? "18 minutes ago"
                        : idx === 2
                        ? "2 hours ago"
                        : "Earlier today"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <button className="mt-5 w-full inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              View all activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
