import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Resetpassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setMessage("Password updated locally. You can sign in now.");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border p-8">
        <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
        <p className="text-sm text-gray-600 mt-2">
          Frontend mode: this update is not sent to a backend.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            required
            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition"
          >
            Update Password
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-gray-700 rounded-lg bg-gray-50 border border-gray-200 p-3">
            {message}
          </p>
        )}

        <button
          onClick={() => navigate("/signin")}
          className="w-full mt-4 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Sign In
        </button>
      </div>
    </div>
  );
}
