import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ToastContainer } from "react-toastify";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTopButton from "./components/ScrollToTopButton";

/* =======================
   PUBLIC WEBSITE
======================= */
const Navbar = lazy(() => import("./components/Navbar"));
const Hero = lazy(() => import("./components/Hero"));
const Features = lazy(() => import("./components/features"));
const CTA = lazy(() => import("./components/CTA"));
const Footer = lazy(() => import("./components/Footer"));

/* =======================
   AUTH
======================= */
const SignIn = lazy(() => import("./pages/SignIn"));
const Forgotpassword = lazy(() => import("./pages/Forgotpassword"));
const Resetpassword = lazy(() => import("./pages/Resetpassword"));
const ForceChangePassword = lazy(() => import("./pages/ForceChangePassword"));

/* =======================
   ADMIN
======================= */
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const Students = lazy(() => import("./admin/pages/Students"));
const Teachers = lazy(() => import("./admin/pages/Teachers"));
const Subjects = lazy(() => import("./admin/pages/Subjects"));
const Attendance = lazy(() => import("./admin/pages/Attendance"));
const Reports = lazy(() => import("./admin/pages/Reports"));
const Settings = lazy(() => import("./admin/pages/Settings"));
const AdminInbox = lazy(() => import("./admin/pages/inbox"));

/* =======================
   STUDENT
======================= */
const StudentLayout = lazy(() => import("./student/StudentLayout"));
const StudentDashboard = lazy(() => import("./student/pages/Dashboard"));
const StudentResults = lazy(() => import("./student/pages/Results"));
const StudentAttendance = lazy(() => import("./student/pages/Attendance"));
const StudentCourses = lazy(() => import("./student/pages/Courses"));
const Unvalidatedcourses = lazy(() => import("./student/pages/Unvalidatedcourses"));
const Ca = lazy(() => import("./student/pages/Ca"));
const Exams = lazy(() => import("./student/pages/Exams"));

/* =======================
   TEACHER
======================= */
const TeacherLayout = lazy(() => import("./teacher/TeacherLayout"));
const TeacherDashboard = lazy(() => import("./teacher/pages/Dashboard"));
const TeacherAttendance = lazy(() => import("./teacher/pages/Attendance"));
const TeacherCourses = lazy(() => import("./teacher/pages/MyCourses"));
const TeacherResult = lazy(() => import("./teacher/pages/result"));
const TeacherCa = lazy(() => import("./teacher/pages/ca"));
const TeacherExams = lazy(() => import("./teacher/pages/exams"));
const TeacherLogout = lazy(() => import("./teacher/pages/logout"));
const TeacherInbox = lazy(() => import("./teacher/pages/inbox"));

const ROLE_HOME = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function ProtectedRoute({ allowedRoles, children }) {
  const user = readUserData();
  const role = String(user?.role || "").toLowerCase();

  if (!role) {
    return <Navigate to="/signin" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] || "/signin"} replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const user = readUserData();
  const role = String(user?.role || "").toLowerCase();

  if (role && ROLE_HOME[role]) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div>Loading...</div></div>}>
          <Routes>
            {/* =======================
                PUBLIC WEBSITE
            ======================= */}
            <Route
              path="/"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <>
                    <Navbar />
                    <Hero />
                    <Features />
                    <CTA />
                    <Footer />
                  </>
                </Suspense>
              }
            />

            {/* =======================
                AUTH
            ======================= */}
            <Route
              path="/signin"
              element={
                <PublicOnlyRoute>
                  <SignIn />
                </PublicOnlyRoute>
              }
            />
            <Route path="/forgotpassword" element={<Forgotpassword />} />
            <Route path="/reset-password" element={<Resetpassword />} />
            <Route path="/force-change-password" element={<ForceChangePassword />} />

            {/* =======================
                REDIRECTS (Handle common typos)
            ======================= */}
            <Route path="/tadmin" element={<Navigate to="/admin" replace />} />

            {/* =======================
                ADMIN DASHBOARD
            ======================= */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              <Route path="inbox" element={<AdminInbox />} />
            </Route>

            {/* =======================
                STUDENT DASHBOARD
            ======================= */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={["student"]}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
              <Route path="results" element={<StudentResults />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="courses" element={<StudentCourses />} />
              <Route path="unvalidated" element={<Unvalidatedcourses />} />
              <Route path="ca" element={<Ca />} />
              <Route path="exams" element={<Exams />} />
            </Route>

            {/* =======================
                TEACHER DASHBOARD
            ======================= */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={["teacher"]}>
                  <TeacherLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TeacherDashboard />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="courses" element={<TeacherCourses />} />
              <Route path="results" element={<TeacherResult />}>
                <Route path="ca" element={<TeacherCa />} />
                <Route path="exams" element={<TeacherExams />} />
              </Route>
              <Route path="inbox" element={<TeacherInbox />} />
              <Route path="logout" element={<TeacherLogout />} />
              <Route path="uploads" element={<TeacherCourses />} />
              <Route path="schedule" element={<TeacherDashboard />} />
              <Route path="notifications" element={<TeacherInbox />} />
              <Route path="upload-ca" element={<TeacherCourses />} />
            </Route>

            {/* =======================
                CATCH-ALL 404 ROUTE
            ======================= */}
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
                    <p className="text-gray-600 mb-4">Page not found</p>
                    <button
                      onClick={() => {
                        window.location.href = "/";
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Go Home
                    </button>
                  </div>
                </div>
              }
            />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={2500}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          <ScrollToTopButton />
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}
