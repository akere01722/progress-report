import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Results() {
  const [view, setView] = useState("CA");
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch CA and exam data
        const [caData, examData] = await Promise.all([
          supabase
            .from("ca_reports")
            .select("course_title, score, max_score")
            .eq("student_id", user.id),
          supabase
            .from("exam_reports")
            .select("course_title, score, max_score")
            .eq("student_id", user.id)
        ]);

        if (caData.data && examData.data) {
          // Combine CA and exam results
          const combinedResults = caData.data.map(ca => {
            const exam = examData.data.find(e => e.course_title === ca.course_title);
            const caScore = ca.score || 0;
            const examScore = exam?.score || 0;
            const total = caScore + examScore;
            const maxTotal = (ca.max_score || 0) + (exam?.max_score || 0);
            const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
            const remark = percentage >= 50 ? "Pass" : "Fail";

            return {
              subject: ca.course_title,
              ca: caScore,
              exam: examScore,
              total: total,
              maxTotal: maxTotal,
              remark: remark
            };
          });

          setResults(combinedResults);
        }
      }
    };

    fetchResults();
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Results</h1>

      <select
        value={view}
        onChange={(e) => setView(e.target.value)}
        className="border p-3 rounded-lg mb-6"
      >
        <option value="CA">Continuous Assessment (CA)</option>
        <option value="EXAM">Exam Results</option>
      </select>

      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead className="border-b">
            <tr>
              <th>Subject</th>
              <th>{view === "CA" ? "CA Score" : "Exam Score"}</th>
              <th>Total</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td>{r.subject}</td>
                <td>{view === "CA" ? r.ca : r.exam}</td>
                <td>{r.total}</td>
                <td>{r.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
