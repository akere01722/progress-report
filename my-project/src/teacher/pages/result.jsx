import { Outlet } from "react-router-dom";

export default function TeacherResult() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Results</h1>
      <p>View and manage student results here.</p>
      <Outlet />
    </div>
  );
}
