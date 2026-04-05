import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom"; // ✅ REQUIRED
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const routeTitles = {
    "/admin": "Dashboard",
    "/admin/students": "Students",
    "/admin/teachers": "Teachers",
    "/admin/subjects": "Subjects",
    "/admin/attendance": "Attendance",
    "/admin/reports": "Reports",
    "/admin/inbox": "Inbox",
    "/admin/settings": "Settings",
  };
  const headerTitle = routeTitles[location.pathname] || "Admin";

  return (
    <div className="flex h-screen bg-gray-50">

      {/* SIDEBAR */}
      <div>
        <AdminSidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <main
        data-scroll-root
        className="flex-1 ml-64 h-screen overflow-y-scroll p-6 pt-24"
      >

        {/* HEADER - Persistent across all admin pages */}
        <AdminHeader
          title={headerTitle}
          toggleSidebar={() => setOpen(!open)}
        />

        {/* PAGE CONTENT */}
        <div className="mt-4">
          <Outlet />
        </div>

      </main>
    </div>
  );
}
