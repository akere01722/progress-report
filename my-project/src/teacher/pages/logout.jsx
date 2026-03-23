import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";

export default function TeacherLogout() {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem("teacherToken");
    localStorage.removeItem("teacherUser");

    // OPTIONAL: clear session cookies if used
    sessionStorage.clear();

    // Redirect to login page
    navigate("/signin");
  };

  return (
    <>

      {/* LOGOUT BUTTON */}
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-3 text-red-600 font-semibold hover:bg-red-50 px-4 py-3 rounded-lg transition w-full"
      >
        <FiLogOut className="text-xl" />
        Logout
      </button>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">

            <h2 className="text-lg font-bold mb-2">
              Confirm Logout
            </h2>

            <p className="text-gray-600 mb-6">
              Are you sure you want to logout?
            </p>

            <div className="flex justify-end gap-3">

              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg border font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold"
              >
                Logout
              </button>

            </div>
          </div>

        </div>
      )}

    </>
  );
}
