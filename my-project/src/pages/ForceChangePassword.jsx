import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function ForceChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      // Update the profile to mark password as changed
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      if (userData.id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", userData.id);
        
        if (profileError) {
          console.error("Profile update error:", profileError);
        } else {
          // Update local storage
          userData.must_change_password = false;
          localStorage.setItem("userData", JSON.stringify(userData));
        }
      }

      alert("Password updated successfully!");
      
      // Redirect based on role
      const role = userData.role;
      if (role === "admin") navigate("/admin");
      else if (role === "teacher") navigate("/teacher");
      else navigate("/student");
      
    } catch (err) {
      alert(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-4">
            <FiLock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Change Your Password</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            This is your first login. Please create a new password to continue.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full border rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 text-white px-5 py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          After changing your password, you'll be redirected to your dashboard.
        </p>
      </div>
    </div>
  );
}
