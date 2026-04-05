import { Outlet, useLocation } from "react-router-dom";
import StudentSidebar from "./StudentSidebar";
import StudentHeader from "./StudentHeader";

export default function StudentLayout() {
  const location = useLocation();
  const routeTitles = {
    "/student": "Dashboard",
    "/student/results": "Results Summary",
    "/student/ca": "CA Results",
    "/student/exams": "Exam Results",
    "/student/attendance": "Attendance",
    "/student/courses": "My Courses",
    "/student/unvalidated": "Unvalidated Courses",
  };
  const title = routeTitles[location.pathname] || "Student";

  return (
    <div className="flex min-h-screen bg-gray-100">
      <StudentSidebar />

      <div className="flex-1 ml-0 md:ml-64">
        <StudentHeader title={title} />
        <main className="px-4 pb-4 pt-24 md:px-8 md:pb-8 md:pt-24">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
