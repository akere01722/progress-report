import { useMemo, useRef, useState, useEffect } from "react";
import {
  FiCheckCircle,
  FiXCircle,
  FiEdit2,
  FiPrinter,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";

const universityData = {
  Engineering: ["Software Engineering", "Civil Engineering", "Electrical Engineering"],
  "Biomedical Sciences": ["Nursing", "Laboratory Science", "Midwifery"],
  Business: ["Accounting", "Marketing", "Human Resource"],
};

const programs = ["HND", "BSc", "Masters I", "Masters II"];
const levels = ["100", "200", "300", "400", "Masters"];

function statusChip(status) {
  if (status === "Approved") return "text-green-700 bg-green-50 border-green-200";
  if (status === "Rejected") return "text-red-700 bg-red-50 border-red-200";
  return "text-amber-700 bg-amber-50 border-amber-200";
}

function percent(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function Modal({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100 text-gray-700" title="Close">
            <FiX />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ReportsAdminPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch students with explicit columns
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, profile_id, matricule, batch, status, faculty_id, department_id, program_id, level_id");

        if (studentsError) {
          console.error("Students error:", studentsError);
          setLoading(false);
          return;
        }

        // Fetch profiles to get names
        const profileIds = [...new Set((studentsData || []).map(s => s.profile_id).filter(Boolean))];
        let profilesMap = {};
        if (profileIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", profileIds);
          if (profilesData) {
            profilesData.forEach(p => { profilesMap[p.id] = p; });
          }
        }

        // Fetch scores from correct tables
        const { data: caData } = await supabase.from("ca_scores").select("*");
        const { data: examData } = await supabase.from("exam_scores").select("*");
        const { data: reportsData } = await supabase.from("reports").select("*");

        const builtReports = (studentsData || []).map((student) => {
          const profile = profilesMap[student.profile_id] || {};
          const studentCa = (caData || []).filter(c => c.student_id === student.id);
          const studentExam = (examData || []).filter(e => e.student_id === student.id);

          const caBySemester = {};
          studentCa.forEach(c => {
            if (!caBySemester[c.semester]) caBySemester[c.semester] = [];
            caBySemester[c.semester].push({ code: "COURSE", name: "Subject", score: c.score, over: c.max_score, remark: c.score >= c.max_score * 0.5 ? "Good" : "Improve" });
          });

          const examBySemester = {};
          studentExam.forEach(e => {
            if (!examBySemester[e.semester]) examBySemester[e.semester] = [];
            examBySemester[e.semester].push({ code: "COURSE", name: "Subject", score: e.score, over: e.max_score, remark: e.score >= e.max_score * 0.5 ? "Good" : "Improve" });
          });

          const existingReport = (reportsData || []).find(r => r.student_id === student.id);

          return {
            id: existingReport?.id || `RPT-${student.id}`,
            student: {
              id: student.id,
              matricule: student.matricule || "N/A",
              name: profile.full_name || "Unknown",
              faculty_id: student.faculty_id,
              department_id: student.department_id,
              program_id: student.program_id,
              level_id: student.level_id,
            },
            academicYear: student.batch || "2025/2026",
            status: existingReport?.status || "Pending",
            lastUpdated: existingReport?.last_updated?.split("T")[0] || new Date().toISOString().split("T")[0],
            remarks: existingReport?.remarks || "",
            attendance: {
              semester1: {
                present: existingReport?.attendance_sem1_present || 0,
                absent: existingReport?.attendance_sem1_absent || 0,
                partial: existingReport?.attendance_sem1_partial || 0
              },
              semester2: {
                present: existingReport?.attendance_sem2_present || 0,
                absent: existingReport?.attendance_sem2_absent || 0,
                partial: existingReport?.attendance_sem2_partial || 0
              },
            },
            teacherComments: {
              semester1: existingReport?.teacher_comments_sem1 || "No comments yet.",
              semester2: existingReport?.teacher_comments_sem2 || "No comments yet.",
            },
            progressive: {
              semester1: { ca: caBySemester.semester1 || [], exams: examBySemester.semester1 || [] },
              semester2: { ca: caBySemester.semester2 || [], exams: examBySemester.semester2 || [] },
            },
          };
        });

        setReports(builtReports);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [semester, setSemester] = useState("semester1");
  const [viewType, setViewType] = useState("ca");
  const [remarks, setRemarks] = useState("");
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [editMarksOpen, setEditMarksOpen] = useState(false);
  const [marksDraft, setMarksDraft] = useState([]);
  const printRef = useRef(null);

  const availableDepartments = useMemo(() => {
    return facultyId ? universityData[facultyId] : [];
  }, [facultyId]);

  const isCompleteFilter = facultyId && departmentId && programId && levelId;

  const onChangeFaculty = (v) => { setFacultyId(v); setDepartmentId(""); setProgramId(""); setLevelId(""); setStudentSearch(""); setSelectedId(null); };
  const onChangeDepartment = (v) => { setDepartmentId(v); setProgramId(""); setLevelId(""); setStudentSearch(""); setSelectedId(null); };
  const onChangeProgram = (v) => { setProgramId(v); setLevelId(""); setStudentSearch(""); setSelectedId(null); };
  const onChangeLevel = (v) => { setLevelId(v); setStudentSearch(""); setSelectedId(null); };

  const filtered = useMemo(() => {
    if (!isCompleteFilter) return [];
    const q = studentSearch.trim().toLowerCase();
    return reports
      .filter((r) => (statusFilter === "All" ? true : r.status === statusFilter))
      .filter((r) => r.student.faculty_id === facultyId)
      .filter((r) => r.student.department_id === departmentId)
      .filter((r) => r.student.program_id === programId)
      .filter((r) => r.student.level_id === levelId)
      .filter((r) => {
        if (!q) return true;
        return r.student.name.toLowerCase().includes(q) || r.student.matricule.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.lastUpdated < b.lastUpdated ? 1 : -1));
  }, [reports, facultyId, departmentId, programId, levelId, isCompleteFilter, studentSearch, statusFilter]);

  const selected = useMemo(() => reports.find((r) => r.id === selectedId) || null, [reports, selectedId]);

  const dataset = useMemo(() => selected?.progressive?.[semester]?.[viewType] || [], [selected, semester, viewType]);
  const attendance = useMemo(() => selected?.attendance?.[semester] || { present: 0, absent: 0, partial: 0 }, [selected, semester]);
  const teacherComment = useMemo(() => selected?.teacherComments?.[semester] || "", [selected, semester]);

  const openReport = (r) => {
    setSelectedId(r.id);
    setRemarks(r.remarks || "");
    setEditingRemarks(false);
    setSemester("semester1");
    setViewType("ca");
  };

  const approve = () => {
    if (!selected) return;
    setReports((prev) => prev.map((r) => r.id === selectedId ? { ...r, status: "Approved", remarks, lastUpdated: new Date().toISOString().slice(0, 10) } : r));
  };

  const reject = () => {
    if (!selected) return;
    setReports((prev) => prev.map((r) => r.id === selectedId ? { ...r, status: "Rejected", remarks, lastUpdated: new Date().toISOString().slice(0, 10) } : r));
  };

  const saveRemarks = () => {
    if (!selected) return;
    setReports((prev) => prev.map((r) => r.id === selectedId ? { ...r, remarks, lastUpdated: new Date().toISOString().slice(0, 10) } : r));
    setEditingRemarks(false);
  };

  const totalSessions = attendance.present + attendance.absent + attendance.partial;
  const presentRate = percent(attendance.present, totalSessions);

  const handlePrint = () => {
    if (!printRef.current) return window.print();
    const printContents = printRef.current.innerHTML;
    const styles = `<style>@page { margin: 12mm; } body { font-family: Arial, sans-serif; color: #111827; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; } th { background: #f9fafb; text-align: left; }</style>`;
    const originalHtml = document.body.innerHTML;
    document.body.innerHTML = `${styles}${printContents}`;
    window.print();
    document.body.innerHTML = originalHtml;
    window.location.reload();
  };

  const openEditMarks = () => {
    if (!selected) return;
    setMarksDraft(dataset.map((d) => ({ ...d, score: String(d.score || 0), over: String(d.over || 0) })));
    setEditMarksOpen(true);
  };

  const saveMarks = () => {
    if (!selected) return;
    setReports((prev) => prev.map((r) => {
      if (r.id !== selectedId) return r;
      return { ...r, lastUpdated: new Date().toISOString().slice(0, 10), progressive: { ...r.progressive, [semester]: { ...r.progressive[semester], [viewType]: marksDraft.map((m) => ({ ...m, score: Number(m.score) || 0, over: Number(m.over) || 0, remark: m.remark || "" })) } } };
    }));
    setEditMarksOpen(false);
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-8 text-center">
        <p className="text-gray-500">Loading reports data...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Progressive Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Select Faculty → Department → Program → Level. Then search and pick a student to review.</p>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <select className="w-full border border-gray-300 p-3 rounded-xl bg-white" value={facultyId} onChange={(e) => onChangeFaculty(e.target.value)}>
            <option value="">Select Faculty</option>
            {Object.keys(universityData).map((fac) => <option key={fac} value={fac}>{fac}</option>)}
          </select>
          <select className="w-full border border-gray-300 p-3 rounded-xl bg-white disabled:bg-gray-50" value={departmentId} onChange={(e) => onChangeDepartment(e.target.value)} disabled={!facultyId}>
            <option value="">Select Department</option>
            {availableDepartments.map((dep) => <option key={dep} value={dep}>{dep}</option>)}
          </select>
          <select className="w-full border border-gray-300 p-3 rounded-xl bg-white disabled:bg-gray-50" value={programId} onChange={(e) => onChangeProgram(e.target.value)} disabled={!departmentId}>
            <option value="">Select Program</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="w-full border border-gray-300 p-3 rounded-xl bg-white disabled:bg-gray-50" value={levelId} onChange={(e) => onChangeLevel(e.target.value)} disabled={!programId}>
            <option value="">Select Level</option>
            {levels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="lg:col-span-2">
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${isCompleteFilter ? "border-gray-300 bg-white" : "border-gray-200 bg-gray-50"}`}>
              <FiSearch className="text-gray-500" />
              <input 
                className="w-full outline-none text-sm bg-transparent" 
                placeholder={isCompleteFilter ? "Search student by name or matricule..." : "Select all dropdowns first..."} 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)} 
                disabled={!isCompleteFilter} 
              />
            </div>
          </div>
          <div className="lg:justify-self-end w-full">
            <select className="w-full border border-gray-300 p-3 rounded-xl bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Students</h2>
            <span className="text-xs text-gray-500">{isCompleteFilter ? `${filtered.length} found` : "0 found"}</span>
          </div>
          <div className="mt-4 space-y-3">
            {!isCompleteFilter && <div className="text-sm text-gray-500 rounded-2xl border border-dashed border-gray-200 p-4 bg-gray-50">Select all dropdowns above to load students.</div>}
            {isCompleteFilter && filtered.map((r) => (
              <button key={r.id} onClick={() => openReport(r)} className={`w-full text-left rounded-2xl border p-4 transition ${selectedId === r.id ? "border-gray-900 bg-gray-50" : "border-gray-100 bg-white hover:bg-gray-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.student.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.student.matricule} • {r.student.program_id} • Level {r.student.level_id}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusChip(r.status)}`}>{r.status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center text-gray-500">Select a student on the left to view the progressive report.</div>
          ) : (
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
              <div className="p-5 sm:p-6 border-b flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs text-gray-500">Student</p>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selected.student.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selected.student.matricule} • {selected.student.department_id} • {selected.student.program_id} • Level {selected.student.level_id}</p>
                  <p className="text-sm text-gray-500">Academic Year: {selected.academicYear}</p>
                  <div className="mt-3">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusChip(selected.status)}`}>{selected.status}</span>
                    <span className="ml-2 text-xs text-gray-400">Updated: {selected.lastUpdated}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handlePrint} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"><FiPrinter /> Print</button>
                  <button onClick={openEditMarks} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><FiEdit2 /> Edit Marks</button>
                </div>
              </div>

              <div className="p-5 sm:p-6 border-b bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Semester</label>
                    <select className="mt-2 w-full border border-gray-300 rounded-xl p-3 bg-white" value={semester} onChange={(e) => setSemester(e.target.value)}>
                      <option value="semester1">Semester 1</option>
                      <option value="semester2">Semester 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Report Type</label>
                    <select className="mt-2 w-full border border-gray-300 rounded-xl p-3 bg-white" value={viewType} onChange={(e) => setViewType(e.target.value)}>
                      <option value="ca">CA (Continuous Assessment)</option>
                      <option value="exams">Exams</option>
                    </select>
                  </div>
                </div>
              </div>

              <div ref={printRef} className="p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Semester</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{semester === "semester1" ? "Semester 1" : "Semester 2"}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Attendance</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{presentRate}%</p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs text-gray-500">Entries</p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{dataset.length}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b bg-white">
                    <h3 className="font-semibold text-gray-900">{viewType === "ca" ? "CA Progress" : "Exam Progress"}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 text-xs text-gray-600">
                        <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Over</th><th className="p-3 text-left">%</th><th className="p-3 text-left">Remark</th></tr>
                      </thead>
                      <tbody>
                        {dataset.map((s, idx) => {
                          const pct = percent(s.score, s.over);
                          return <tr key={idx} className="border-t hover:bg-gray-50"><td className="p-3 text-sm text-gray-700">{s.code}</td><td className="p-3 text-sm font-medium text-gray-900">{s.name}</td><td className="p-3 text-sm text-gray-700">{s.score}</td><td className="p-3 text-sm text-gray-700">{s.over}</td><td className="p-3 text-sm font-semibold text-gray-900">{pct}%</td><td className="p-3 text-sm text-gray-700">{s.remark}</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <h3 className="font-semibold text-gray-900">Teacher Comments</h3>
                  <p className="text-sm text-gray-600 mt-2">{teacherComment}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-gray-900">Admin Remarks</h3>
                    <button onClick={() => setEditingRemarks((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700"><FiEdit2 /> {editingRemarks ? "Stop" : "Edit"}</button>
                  </div>
                  {editingRemarks ? (
                    <div className="mt-3 space-y-3">
                      <textarea className="w-full min-h-[110px] rounded-xl border border-gray-200 p-3 text-sm" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Write a short remark..." />
                      <div className="flex gap-3">
                        <button onClick={saveRemarks} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"><FiCheckCircle /> Save</button>
                        <button onClick={() => { setRemarks(selected.remarks || ""); setEditingRemarks(false); }} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700"><FiXCircle /> Cancel</button>
                      </div>
                    </div>
                  ) : <p className="text-sm text-gray-600 mt-3">{remarks || "No remarks yet."}</p>}
                </div>
              </div>

              <div className="p-5 sm:p-6 border-t bg-gray-50 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">Approve to release this report to the student.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={reject} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700"><FiXCircle /> Reject</button>
                  <button onClick={approve} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white"><FiCheckCircle /> Approve</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={editMarksOpen} title={`Edit Marks — ${selected?.student?.name || ""}`} onClose={() => setEditMarksOpen(false)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Update scores and click Save.</p>
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr><th className="p-3 text-left">Code</th><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Over</th><th className="p-3 text-left">Remark</th></tr>
              </thead>
              <tbody>
                {marksDraft.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3 text-sm text-gray-700">{row.code}</td>
                    <td className="p-3 text-sm font-medium text-gray-900">{row.name}</td>
                    <td className="p-3"><input type="number" className="w-24 rounded-xl border border-gray-200 p-2 text-sm" value={row.score} onChange={(e) => setMarksDraft((prev) => prev.map((x, i) => i === idx ? { ...x, score: e.target.value } : x))} /></td>
                    <td className="p-3"><input type="number" className="w-24 rounded-xl border border-gray-200 p-2 text-sm" value={row.over} onChange={(e) => setMarksDraft((prev) => prev.map((x, i) => i === idx ? { ...x, over: e.target.value } : x))} /></td>
                    <td className="p-3"><input className="w-full rounded-xl border border-gray-200 p-2 text-sm" value={row.remark || ""} onChange={(e) => setMarksDraft((prev) => prev.map((x, i) => i === idx ? { ...x, remark: e.target.value } : x))} placeholder="Remark" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setEditMarksOpen(false)} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>
            <button onClick={saveMarks} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Save Marks</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
