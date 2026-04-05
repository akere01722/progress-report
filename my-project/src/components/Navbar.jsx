import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="fixed left-0 top-0 z-50 w-full border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="group flex items-center gap-2"
          onClick={() => navigate("/")}
        >
          <span className="inline-block h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
          <h1 className="text-2xl font-extrabold tracking-tight text-blue-700 transition group-hover:text-blue-800">
            ProgressTrack
          </h1>
        </button>

        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a href="#home" className="transition hover:text-blue-700">
            Home
          </a>
          <a href="#features" className="transition hover:text-blue-700">
            Features
          </a>
          <a href="#contact" className="transition hover:text-blue-700">
            Contact
          </a>
        </div>

        <button
          onClick={() => navigate("/signin")}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:px-6"
          type="button"
        >
          Sign In
        </button>
      </div>
    </nav>
  );
}
