import { Outlet } from "react-router-dom";
import TeacherSideBar from "./TeacherSideBar";
import TeacherHeader from "./teacherHeader";

export default function TeacherLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <TeacherSideBar />

      <div className="flex-1 ml-0 md:ml-64">
        <TeacherHeader />
        <main className="px-4 pb-4 pt-24 md:px-8 md:pb-8 md:pt-24">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
