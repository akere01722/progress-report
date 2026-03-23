import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom"; // ✅ REQUIRED
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen">

      {/* SIDEBAR */}
      <div>
        <AdminSidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 ml-64 bg-gray-50 min-h-screen p-6 ${location.pathname === "/admin" ? "pt-24" : "pt-6"}`}>

        {/* HEADER - Only on Dashboard */}
        {location.pathname === "/admin" && (
          <AdminHeader toggleSidebar={() => setOpen(!open)} />
        )}

        {/* PAGE CONTENT */}
        <div className="mt-4">
          <Outlet />
        </div>

      </main>
    </div>
  );
}
