import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ROLE_HOME = {
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
};

export default function ForceChangePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const user = JSON.parse(localStorage.getItem("userData") || "{}");
    const updatedUser = { ...user, must_change_password: false };
    localStorage.setItem("userData", JSON.stringify(updatedUser));
    setSuccess(true);

    const role = updatedUser.role || "student";
    setTimeout(() => navigate(ROLE_HOME[role] || "/signin"), 400);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border p-8">
        <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        <p className="text-sm text-gray-600 mt-2">
          Frontend mode: this updates local session state only.
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
            placeholder="Confirm new password"
            required
            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition"
          >
            Save Password
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-4 text-sm text-green-700">Password updated. Redirecting...</p>}
      </div>
    </div>
  );
}
