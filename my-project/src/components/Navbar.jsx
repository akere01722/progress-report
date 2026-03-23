import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="w-full flex items-center justify-between px-8 py-4 bg-white shadow-sm fixed top-0 left-0 z-50">
      <h1 className="text-2xl font-bold text-blue-600 cursor-pointer" onClick={() => navigate("/")}>
        ProgressTrack
      </h1>

      <button
        onClick={() => navigate("/signin")}
        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Sign In
      </button>
    </nav>
  );
}
