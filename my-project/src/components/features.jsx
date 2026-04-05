import {
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiClock,
  FiShield,
  FiUsers,
} from "react-icons/fi";

const features = [
  {
    title: "Real-time Dashboards",
    icon: FiBarChart2,
    desc: "See attendance, submissions, and performance trends instantly.",
  },
  {
    title: "Role-based Access",
    icon: FiUsers,
    desc: "Clear workflows for admin, teachers, and students in one system.",
  },
  {
    title: "Result Workflows",
    icon: FiBookOpen,
    desc: "Submit, review, approve, and publish results with full traceability.",
  },
  {
    title: "Attendance Control",
    icon: FiClock,
    desc: "Teacher submissions and admin review with weekly student publishing.",
  },
  {
    title: "Institution-grade Security",
    icon: FiShield,
    desc: "Protected academic records with controlled visibility by role.",
  },
  {
    title: "Academic Excellence",
    icon: FiAward,
    desc: "Tools designed to improve accountability and learning outcomes.",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-white py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Capabilities</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Everything your school needs in one platform
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Purpose-built modules that help teams move faster while keeping academic data organized.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-lg"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{feature.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
