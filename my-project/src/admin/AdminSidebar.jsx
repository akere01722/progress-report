import { useNavigate, useLocation } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiBookOpen,
  FiCalendar,
  FiBarChart2,
  FiSettings,
  FiInbox,
  FiLogOut,
} from "react-icons/fi";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("userData");
    navigate("/signin");
  };

  const menu = [
    { label: "Dashboard", icon: <FiHome />, path: "/admin" },
    { label: "Students", icon: <FiUsers />, path: "/admin/students" },
    { label: "Teachers", icon: <FiUserCheck />, path: "/admin/teachers" },
    { label: "Subjects", icon: <FiBookOpen />, path: "/admin/subjects" },
    { label: "Attendance", icon: <FiCalendar />, path: "/admin/attendance" },
    { label: "Reports", icon: <FiBarChart2 />, path: "/admin/reports" },
    { label: "Inbox", icon: <FiInbox />, path: "/admin/inbox" },
    { label: "Settings", icon: <FiSettings />, path: "/admin/settings" },
  ];

  return (
    <div className="w-64 h-screen bg-white shadow-lg fixed left-0 top-0 p-6 flex flex-col">

      {/* Logo */}
      <h1
        className="text-3xl font-extrabold text-blue-600 mb-10 cursor-pointer"
        onClick={() => navigate("/")}
      >
        ProgressTrack
      </h1>

      {/* Menu */}
      <div className="flex flex-col gap-2">
        {menu.map((item, index) => {
          const active = location.pathname === item.path;

          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`
                flex items-center gap-4 px-5 py-3 rounded-lg text-base font-bold transition-all
                ${
                  active
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                }
              `}
            >
              <span className="text-2xl">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleLogout}
        className="
          mt-auto flex items-center gap-4 px-5 py-3 rounded-lg text-base font-bold transition-all
          text-red-600 hover:bg-red-50 hover:text-red-700
        "
      >
        <span className="text-2xl">
          <FiLogOut />
        </span>
        Logout
      </button>
    </div>
  );
}
