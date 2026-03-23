import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  FiBookOpen,
  FiLayers,
  FiTrendingUp,
  FiCalendar,
  FiAlertCircle,
} from "react-icons/fi";

export default function Dashboard() {
  const [student, setStudent] = useState({ name: "", program: "BSc Computer Science", level: "300" });
  const [stats, setStats] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          setError(`Authentication error: ${authError.message}`);
          setLoading(false);
          return;
        }

        if (!user) {
          setError("No user logged in. Please sign in first.");
          setLoading(false);
          return;
        }

        // Fetch student info - get profile_id first, then join with profiles
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id, profile_id, program_id, level_id, batch")
          .eq("profile_id", user.id)
          .single();

        if (studentError) {
          setError(`Student data error: ${studentError.message}. Make sure your profile ID exists in the students table.`);
          setLoading(false);
          return;
        }

        if (studentData) {
          // Fetch profile to get name
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();
          
          const studentName = profileData?.full_name || "Student";
          const programDisplay = studentData.program_id || "N/A";
          const levelDisplay = studentData.level_id || "N/A";
          
          setStudent({ name: studentName, program: programDisplay, level: levelDisplay });

          // Fetch attendance percentage
          const { data: attendanceData, error: attendanceError } = await supabase
            .from("attendance")
            .select("status")
            .eq("student_id", user.id);

          if (attendanceError) {
            console.warn("Attendance fetch warning:", attendanceError.message);
          }

          let attendancePct = "0%";
          if (attendanceData && attendanceData.length > 0) {
            const total = attendanceData.length;
            const present = attendanceData.filter(a => a.status === "Present").length;
            attendancePct = total > 0 ? `${Math.round((present / total) * 100)}%` : "0%";
          }

          // Fetch average CA score from ca_scores table (not ca_reports)
          const { data: caData, error: caError } = await supabase
            .from("ca_scores")
            .select("score, max_score")
            .eq("student_id", studentData.id);

          if (caError) {
            console.warn("CA reports fetch warning:", caError.message);
          }

          let avgScore = "0%";
          if (caData && caData.length > 0) {
            const totalScore = caData.reduce((sum, ca) => sum + (ca.score / ca.max_score), 0);
            avgScore = `${Math.round((totalScore / caData.length) * 100)}%`;
          }

          // Set dynamic stats
          setStats([
            {
              label: "Program",
              value: programDisplay,
              icon: <FiBookOpen />,
              accent: "border-blue-500 text-blue-600",
            },
            {
              label: "Level",
              value: levelDisplay,
              icon: <FiLayers />,
              accent: "border-purple-500 text-purple-600",
            },
            {
              label: "Average Score",
              value: avgScore,
              icon: <FiTrendingUp />,
              accent: "border-green-500 text-green-600",
            },
            {
              label: "Attendance",
              value: attendancePct,
              icon: <FiCalendar />,
              accent: "border-orange-500 text-orange-600",
            },
          ]);
        }
      } catch (err) {
        setError(`Unexpected error: ${err.message}`);
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <FiAlertCircle className="text-red-500 text-2xl mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold text-lg">Unable to load dashboard</h3>
              <p className="text-red-600 mt-1">{error}</p>
              <div className="mt-4 text-sm text-red-500">
                <p>Possible solutions:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Check that your .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</li>
                  <li>Run setup-tables.sql in your Supabase SQL editor</li>
                  <li>Make sure your user ID exists in the students table</li>
                  <li>Check the browser console for more details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {student.name || "Student"}
        </h1>
        <p className="text-gray-600 mt-1">
          Your academic performance at a glance
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <div
            key={i}
            className="
              bg-white
              rounded-2xl
              border
              shadow-xl
              p-7
              transition-all
              duration-300
              hover:shadow-2xl
              hover:-translate-y-1
            "
          >
            {/* Icon Container */}
            <div
              className={`
                w-14 h-14
                flex items-center justify-center
                rounded-xl
                border-2
                ${s.accent}
                mb-5
                bg-gray-50
              `}
            >
              <span className="text-2xl">{s.icon}</span>
            </div>

            {/* Label */}
            <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">
              {s.label}
            </p>

            {/* Value */}
            <p className="text-3xl font-extrabold text-gray-900 mt-2">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
