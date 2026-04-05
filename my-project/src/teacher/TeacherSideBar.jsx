import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  FiHome,
  FiBookOpen,
  FiBarChart2,
  FiCalendar,
  FiMail,
  FiLogOut,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";

export default function TeacherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [resultOpen, setResultOpen] = useState(location.pathname.includes("/teacher/results"));

  const handleLogout = () => {
    localStorage.removeItem("userData");
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUser");
    sessionStorage.clear();
    navigate("/signin");
  };

  const menu = [
    { label: "Dashboard", icon: <FiHome />, path: "/teacher" },
    { label: "My Courses", icon: <FiBookOpen />, path: "/teacher/courses" },
    {
      label: "Result",
      icon: <FiBarChart2 />,
      dropdown: true,
      children: [
        { label: "CA", path: "/teacher/results/ca" },
        { label: "Exams", path: "/teacher/results/exams" },
      ],
    },
    { label: "Attendance", icon: <FiCalendar />, path: "/teacher/attendance" },
    { label: "Inbox", icon: <FiMail />, path: "/teacher/inbox" },
  ];

  const isActive = (path) => location.pathname === path;

  const isResultsActive = location.pathname.includes("/teacher/results");

  // Match the look in your screenshot:
  // - slightly smaller icons
  // - more breathing space between items
  // - lighter text by default
  // - blue active pill
  // - logout at bottom with red hover
  return (
    <div className="w-64 h-screen bg-white shadow-lg fixed left-0 top-0 px-6 pt-7 pb-6 flex flex-col">
      {/* LOGO */}
      <h1
        className="text-[28px] leading-none font-extrabold text-blue-600 mb-8 cursor-pointer"
        onClick={() => navigate("/")}
      >
        ProgressTrack
      </h1>

      {/* MENU */}
      <div className="flex flex-col gap-2.5 flex-1">
        {menu.map((item, index) => {
          // DROPDOWN RESULT MENU
          if (item.dropdown) {
            return (
              <div key={index}>
                <button
                  onClick={() => setResultOpen((p) => !p)}
                  className={`
                    w-full flex items-center justify-between rounded-xl px-4 py-3
                    text-[15px] font-semibold transition-all
                    ${
                      isResultsActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    }
                  `}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-[18px] leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  <span className="text-[18px] leading-none">
                    {resultOpen ? <FiChevronUp /> : <FiChevronDown />}
                  </span>
                </button>

                {/* SUB MENU */}
                {resultOpen && (
                  <div className="ml-[46px] mt-2 flex flex-col gap-1.5">
                    {item.children.map((child, i) => {
                      const subActive = location.pathname === child.path;

                      return (
                        <button
                          key={i}
                          onClick={() => navigate(child.path)}
                          className={`
                            text-left rounded-lg px-3 py-2
                            text-[14px] font-medium transition
                            ${
                              subActive
                                ? "bg-blue-100 text-blue-700"
                                : "text-gray-600 hover:bg-gray-100"
                            }
                          `}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // NORMAL MENU ITEM
          const active = isActive(item.path);

          return (
            <div key={index}>
              <button
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center gap-3.5 rounded-xl px-4 py-3
                  text-[15px] font-semibold transition-all
                  ${
                    active
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  }
                `}
              >
                <span className="text-[18px] leading-none">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleLogout}
        className="
          mt-4 w-full flex items-center gap-3.5 rounded-xl px-4 py-3
          text-[15px] font-semibold transition-all
          text-gray-700 hover:bg-red-50 hover:text-red-600
        "
      >
        <span className="text-[18px] leading-none">
          <FiLogOut />
        </span>
        <span className="truncate">Logout</span>
      </button>
    </div>
  );
}
