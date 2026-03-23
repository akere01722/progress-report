import { Outlet, useLocation } from "react-router-dom";
import StudentSidebar from "./StudentSidebar";
import StudentHeader from "./StudentHeader";

export default function StudentLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <StudentSidebar />

      <div className="flex-1 ml-0 md:ml-64">
        {location.pathname === "/student" && <StudentHeader />}
        <main className={`p-4 md:p-8 ${location.pathname === "/student" ? "pt-24" : "pt-6"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
