import { useState } from "react";
import { FiMenu, FiLogOut, FiChevronDown, FiMail } from "react-icons/fi";
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

export default function TeacherHeader({ title = "Dashboard", toggleSidebar }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userData] = useState(getUserData);
  const navigate = useNavigate();

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
    <header
      className="
        fixed top-0 left-0 md:left-64 
        w-full md:w-[calc(100%-16rem)]
        h-16 flex items-center justify-between 
        bg-white shadow-sm px-6 z-40
      "
    >
      {/* LEFT SECTION */}
      <div className="flex items-center gap-4">
        {/* MENU TOGGLE BUTTON (VISIBLE ON SMALL SCREENS) */}
        <button
          className="text-2xl md:hidden text-gray-700"
          onClick={toggleSidebar}
        >
          <FiMenu />
        </button>

        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>

      {/* RIGHT SECTION - Premium Profile Dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="
            group flex items-center gap-3 
            rounded-full px-2.5 py-1.5 
            border border-gray-200/70
            bg-white/70 backdrop-blur
            shadow-sm hover:shadow-md
            hover:bg-white transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-200
          "
        >
          {/* Avatar with status dot */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-white">
              {getInitial()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </div>

          {/* Name + Role */}
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-gray-800 font-semibold text-sm">
              {userData?.name || "User"}
            </span>
            <span className="text-gray-500 text-xs">
              {getRoleDisplay(userData?.role || "teacher")}
            </span>
          </div>

          {/* Chevron */}
          <FiChevronDown
            className={`
              hidden md:block text-gray-500 text-sm 
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
                bg-white/80 backdrop-blur-xl
                shadow-2xl shadow-black/10
                overflow-hidden
                origin-top-right
                animate-[dropdown_160ms_ease-out]
              "
            >
              {/* Top user card */}
              <div className="px-4 py-4 bg-gradient-to-r from-blue-50 via-white to-white border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-white">
                    {getInitial()}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {userData?.name || "User"}
                    </p>

                    <p className="text-xs text-gray-600 flex items-center gap-1 truncate">
                      <FiMail className="text-xs shrink-0" />
                      <span className="truncate">
                        {userData?.email || "teacher@school.com"}
                      </span>
                    </p>

                    <span className="inline-flex mt-2 items-center gap-2 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                      {getRoleDisplay(userData?.role || "teacher")}
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

            {/* Keyframes (kept local for easy copy/paste) */}
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
    </header>
  );
}
