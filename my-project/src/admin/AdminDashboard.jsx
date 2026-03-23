import {
  Users,
  GraduationCap,
  School,
  FileText,
  ArrowUpRight,
  CalendarDays,
  Bell,
  CheckCircle2,
} from "lucide-react";

export default function AdminDashboard() {
  const stats = [
    {
      title: "Total Students",
      value: "1,250",
      icon: GraduationCap,
      hint: "+4.2% this term",
    },
    {
      title: "Total Teachers",
      value: "52",
      icon: Users,
      hint: "Stable this month",
    },
    {
      title: "Classes",
      value: "36",
      icon: School,
      hint: "3 new streams",
    },
    {
      title: "Pending Reports",
      value: "12",
      icon: FileText,
      hint: "Needs review",
    },
  ];

  const activities = [
    "20 students enrolled in Class 4A",
    "Teacher John updated Mathematics results",
    "New subject: Chemistry added",
    "Attendance updated for Class 6B",
  ];

  return (
    <div className="w-full">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here is what’s happening in your school today.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition">
            <CalendarDays className="h-4 w-4" />
            This Week
          </button>
          <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:opacity-95 transition">
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
            <div
              key={s.title}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden"
            >
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
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
                  <span className="text-xs text-gray-400">Updated today</span>
                </div>
              </div>

              {/* subtle bottom accent */}
              <div className="h-1 w-full bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 opacity-20" />
            </div>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        {/* CHART / INSIGHTS */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Performance Snapshot
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                A quick view of attendance and results trends.
              </p>
            </div>

            <button className="hidden sm:inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              Export
            </button>
          </div>

          {/* Placeholder chart area - looks nicer */}
          <div className="px-5 sm:px-6 pb-6">
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 sm:p-8">
              <div className="flex flex-col items-center justify-center text-center gap-2">
                <div className="h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-6 w-6 text-gray-800" />
                </div>
                <p className="font-medium text-gray-900">Chart Coming Soon</p>
                <p className="text-sm text-gray-500 max-w-md">
                  Connect your data and we’ll display charts here (attendance,
                  results, and report status).
                </p>

                {/* fake mini bars for visual appeal */}
                <div className="mt-5 w-full max-w-xl">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    {[22, 35, 28, 42, 30, 55, 33, 48, 36, 60, 45, 52].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-white border border-gray-200"
                          style={{ height: `${h}px` }}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Small summary chips */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Today’s Attendance</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">94%</p>
              </div>
              <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Reports Completed</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">18</p>
              </div>
              <div className="flex-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">New Enrollments</p>
                <p className="mt-1 text-xl font-semibold text-gray-900">+20</p>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Latest updates from staff and students.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700">
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
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {idx === 0
                        ? "Just now"
                        : idx === 1
                        ? "12 minutes ago"
                        : idx === 2
                        ? "1 hour ago"
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
