import { useNavigate } from "react-router-dom";

export default function CTA() {
  const navigate = useNavigate();

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-blue-200/40 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-6 py-12 text-white shadow-[0_24px_70px_rgba(37,99,235,0.3)] sm:px-10 sm:py-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Launch Faster</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
              Ready to modernize your school operations?
            </h2>
            <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
              Sign in to manage registrations, attendance, results, and communication from one workspace.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/signin")}
              className="rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Access Dashboard
            </button>
            <a
              href="#contact"
              className="rounded-xl border border-white/50 bg-white/10 px-7 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Contact Team
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
