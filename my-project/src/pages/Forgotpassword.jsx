import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      alert("Password reset link sent! Check your email.");
      navigate("/signin");
    } catch (err) {
      alert(err?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 flex items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border p-8">
        <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email and we’ll send a reset link.
        </p>

        <form onSubmit={handleSend} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="mt-1 w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 text-white px-5 py-3 font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            Back to Sign In
          </button>
        </form>
      </div>
    </div>
  );
}