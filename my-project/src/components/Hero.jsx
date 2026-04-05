import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiBarChart2, FiShield } from "react-icons/fi";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section
      id="home"
      className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-cyan-50/40 pt-28 sm:pt-32"
    >
      <div className="pointer-events-none absolute -left-24 top-24 h-60 w-60 rounded-full bg-cyan-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-36 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:pb-24">
        <div className="relative z-10">
          <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            Modern Academic Intelligence
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Run your school with
            <span className="block bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              clarity and confidence
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            One platform for student records, attendance, results, and communication across
            admin, teacher, and student dashboards.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => navigate("/signin")}
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Get Started
              <FiArrowRight />
            </button>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Explore Features
            </a>
          </div>

          <div className="mt-9 grid grid-cols-3 gap-3 sm:max-w-lg sm:gap-4">
            <Stat value="50K+" label="Active Students" />
            <Stat value="2K+" label="Teachers" />
            <Stat value="98%" label="Satisfaction" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-2 shadow-[0_20px_70px_rgba(14,46,111,0.12)] backdrop-blur">
            <img
              src="/students.png"
              alt="Students and teacher collaborating"
              className="h-[310px] w-full rounded-2xl object-cover sm:h-[430px]"
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniCard
              icon={<FiBarChart2 />}
              title="Live Analytics"
              text="Realtime progress and attendance insights."
            />
            <MiniCard
              icon={<FiShield />}
              title="Secure Data"
              text="Role-based access across all dashboards."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 text-center shadow-sm">
      <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
    </div>
  );
}

function MiniCard({ icon, title, text }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}
