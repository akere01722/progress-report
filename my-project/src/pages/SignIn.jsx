import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { FiEye, FiEyeOff, FiMail } from "react-icons/fi";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const goToPortal = (role) => {
    if (role === "admin") navigate("/admin");
    else if (role === "teacher") navigate("/teacher");
    else navigate("/student");
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        alert(error.message);
        return;
      }

      const user = data?.user;
      if (!user) {
        alert("Login failed. Please try again.");
        return;
      }

      // ✅ Only columns that exist in profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, role, must_change_password")
        .eq("id", user.id)
        .single();

      if (profileError) {
        alert(profileError.message);
        return;
      }

      // optional: load extra info based on role
      let extra = {};

      if (profile.role === "student") {
        const { data: sRow } = await supabase
          .from("students")
          .select("matricule, faculty_id, department_id, program_id, level_id, batch")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (sRow) extra = { ...sRow };
      }

      if (profile.role === "teacher") {
        const { data: tRow } = await supabase
          .from("teachers")
          .select("staff_id, faculty_id, department_id, employment, status")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (tRow) extra = { ...tRow };
      }

      const userData = {
        id: user.id,
        email: user.email,
        name: profile.full_name || user.email?.split("@")[0] || "User",
        role: profile.role,
        ...extra,
      };

      localStorage.setItem("userData", JSON.stringify(userData));

      // first login: force change password page (when you create it)
      if (profile.must_change_password) {
        navigate("/force-change-password");
        return;
      }

      goToPortal(profile.role);
    } catch (err) {
      alert(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-12">
        {/* LEFT SIDE */}
        <div className="flex flex-col justify-center">
          <h1 className="text-4xl font-bold text-gray-900 leading-tight">
            Welcome Back to Your <br />
            <span className="text-blue-600">Academic Hub</span>
          </h1>

          <p className="mt-4 text-gray-600 text-lg">
            Sign in to access your portal. Accounts are created by the Admin.
          </p>

          <img
            src="/students.png"
            alt="Students learning"
            className="mt-8 rounded-2xl shadow-lg w-full object-cover [image-rendering:crisp-edges]"
          />
        </div>

        {/* RIGHT SIDE */}
        <div className="bg-white rounded-2xl shadow-xl p-10 border">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 text-xl">
              👤
            </div>
            <h2 className="text-2xl font-bold">Sign In</h2>
            <p className="text-gray-500 text-sm mt-1 text-center">
              Use your assigned email and password.
            </p>
          </div>

          <form className="mt-8" onSubmit={handleSignIn}>
            <label className="text-sm font-medium">Email Address</label>

            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <FiMail />
              </span>

              <input
                type="email"
                className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <label className="text-sm font-medium mt-4 block">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full pr-12 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="mt-4 text-center">
              <a
                href="/forgotpassword"
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot Password?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}