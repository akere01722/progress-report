import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();

    if (password.length < 6) return alert("Password must be at least 6 characters.");
    if (password !== confirm) return alert("Passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      alert("Password updated successfully. Please sign in.");
      navigate("/signin");
    } catch (err) {
      alert(err?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border p-8">
        <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your new password below.
        </p>

        <form onSubmit={handleUpdate} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">New Password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type="password"
              className="mt-1 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 text-white px-5 py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}