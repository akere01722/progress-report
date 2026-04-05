import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiEye, FiEyeOff, FiMail, FiShield, FiUser } from "react-icons/fi";
import { normalizeId } from "../lib/registrationData";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const ROLE_HOME = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export default function SignIn() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const isAdmin = role === "admin";
  const identifierLabel =
    role === "student"
      ? "Matricule or Email"
      : role === "teacher"
      ? "Staff ID or Email"
      : "Email Address";
  const identifierPlaceholder =
    role === "student"
      ? "e.g. LAB/26/0001 or student@school.edu"
      : role === "teacher"
      ? "e.g. TCH-26-001 or teacher@school.edu"
      : "admin@school.edu";

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    await new Promise((resolve) => setTimeout(resolve, 250));

    if (role === "admin") {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        setError("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        return;
      }

      const { data, error: loginError } = await supabase.rpc("login_admin", {
        p_email: identifier.trim().toLowerCase(),
        p_password: password,
      });

      if (loginError) {
        setLoading(false);
        setError(loginError.message || "Admin login failed.");
        return;
      }

      const admin = Array.isArray(data) ? data[0] : null;
      if (!admin) {
        setLoading(false);
        setError("Invalid admin email or password.");
        return;
      }

      const userData = {
        id: admin.id,
        email: admin.email,
        name: admin.full_name || "Admin",
        role: "admin",
        must_change_password: false,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      setLoading(false);
      navigate(ROLE_HOME.admin);
      return;
    }

    if (role === "student") {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        setError("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        return;
      }

      const { data, error: loginError } = await supabase.rpc("login_student", {
        p_identifier: identifier.trim(),
        p_password: password,
      });

      if (loginError) {
        const message = String(loginError.message || "");
        const missingRpc =
          loginError.code === "PGRST202" ||
          (message.toLowerCase().includes("login_student") &&
            message.toLowerCase().includes("function"));
        setLoading(false);
        setError(
          missingRpc
            ? "Backend function login_student is missing. Run the SQL setup for student login."
            : message || "Student login failed."
        );
        return;
      }

      const student = Array.isArray(data) ? data[0] : null;
      if (!student) {
        setLoading(false);
        setError("Invalid student credentials.");
        return;
      }

      const userData = {
        id: student.id,
        email: student.email || `${normalizeId(student.matricule)}@student.local`,
        name: student.full_name || student.name || "Student",
        role: "student",
        matricule: student.matricule,
        faculty: student.faculty || "",
        department: student.department || "",
        program: student.program || "",
        level: student.level || "",
        must_change_password: false,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      setLoading(false);
      navigate(ROLE_HOME.student);
      return;
    }

    if (role === "teacher") {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        setError("Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        return;
      }

      const { data, error: loginError } = await supabase.rpc("login_teacher", {
        p_identifier: identifier.trim(),
        p_password: password,
      });

      if (loginError) {
        const message = String(loginError.message || "");
        const missingRpc =
          loginError.code === "PGRST202" ||
          (message.toLowerCase().includes("login_teacher") &&
            message.toLowerCase().includes("function"));
        setLoading(false);
        setError(
          missingRpc
            ? "Backend function login_teacher is missing. Run the SQL setup for teacher login."
            : message || "Teacher login failed."
        );
        return;
      }

      const teacher = Array.isArray(data) ? data[0] : null;
      if (!teacher) {
        setLoading(false);
        setError("Invalid teacher credentials.");
        return;
      }

      const userData = {
        id: teacher.id || "",
        email: teacher.email || "",
        name: teacher.full_name || teacher.name || "Teacher",
        role: "teacher",
        staffId: teacher.staff_id || teacher.staffId || "",
        faculty: teacher.faculty || "",
        department: teacher.department || "",
        employment: teacher.employment || "",
        must_change_password: false,
      };

      localStorage.setItem("userData", JSON.stringify(userData));
      setLoading(false);
      navigate(ROLE_HOME.teacher);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
        >
          <FiArrowLeft />
          Back to Home
        </button>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="grid lg:grid-cols-2">
            <div className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-500 p-10 text-white lg:block">
              <div className="pointer-events-none absolute -left-10 top-8 h-44 w-44 rounded-full border border-white/20" />
              <div className="pointer-events-none absolute -bottom-12 right-6 h-52 w-52 rounded-full border border-white/20" />

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
                ProgressTrack
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight">
                Secure access for your entire academic ecosystem.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-blue-100">
                Login as admin, teacher, or student to manage records, attendance, and results in one connected workflow.
              </p>

              <img
                src="/students.png"
                alt="School team collaborating"
                className="mt-8 h-[320px] w-full rounded-2xl object-cover shadow-2xl"
              />
            </div>

            <div className="bg-white p-6 sm:p-8 lg:p-10">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FiShield className="text-lg" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Sign In</h2>
                  <p className="text-sm text-slate-500">Access your dashboard securely.</p>
                </div>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleSignIn}>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setIdentifier("");
                      setPassword("");
                      setError("");
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">{identifierLabel}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {isAdmin ? <FiMail /> : <FiUser />}
                    </span>
                    <input
                      type={isAdmin ? "email" : "text"}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                      placeholder={identifierPlaceholder}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      autoComplete={isAdmin ? "email" : "username"}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">System Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                      placeholder="Enter system password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>

                <div className="text-center">
                  <a
                    href="/forgotpassword"
                    className="text-sm font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
                  >
                    Forgot Password?
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
