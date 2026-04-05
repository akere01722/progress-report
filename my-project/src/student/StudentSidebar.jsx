import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  FiHome,
  FiChevronDown,
  FiBarChart2,
  FiCalendar,
  FiBook,
  FiXCircle,
  FiLogOut,
} from "react-icons/fi";

export default function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [resultsOpen, setResultsOpen] = useState(
    location.pathname.includes("/student/results") ||
      location.pathname.includes("/student/ca") ||
      location.pathname.includes("/student/exams")
  );

  const baseLink =
    "w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-semibold transition-all";
  const activeLink = "bg-blue-600 text-white shadow-md";
  const inactiveLink = "text-gray-700 hover:bg-blue-50 hover:text-blue-600";

  const handleLogout = () => {
    localStorage.removeItem("userData");
    navigate("/signin");
  };

  const isResultsActive =
    location.pathname.includes("/student/results") ||
    location.pathname.includes("/student/ca") ||
    location.pathname.includes("/student/exams");

  return (
    <aside className="w-64 h-screen bg-white shadow-lg fixed left-0 top-0 px-6 pt-7 pb-6 hidden md:flex md:flex-col">
      <h1
        className="text-[28px] leading-none font-extrabold text-blue-600 mb-8 cursor-pointer"
        onClick={() => navigate("/")}
      >
        ProgressTrack
      </h1>

      <div className="flex flex-col gap-2.5 flex-1">
        <NavLink to="/student" end className={({ isActive }) => `${baseLink} ${isActive ? activeLink : inactiveLink}`}>
          <FiHome className="text-[18px]" />
          Dashboard
        </NavLink>

        <button
          onClick={() => setResultsOpen((value) => !value)}
          className={`${baseLink} justify-between ${
            isResultsActive ? activeLink : inactiveLink
          }`}
          type="button"
        >
          <span className="flex items-center gap-3.5">
            <FiBarChart2 className="text-[18px]" />
            Results
          </span>
          <FiChevronDown className={`text-[18px] transition ${resultsOpen ? "rotate-180" : ""}`} />
        </button>

        {resultsOpen && (
          <div className="ml-[46px] mt-1 flex flex-col gap-1.5">
            <NavLink
              to="/student/results"
              className={({ isActive }) =>
                `text-left rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              Summary
            </NavLink>
            <NavLink
              to="/student/ca"
              className={({ isActive }) =>
                `text-left rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              CA
            </NavLink>
            <NavLink
              to="/student/exams"
              className={({ isActive }) =>
                `text-left rounded-lg px-3 py-2 text-[14px] font-medium transition ${
                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              Exams
            </NavLink>
          </div>
        )}

        <NavLink
          to="/student/attendance"
          className={({ isActive }) => `${baseLink} ${isActive ? activeLink : inactiveLink}`}
        >
          <FiCalendar className="text-[18px]" />
          Attendance
        </NavLink>

        <NavLink
          to="/student/courses"
          className={({ isActive }) => `${baseLink} ${isActive ? activeLink : inactiveLink}`}
        >
          <FiBook className="text-[18px]" />
          My Courses
        </NavLink>

        <NavLink
          to="/student/unvalidated"
          className={({ isActive }) => `${baseLink} ${isActive ? activeLink : inactiveLink}`}
        >
          <FiXCircle className="text-[18px]" />
          Unvalidated
        </NavLink>
      </div>

      <button
        onClick={handleLogout}
        type="button"
        className="
          mt-4 w-full flex items-center gap-3.5 rounded-xl px-4 py-3
          text-[15px] font-semibold transition-all
          text-gray-700 hover:bg-red-50 hover:text-red-600
        "
      >
        <FiLogOut className="text-[18px]" />
        Logout
      </button>
    </aside>
  );
}
