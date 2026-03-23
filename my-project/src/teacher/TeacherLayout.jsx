import { Outlet, useLocation } from "react-router-dom";
import TeacherSideBar from "./TeacherSideBar";
import TeacherHeader from "./teacherHeader";

export default function TeacherLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <TeacherSideBar />

      <div className="flex-1 ml-0 md:ml-64">
        {location.pathname === "/teacher" && <TeacherHeader />}
        <main className={`p-4 md:p-8 ${location.pathname === "/teacher" ? "pt-24" : "pt-6"}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
