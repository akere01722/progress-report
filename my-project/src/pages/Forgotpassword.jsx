import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Forgotpassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border p-8">
        <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
        <p className="text-sm text-gray-600 mt-2">
          Frontend mode: this page does not send real emails.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition"
          >
            Send Reset Link
          </button>
        </form>

        {submitted && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
            Demo request submitted for {email}. Continue to reset page.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => navigate("/signin")}
            className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Sign In
          </button>
          <button
            onClick={() => navigate("/reset-password")}
            className="flex-1 border border-blue-300 rounded-lg py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Go to Reset
          </button>
        </div>
      </div>
    </div>
  );
}
