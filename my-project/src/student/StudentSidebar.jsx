import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiChevronDown,
  FiBarChart2,
  FiCalendar,
  FiMessageCircle,
  FiUser,
  FiBook,
  FiXCircle,
  FiLogOut,
} from "react-icons/fi";

export default function StudentSidebar() {
  const navigate = useNavigate();
  const [resultsOpen, setResultsOpen] = useState(true);

  const baseLink =
    "flex items-center gap-3 px-4 py-3 text-[15px] font-medium rounded-md transition";

  const activeLink = "bg-gray-200 text-gray-900";
  const inactiveLink = "text-gray-700 hover:bg-gray-100";

  return (
    <aside className="w-64 bg-[#f7f4ec] border-r fixed h-full hidden md:block">

      {/* YEAR LABEL */}
      <div className="px-6 py-4 text-sm font-semibold text-[#9c7a1a] border-b">
        2025 / 2026
      </div>

      <nav className="px-3 py-4 space-y-1">

        {/* DASHBOARD */}
        <NavLink
          to="/student"
          end
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : inactiveLink}`
          }
        >
          <FiHome /> Dashboard
        </NavLink>

        {/* RESULTS DROPDOWN */}
        <button
          onClick={() => setResultsOpen((p) => !p)}
          className={`${baseLink} w-full justify-between ${inactiveLink}`}
        >
          <span className="flex items-center gap-3">
            <FiBarChart2 /> Results
          </span>
          <FiChevronDown
            className={`transition ${resultsOpen ? "rotate-180" : ""}`}
          />
        </button>

        {resultsOpen && (
          <div className="ml-8 space-y-1">
            <NavLink
              to="/student/ca"
              className={({ isActive }) =>
                `${baseLink} text-sm ${
                  isActive ? activeLink : inactiveLink
                }`
              }
            >
              CA
            </NavLink>

            <NavLink
              to="/student/exams"
              className={({ isActive }) =>
                `${baseLink} text-sm ${
                  isActive ? activeLink : inactiveLink
                }`
              }
            >
              Exams
            </NavLink>
          </div>
        )}

        {/* ATTENDANCE */}
        <NavLink
          to="/student/attendance"
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : inactiveLink}`
          }
        >
          <FiCalendar /> Attendance
        </NavLink>

        {/* MY COURSES */}
        <NavLink
          to="/student/courses"
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : inactiveLink}`
          }
        >
          <FiBook /> My Courses
        </NavLink>

        {/* UNVALIDATED COURSES */}
        <NavLink
          to="/student/unvalidated"
          className={({ isActive }) =>
            `${baseLink} ${isActive ? activeLink : inactiveLink}`
          }
        >
          <FiXCircle /> Unvalidated Courses
        </NavLink>

        {/* LOGOUT */}
        <button
          onClick={() => navigate("/signin")}
          className={`${baseLink} text-gray-700 hover:bg-red-50 hover:text-red-600 w-full`}
        >
          <FiLogOut /> Logout
        </button>
      </nav>
    </aside>
  );
}
