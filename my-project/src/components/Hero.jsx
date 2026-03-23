import { useNavigate } from "react-router-dom";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section className="w-full bg-[#f5f9ff] pt-32 pb-20 px-8 flex flex-col md:flex-row items-center justify-between">
      
      {/* Left Text */}
      <div className="max-w-xl">
        <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          Modern Academic Management
        </span>

        <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
          Track Academic Progress with
          <span className="text-blue-600"> Clarity</span>
        </h1>

        <p className="mt-4 text-gray-600 text-base md:text-lg">
          A comprehensive platform for students, teachers, and parents to
          monitor academic performance, track grades, and celebrate achievements
          in real-time.
        </p>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => navigate("/signin")}
            className="px-6 md:px-20 py-3 bg-blue-600 text-white rounded-lg text-base md:text-lg hover:bg-blue-700 transition"
          >
            Get Started
          </button>


        </div>

        {/* Statistics */}
        <div className="mt-12 flex flex-col md:flex-row gap-4 md:gap-12 text-left">
          <div>
            <h2 className="text-3xl font-bold">50K+</h2>
            <p className="text-gray-600 text-sm">Active Students</p>
          </div>
          <div>
            <h2 className="text-3xl font-bold">2K+</h2>
            <p className="text-gray-600 text-sm">Teachers</p>
          </div>
          <div>
            <h2 className="text-3xl font-bold">98%</h2>
            <p className="text-gray-600 text-sm">Satisfaction</p>
          </div>
        </div>
      </div>

      {/* Right Image */}
      <img
        src="/students.png"
        alt="Students working"
        className="rounded-2xl shadow-lg w-full md:w-[600px] lg:w-[800px] mt-8 md:mt-0 object-cover [image-rendering:crisp-edges]"
      />
    </section>
  );
}
