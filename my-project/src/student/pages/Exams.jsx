import { useEffect, useMemo, useState } from "react";
import { FiDownload } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  fetchPublishedPeriodsForFaculty,
  fetchStudentPublishedResults,
} from "../../lib/resultsBackendWorkflow";
import { printTableToPdf } from "../../lib/pdfExport";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const buildPeriodKey = (period) => `${period.academicYear}__${period.semester}`;

export default function Exams() {
  const userData = useMemo(() => readUserData(), []);
  const faculty = userData?.faculty || "";
  const facultyId = userData?.facultyId || userData?.faculty_id || "";
  const matricule = userData?.matricule || "";
  const studentId = userData?.id || "";
  const studentName = userData?.name || "Student";

  const [publishedPeriods, setPublishedPeriods] = useState([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPeriods = async () => {
      setLoading(true);
      try {
        const periods = await fetchPublishedPeriodsForFaculty({ faculty, facultyId });
        if (!active) return;
        setPublishedPeriods(Array.isArray(periods) ? periods : []);
      } catch (error) {
        if (!active) return;
        setPublishedPeriods([]);
        toast.error(error?.message || "Failed to load published exam periods.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPeriods();
    return () => {
      active = false;
    };
  }, [faculty, facultyId]);

  const periodKeys = publishedPeriods.map((period) => buildPeriodKey(period));
  const activePeriodKey = periodKeys.includes(selectedPeriodKey)
    ? selectedPeriodKey
    : periodKeys[0] || "";

  const selectedPeriod = useMemo(
    () => publishedPeriods.find((period) => buildPeriodKey(period) === activePeriodKey) || null,
    [publishedPeriods, activePeriodKey]
  );

  useEffect(() => {
    let active = true;

    const loadRows = async () => {
      if (!selectedPeriod) {
        if (active) setRows([]);
        return;
      }

      setLoadingRows(true);
      try {
        const resultPack = await fetchStudentPublishedResults({
          faculty,
          facultyId,
          matricule,
          studentId,
          academicYear: selectedPeriod.academicYear,
          semester: selectedPeriod.semester,
        });

        if (!active) return;
        setRows(Array.isArray(resultPack?.rows) ? resultPack.rows : []);
      } catch (error) {
        if (!active) return;
        setRows([]);
        toast.error(error?.message || "Failed to load exam rows.");
      } finally {
        if (active) setLoadingRows(false);
      }
    };

    void loadRows();
    return () => {
      active = false;
    };
  }, [selectedPeriod, faculty, facultyId, matricule, studentId]);

  const handleDownloadPdf = () => {
    if (!selectedPeriod) {
      toast.error("Select year and semester first.");
      return;
    }

    const ok = printTableToPdf({
      title: "Exam Result Table",
      subtitle: `${studentName} (${matricule}) | ${faculty} | ${selectedPeriod.academicYear} ${selectedPeriod.semester}`,
      columns: [
        { key: "matricule", label: "Matricule" },
        { key: "studentName", label: "Student Name" },
        { key: "subject", label: "Course" },
        { key: "className", label: "Class" },
        { key: "ca", label: "CA/30" },
        { key: "exam", label: "Exam/70" },
        { key: "total", label: "Final/100" },
        { key: "remark", label: "Remark" },
      ],
      rows: rows.map((row) => ({
        matricule: row.matricule,
        studentName: row.studentName,
        subject: row.subject,
        className: row.className,
        ca: row.ca ?? "-",
        exam: row.exam ?? "-",
        total: row.total ?? "-",
        remark: row.remark ?? "-",
      })),
    });

    if (!ok) {
      toast.error("Allow popups to download PDF.");
      return;
    }

    toast.success("Print dialog opened. Save as PDF.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Examination Result Table</h1>
            <p className="text-sm text-gray-500 mt-1">
              Student details with CA/30, Exam/70, Final/100 and remarks.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={activePeriodKey}
              onChange={(e) => setSelectedPeriodKey(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none"
            >
              {publishedPeriods.length === 0 && <option value="">No Published Period</option>}
              {publishedPeriods.map((period) => (
                <option key={buildPeriodKey(period)} value={buildPeriodKey(period)}>
                  {period.academicYear} | {period.semester}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={!selectedPeriod || rows.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <FiDownload />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Matricule</th>
              <th className="py-2 pr-3">Student Name</th>
              <th className="py-2 pr-3">Course</th>
              <th className="py-2 pr-3">Class</th>
              <th className="py-2 pr-3">CA (30)</th>
              <th className="py-2 pr-3">Exam (70)</th>
              <th className="py-2 pr-3">Final (100)</th>
              <th className="py-2">Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.subject}-${row.className}`} className="border-b last:border-b-0">
                <td className="py-2 pr-3 font-semibold">{row.matricule}</td>
                <td className="py-2 pr-3">{row.studentName}</td>
                <td className="py-2 pr-3">{row.subject}</td>
                <td className="py-2 pr-3">{row.className}</td>
                <td className="py-2 pr-3">{row.ca ?? "-"}</td>
                <td className="py-2 pr-3">{row.exam ?? "-"}</td>
                <td className="py-2 pr-3 font-semibold">{row.total ?? "-"}</td>
                <td className="py-2">{row.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(loading || loadingRows) && (
          <p className="pt-4 text-sm text-gray-500">Loading exam results...</p>
        )}

        {!loading && !loadingRows && rows.length === 0 && (
          <p className="pt-4 text-sm text-gray-500">
            {publishedPeriods.length === 0
              ? "No exam result is published yet for your faculty."
              : "No exam result row found for your account in this period."}
          </p>
        )}
      </div>
    </div>
  );
}
