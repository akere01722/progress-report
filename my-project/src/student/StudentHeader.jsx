import { useMemo, useState } from "react";
import { FiHome, FiLogOut, FiChevronDown, FiMail } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

// Lazy initializer to get user data from localStorage
const getUserData = () => {
  try {
    const stored = localStorage.getItem("userData");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export default function StudentHeader({
  matricule = "SE/24/0088",

  // ✅ this should come from the latest admin report (preferred)
  reportSemester = "", // "FIRST SEMESTER" | "SECOND SEMESTER"
  reportType = "", // "CA" | "EXAM" (optional)

  // fallback (if no report yet)
  semester = "FIRST SEMESTER",
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userData] = useState(getUserData);
  const navigate = useNavigate();

  // ✅ Correct semester by YOUR calendar: Oct–Jan = Sem 1, Feb–May = Sem 2
  const autoSemester = useMemo(() => {
    const m = new Date().getMonth() + 1; // 1..12
    if (m === 10 || m === 11 || m === 12 || m === 1) return "FIRST SEMESTER";
    if (m === 2 || m === 3 || m === 4 || m === 5) return "SECOND SEMESTER";
    return "BREAK / VACATION";
  }, []);

  // ✅ Semester shown: report semester > prop semester > auto semester
  const semesterToShow = reportSemester || semester || autoSemester;

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("userData");
    navigate("/signin");
  };

  // Get role display name
  const getRoleDisplay = (role) => {
    const roleMap = {
      admin: "Administrator",
      teacher: "Teacher",
      student: "Student",
    };
    return roleMap[role] || role;
  };

  // Get initial for profile picture
  const getInitial = () => {
    if (userData?.name) return userData.name.charAt(0).toUpperCase();
    return "U";
  };

  return (
    <div className="w-full">
      {/* TOP BAR */}
      <div className="flex items-center justify-between bg-[#9c7a1a] px-6 py-3">
        {/* ✅ Removed school name */}
        <h1 className="text-lg font-extrabold tracking-wide text-white">
          Dashboard
        </h1>

        {/* RIGHT SECTION - Premium Profile Dropdown (gold theme) */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="
              group flex items-center gap-3
              rounded-full px-2.5 py-1.5
              border border-white/25
              bg-white/10 backdrop-blur
              shadow-sm hover:shadow-md
              hover:bg-white/15 transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-white/30
            "
          >
            {/* Avatar with status dot */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-white text-[#9c7a1a] flex items-center justify-center font-extrabold text-lg shadow-md ring-2 ring-white/70">
                {getInitial()}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>

            {/* Name + Role */}
            <div className="hidden md:flex flex-col items-start leading-tight">
              <span className="text-white font-semibold text-sm">
                {userData?.name || "User"}
              </span>
              <span className="text-white/80 text-xs">
                {getRoleDisplay(userData?.role || "student")}
              </span>
            </div>

            {/* Chevron */}
            <FiChevronDown
              className={`
                hidden md:block text-white/90 text-sm
                transition-transform duration-200
                ${dropdownOpen ? "rotate-180" : ""}
              `}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />

              <div
                className="
                  absolute right-0 mt-3 w-64 z-50
                  rounded-2xl border border-gray-200/70
                  bg-white/85 backdrop-blur-xl
                  shadow-2xl shadow-black/10
                  overflow-hidden
                  origin-top-right
                  animate-[dropdown_160ms_ease-out]
                "
              >
                {/* Top user card */}
                <div className="px-4 py-4 bg-gradient-to-r from-yellow-50 via-white to-white border-b border-gray-200/60">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#9c7a1a] text-white flex items-center justify-center font-extrabold text-lg shadow-md ring-2 ring-white">
                      {getInitial()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {userData?.name || "User"}
                      </p>

                      <p className="text-xs text-gray-600 flex items-center gap-1 truncate">
                        <FiMail className="text-xs shrink-0" />
                        <span className="truncate">
                          {userData?.email || "student@school.com"}
                        </span>
                      </p>

                      <span className="inline-flex mt-2 items-center gap-2 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-[#7a5f10]">
                        {getRoleDisplay(userData?.role || "student")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="
                      w-full flex items-center gap-3 px-4 py-2.5
                      text-red-600 hover:text-red-700
                      hover:bg-red-50/70 transition
                    "
                  >
                    <span className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                      <FiLogOut className="text-lg" />
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold">Logout</p>
                      <p className="text-xs text-red-500/80">
                        Sign out of your account
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Keyframes (local for easy copy/paste) */}
              <style>
                {`
                  @keyframes dropdown {
                    from { opacity: 0; transform: translateY(-6px) scale(.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}
              </style>
            </>
          )}
        </div>
      </div>

      {/* BREADCRUMB */}
      <div className="bg-gray-100 px-6 py-3 text-sm text-gray-700 flex flex-wrap items-center gap-2">
        <FiHome className="text-gray-600" />
        <span className="text-blue-600 cursor-pointer">Home</span>
        <span>›</span>

        {/* ✅ Removed student name */}
        <span className="font-semibold text-red-600 uppercase"></span>

        <span>›</span>
        <span className="font-medium">
          Matricule: <span className="text-red-600">{matricule}</span>
        </span>
        <span>›</span>

        {/* ✅ Now matches Admin submitted report semester */}
        <span className="font-medium uppercase text-red-600">
          {semesterToShow}
        </span>

        {/* optional: show CA/EXAM */}
        {reportType && (
          <>
            <span>›</span>
            <span className="font-medium uppercase text-red-600">
              {reportType}
            </span>
          </>
        )}
      </div>

      <div className="border-b border-gray-300" />
    </div>
  );
}
