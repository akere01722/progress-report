import { useEffect, useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiSearch,
  FiSend,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { normalizeId } from "../../lib/registrationData";
import {
  SEMESTER_OPTIONS,
  fetchAdminResultOverview,
  getAcademicYearOptions,
  getCurrentAcademicYear,
  publishFacultyResults,
  reviewResultSubmission,
} from "../../lib/resultsBackendWorkflow";

const STATUS_STYLES = {
  submitted: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

const toResultMeta = (total) => {
  if (total === null) return { grade: "-", remark: "Incomplete" };
  if (total >= 70) return { grade: "A", remark: "Excellent" };
  if (total >= 60) return { grade: "B", remark: "Very Good" };
  if (total >= 50) return { grade: "C", remark: "Good" };
  if (total >= 45) return { grade: "D", remark: "Pass" };
  if (total >= 40) return { grade: "E", remark: "Pass" };
  return { grade: "F", remark: "Fail" };
};

const buildPairRows = (caSubmission, examSubmission) => {
  const rowsByMatricule = {};

  (caSubmission?.marks || []).forEach((row) => {
    const key = String(row.matricule || row.studentId || "").toLowerCase();
    if (!key) return;
    rowsByMatricule[key] = {
      matricule: row.matricule || "",
      studentName: row.name || "Unnamed Student",
      className: caSubmission.className,
      ca: Number(row.mark),
      exam: null,
    };
  });

  (examSubmission?.marks || []).forEach((row) => {
    const key = String(row.matricule || row.studentId || "").toLowerCase();
    if (!key) return;
    if (!rowsByMatricule[key]) {
      rowsByMatricule[key] = {
        matricule: row.matricule || "",
        studentName: row.name || "Unnamed Student",
        className: examSubmission.className,
        ca: null,
        exam: Number(row.mark),
      };
      return;
    }

    rowsByMatricule[key] = {
      ...rowsByMatricule[key],
      exam: Number(row.mark),
    };
  });

  return Object.values(rowsByMatricule)
    .map((row) => {
      const total =
        Number.isFinite(row.ca) && Number.isFinite(row.exam) ? row.ca + row.exam : null;
      const meta = toResultMeta(total);

      return {
        ...row,
        total,
        grade: meta.grade,
        remark: meta.remark,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
};

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function Reports() {
  const [reloadKey, setReloadKey] = useState(0);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [semester, setSemester] = useState(SEMESTER_OPTIONS[0]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [publishingFaculty, setPublishingFaculty] = useState("");
  const [reviewingId, setReviewingId] = useState("");

  const [overview, setOverview] = useState({
    faculties: [],
    summaries: [],
    submissions: [],
  });

  const yearOptions = useMemo(() => getAcademicYearOptions(5), []);

  useEffect(() => {
    let active = true;

    const loadOverview = async () => {
      setLoading(true);
      setLoadingError("");
      try {
        const data = await fetchAdminResultOverview({ academicYear, semester });
        if (!active) return;
        setOverview({
          faculties: Array.isArray(data?.faculties) ? data.faculties : [],
          summaries: Array.isArray(data?.summaries) ? data.summaries : [],
          submissions: Array.isArray(data?.submissions) ? data.submissions : [],
        });
      } catch (error) {
        if (!active) return;
        setOverview({ faculties: [], summaries: [], submissions: [] });
        setLoadingError(error?.message || "Failed to load reports from backend.");
        toast.error(error?.message || "Failed to load reports from backend.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadOverview();

    return () => {
      active = false;
    };
  }, [academicYear, semester, reloadKey]);

  const faculties = useMemo(
    () =>
      (overview.faculties || [])
        .map((row) => String(row?.name || "").trim())
        .filter(Boolean),
    [overview.faculties]
  );

  const activeFaculty = faculties.includes(selectedFaculty) ? selectedFaculty : "";

  const selectedSummary = useMemo(
    () =>
      activeFaculty
        ? (overview.summaries || []).find((summary) => summary.faculty === activeFaculty) || null
        : null,
    [overview.summaries, activeFaculty]
  );

  const allFacultySubmissions = useMemo(() => {
    const submissions = Array.isArray(overview.submissions) ? overview.submissions : [];
    if (!activeFaculty) return submissions;
    if (selectedSummary?.facultyId) {
      return submissions.filter((submission) => {
        if (submission?.facultyId) {
          return String(submission.facultyId) === String(selectedSummary.facultyId);
        }
        return normalizeId(submission?.faculty) === normalizeId(activeFaculty);
      });
    }
    return submissions.filter(
      (submission) => normalizeId(submission?.faculty) === normalizeId(activeFaculty)
    );
  }, [overview.submissions, activeFaculty, selectedSummary?.facultyId]);

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allFacultySubmissions.filter((submission) => {
      const statusMatch = statusFilter === "all" ? true : submission.status === statusFilter;
      const queryMatch = !q
        ? true
        : [
            submission.subject,
            submission.className,
            submission.teacherName,
            submission.teacherStaffId,
            submission.assessmentType,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);
      return statusMatch && queryMatch;
    });
  }, [allFacultySubmissions, statusFilter, search]);

  const activeSubmissionId = filteredSubmissions.some(
    (submission) => submission.id === selectedSubmissionId
  )
    ? selectedSubmissionId
    : filteredSubmissions[0]?.id || "";

  const selectedSubmission = useMemo(
    () => filteredSubmissions.find((submission) => submission.id === activeSubmissionId) || null,
    [filteredSubmissions, activeSubmissionId]
  );

  const pairedSubmissions = useMemo(() => {
    if (!selectedSubmission) return { caSubmission: null, examSubmission: null };

    const lookup = allFacultySubmissions.filter(
      (submission) =>
        submission.className === selectedSubmission.className &&
        submission.subject === selectedSubmission.subject &&
        (selectedSubmission?.facultyId && submission?.facultyId
          ? String(submission.facultyId) === String(selectedSubmission.facultyId)
          : normalizeId(submission?.faculty) === normalizeId(selectedSubmission?.faculty))
    );

    return {
      caSubmission: lookup.find((submission) => submission.assessmentType === "CA") || null,
      examSubmission: lookup.find((submission) => submission.assessmentType === "EXAM") || null,
    };
  }, [selectedSubmission, allFacultySubmissions]);

  const pairRows = useMemo(
    () => buildPairRows(pairedSubmissions.caSubmission, pairedSubmissions.examSubmission),
    [pairedSubmissions]
  );

  const selectedSubmissionSummary = useMemo(() => {
    if (!selectedSubmission) return null;
    return (
      (overview.summaries || []).find((summary) => {
        if (selectedSubmission?.facultyId && summary?.facultyId) {
          return String(summary.facultyId) === String(selectedSubmission.facultyId);
        }
        return normalizeId(summary?.faculty) === normalizeId(selectedSubmission?.faculty);
      }) || null
    );
  }, [overview.summaries, selectedSubmission]);

  const handleReview = async (submissionId, status) => {
    const userData = readUserData();
    try {
      setReviewingId(submissionId);
      await reviewResultSubmission({
        submissionId,
        status,
        reviewerName: userData?.name || "Admin",
      });

      setReloadKey((value) => value + 1);
      toast.success(
        status === "approved" ? "Submission approved." : "Submission rejected and sent back."
      );
    } catch (error) {
      toast.error(error?.message || "Failed to review submission.");
    } finally {
      setReviewingId("");
    }
  };

  const handlePublish = async (summary) => {
    if (!summary) return;

    if (!summary.canPublish) {
      toast.error(
        "Cannot publish yet. All CA and Exam submissions for this faculty must be approved."
      );
      return;
    }

    const userData = readUserData();
    try {
      setPublishingFaculty(summary.faculty);
      await publishFacultyResults({
        faculty: summary.faculty,
        facultyId: summary.facultyId,
        academicYear,
        semester,
        adminName: userData?.name || "Admin",
      });
      setReloadKey((value) => value + 1);
      toast.success(`${summary.faculty} results published for ${academicYear} ${semester}.`);
    } catch (error) {
      toast.error(error?.message || "Failed to publish results.");
    } finally {
      setPublishingFaculty("");
    }
  };

  const globalProgress = useMemo(() => {
    const summaries = overview.summaries || [];
    if (summaries.length === 0) return 0;
    return Math.round(
      summaries.reduce((acc, summary) => acc + Number(summary.progressPercent || 0), 0) /
        summaries.length
    );
  }, [overview.summaries]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg sm:p-7">
        <h1 className="text-2xl font-bold sm:text-3xl">Results Control Center</h1>
        <p className="mt-1 text-sm text-blue-50 sm:text-base">
          Approve teacher submissions and publish results faculty by faculty.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/20 bg-white/15 p-3">
            <p className="text-xs text-blue-100">Academic Year</p>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year} className="text-gray-900">
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-3">
            <p className="text-xs text-blue-100">Semester</p>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none"
            >
              {SEMESTER_OPTIONS.map((item) => (
                <option key={item} value={item} className="text-gray-900">
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/15 p-3">
            <p className="text-xs text-blue-100">Global Progress</p>
            <p className="mt-1 text-xl font-bold">{globalProgress}%</p>
          </div>
        </div>
      </div>

      {loadingError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {loadingError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(overview.summaries || []).map((summary) => (
          <div
            key={summary.faculty}
            className={`rounded-2xl border p-5 shadow-sm transition ${
              activeFaculty === summary.faculty
                ? "border-blue-300 bg-blue-50/50"
                : "border-gray-200 bg-white"
            }`}
          >
            <button
              onClick={() =>
                setSelectedFaculty((current) =>
                  current === summary.faculty ? "" : summary.faculty
                )
              }
              className="w-full text-left"
              type="button"
            >
              <p className="text-base font-bold text-gray-900">{summary.faculty}</p>
              <p className="mt-1 text-sm text-gray-600">
                Approved {summary.approvedComponents}/{summary.requiredComponents} components
              </p>
            </button>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all"
                style={{ width: `${summary.progressPercent}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                Submitted: {summary.submittedComponents}
              </span>
              <span className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 font-semibold text-red-700">
                Missing: {summary.missingComponents}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handlePublish(summary)}
              disabled={summary.published || publishingFaculty === summary.faculty}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                summary.published
                  ? "cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-500"
                  : summary.canPublish
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "border border-gray-200 bg-white text-gray-700"
              }`}
            >
              <FiSend />
              {summary.published
                ? "Published"
                : publishingFaculty === summary.faculty
                ? "Publishing..."
                : "Publish Faculty Results"}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Submission Queue</h2>
            <p className="text-sm text-gray-500">
              {activeFaculty || "All Faculties"} | {academicYear} | {semester}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <FiFilter className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-gray-700 outline-none"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <FiSearch className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, class, teacher..."
                className="w-full text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Class</th>
                <th className="py-2 pr-3">Subject</th>
                <th className="py-2 pr-3">Teacher</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Updated</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-semibold">{submission.assessmentType}</td>
                  <td className="py-2 pr-3">{submission.className}</td>
                  <td className="py-2 pr-3">{submission.subject}</td>
                  <td className="py-2 pr-3">
                    {submission.teacherName} ({submission.teacherStaffId || "-"})
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[submission.status] ||
                        "border-gray-200 bg-gray-50 text-gray-700"
                      }`}
                    >
                      {submission.status}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {submission.updatedAt
                      ? new Date(submission.updatedAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSubmissionId(submission.id)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReview(submission.id, "approved")}
                        disabled={submission.status === "approved" || reviewingId === submission.id}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReview(submission.id, "rejected")}
                        disabled={submission.status === "rejected" || reviewingId === submission.id}
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && filteredSubmissions.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">No submissions found.</p>
          )}
        </div>
      </div>

      {selectedSubmission && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Result Table: {selectedSubmission.className} | {selectedSubmission.subject}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                STATUS_STYLES[selectedSubmission.status] ||
                "border-gray-200 bg-gray-50 text-gray-700"
              }`}
            >
              Selected submission: {selectedSubmission.assessmentType} ({selectedSubmission.status})
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            CA/30 + Exam/70 + Final/100 with remarks for this class and subject.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Matricule</th>
                  <th className="py-2 pr-3">Student Name</th>
                  <th className="py-2 pr-3">Class</th>
                  <th className="py-2 pr-3">CA / 30</th>
                  <th className="py-2 pr-3">Exam / 70</th>
                  <th className="py-2 pr-3">Final / 100</th>
                  <th className="py-2 pr-3">Grade</th>
                  <th className="py-2">Remark</th>
                </tr>
              </thead>
              <tbody>
                {pairRows.map((row) => (
                  <tr key={row.matricule} className="border-b last:border-b-0">
                    <td className="py-2 pr-3 font-semibold">{row.matricule}</td>
                    <td className="py-2 pr-3">{row.studentName}</td>
                    <td className="py-2 pr-3">{row.className}</td>
                    <td className="py-2 pr-3">{row.ca ?? "-"}</td>
                    <td className="py-2 pr-3">{row.exam ?? "-"}</td>
                    <td className="py-2 pr-3 font-semibold">{row.total ?? "-"}</td>
                    <td className="py-2 pr-3">{row.grade}</td>
                    <td className="py-2">{row.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pairRows.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                No marks found for this course pair yet.
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
              <FiCheckCircle />
              CA status: {pairedSubmissions.caSubmission?.status || "missing"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">
              <FiClock />
              Exam status: {pairedSubmissions.examSubmission?.status || "missing"}
            </span>
            {selectedSubmissionSummary?.published ? (
              <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 font-semibold text-cyan-700">
                <FiSend />
                Faculty results already published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 font-semibold text-gray-700">
                <FiXCircle />
                Not published yet
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
