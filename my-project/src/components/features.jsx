import { FiLayers, FiUsers, FiBarChart2, FiAward, FiShield, FiTrendingUp } from "react-icons/fi";

export default function Features() {
  const features = [
    {
      title: "Real-Time Progress Tracking",
      icon: <FiBarChart2 size={32} />,
      desc: "Monitor academic performance with live updates and detailed analytics.",
    },
    {
      title: "Multi-Role Access",
      icon: <FiUsers size={32} />,
      desc: "Seamless experience for students, teachers, and administrators.",
    },
    {
      title: "Comprehensive Reports",
      icon: <FiLayers size={32} />,
      desc: "Subject-wise reports with grade breakdowns and insights.",
    },
    {
      title: "Achievement Tracking",
      icon: <FiAward size={32} />,
      desc: "Track milestones and celebrate student accomplishments.",
    },
    {
      title: "Secure & Private",
      icon: <FiShield size={32} />,
      desc: "Bank-level security ensures all academic data stays protected.",
    },
    {
      title: "Academic Excellence",
      icon: <FiTrendingUp size={32} />,
      desc: "Tools designed to support improved academic performance.",
    },
  ];

  return (
    <section className="py-24 bg-gray-50 px-8">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800">Everything You Need</h1>
        <p className="text-gray-600 mt-3 text-lg">
          Powerful features designed to make academic tracking effortless and intuitive.
        </p>
      </div>

      <div className="mt-16 grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
        {features.map((f, i) => (
          <div
            key={i}
            className="p-8 bg-white rounded-2xl shadow-md hover:shadow-xl transition-transform hover:-translate-y-2"
          >
            <div className="text-blue-600 mb-4">{f.icon}</div>

            <h2 className="text-xl font-semibold text-gray-800">{f.title}</h2>
            <p className="text-gray-600 mt-2 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
