import { useEffect, useMemo, useState } from "react";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";

/* ============================================
   UNIVERSITY DATA STRUCTURE (SUBJECTS)
============================================ */
const universityData = {
  Engineering: {
    "Software Engineering": [
      "Data Structures",
      "Algorithms",
      "Web Development",
      "Operating Systems",
      "Database Systems",
    ],
    "Civil Engineering": ["Structural Engineering", "Building Technology"],
    "Electrical Engineering": ["Circuit Analysis", "Power Systems"],
  },

  "Biomedical Sciences": {
    Nursing: ["Community Health Nursing", "Adult Nursing"],
    "Laboratory Science": ["Hematology", "Clinical Chemistry", "Medical Microbiology"],
    Midwifery: ["Basic Midwifery", "Advanced Midwifery"],
  },

  Business: {
    Accounting: ["Financial Accounting", "Auditing"],
    Marketing: ["Consumer Behaviour", "Digital Marketing"],
    "Human Resource": ["Human Resource Planning", "Organizational Behaviour"],
  },
};

const programs = ["HND", "BSc", "Masters I", "Masters II"];
const levels = ["100", "200", "300", "400", "Masters"];

/* ============================================
   MODAL COMPONENT
============================================ */
function Modal({ open, title, subtitle, children, onClose }) {
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-5 border-b flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle ? (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ============================================
   MAIN COMPONENT
============================================ */
export default function Subjects() {
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [program, setProgram] = useState("");
  const [level, setLevel] = useState("");

  // Local editable subjects list (so add/edit/delete works)
  const [customSubjects, setCustomSubjects] = useState({});

  // Popups state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState(null);

  // Form fields
  const [subjectName, setSubjectName] = useState("");

  const availableDepartments = faculty ? Object.keys(universityData[faculty]) : [];

  const key = useMemo(() => {
    if (!faculty || !department || !program || !level) return "";
    return `${faculty}|||${department}|||${program}|||${level}`;
  }, [faculty, department, program, level]);

  const subjects = useMemo(() => {
    const baseSubjects = faculty && department ? universityData[faculty][department] || [] : [];
    // if user added subjects for this selection, merge unique
    const extras = key && customSubjects[key] ? customSubjects[key] : [];
    const merged = [...baseSubjects, ...extras];
    // de-dup
    return Array.from(new Set(merged));
  }, [faculty, department, customSubjects, key]);

  const isCompleteSelection = faculty && department && program && level;

  /* SUMMARY */
  let summary = "Select all options to view subjects";
  if (isCompleteSelection) {
    summary = `Showing ${subjects.length} subject(s) for ${faculty} → ${department} → ${program} → Level ${level}`;
  }

  /* ACTIONS */
  const openAdd = () => {
    setSubjectName("");
    setAddOpen(true);
  };

  const saveAdd = () => {
    const name = subjectName.trim();
    if (!name || !key) return;

    setCustomSubjects((prev) => {
      const prevList = prev[key] || [];
      // avoid duplicates across base & custom
      const exists = subjects.some((s) => s.toLowerCase() === name.toLowerCase());
      if (exists) return prev;
      return { ...prev, [key]: [...prevList, name] };
    });

    setAddOpen(false);
  };

  const openEdit = (name) => {
    setSelectedSubject(name);
    setSubjectName(name);
    setEditOpen(true);
  };

  const saveEdit = () => {
    const newName = subjectName.trim();
    if (!newName || !key || !selectedSubject) return;

    // Only editing custom subjects reliably; base list is read-only.
    // If it's a base subject, we "override" by adding newName as custom
    // and (if it was custom) we replace it.
    setCustomSubjects((prev) => {
      const prevList = prev[key] || [];
      const isCustom = prevList.includes(selectedSubject);

      if (isCustom) {
        // replace in custom list
        const updated = prevList.map((s) => (s === selectedSubject ? newName : s));
        return { ...prev, [key]: Array.from(new Set(updated)) };
      }

      // base subject: just add the edited value as custom (so it appears)
      const exists = subjects.some((s) => s.toLowerCase() === newName.toLowerCase());
      if (exists) return prev;

      return { ...prev, [key]: [...prevList, newName] };
    });

    setEditOpen(false);
    setSelectedSubject(null);
  };

  const openDelete = (name) => {
    setSelectedSubject(name);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!key || !selectedSubject) return;

    // Only delete from custom list; base subjects remain.
    setCustomSubjects((prev) => {
      const prevList = prev[key] || [];
      return { ...prev, [key]: prevList.filter((s) => s !== selectedSubject) };
    });

    setDeleteOpen(false);
    setSelectedSubject(null);
  };

  return (
    <div className="w-full">
      {/* PAGE HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Subject Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Filter by faculty, department, program and level. Add, edit, or delete subjects.
          </p>
        </div>

        {isCompleteSelection && (
          <button
            onClick={openAdd}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            <FiPlus />
            Add Subject
          </button>
        )}
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 sm:p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* FACULTY */}
          <select
            className="border border-gray-200 p-3 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            value={faculty}
            onChange={(e) => {
              setFaculty(e.target.value);
              setDepartment("");
              setProgram("");
              setLevel("");
            }}
          >
            <option value="">Select Faculty</option>
            {Object.keys(universityData).map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>

          {/* DEPARTMENT */}
          <select
            className="border border-gray-200 p-3 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-50"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setProgram("");
              setLevel("");
            }}
            disabled={!faculty}
          >
            <option value="">Select Department</option>
            {availableDepartments.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </select>

          {/* PROGRAM */}
          <select
            className="border border-gray-200 p-3 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-50"
            value={program}
            onChange={(e) => {
              setProgram(e.target.value);
              setLevel("");
            }}
            disabled={!department}
          >
            <option value="">Select Program</option>
            {programs.map((prog) => (
              <option key={prog} value={prog}>
                {prog}
              </option>
            ))}
          </select>

          {/* LEVEL */}
          <select
            className="border border-gray-200 p-3 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-50"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            disabled={!program}
          >
            <option value="">Select Level</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        {/* SUMMARY */}
        <p className="mt-4 text-gray-600 font-medium">{summary}</p>
        {isCompleteSelection && (
          <p className="mt-1 text-xs text-gray-500">
            Note: Default subjects are read-only. Added subjects (custom) can be edited/deleted.
          </p>
        )}
      </div>

      {/* SUBJECT TABLE */}
      {isCompleteSelection && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 sm:p-6 w-full">
          {/* Header row (desktop) */}
          <div className="hidden md:grid md:grid-cols-3 font-semibold text-gray-600 border-b pb-3 text-sm">
            <span>#</span>
            <span>Subject Name</span>
            <span className="text-center">Actions</span>
          </div>

          <div className="mt-4 space-y-3">
            {subjects.map((subject, index) => {
              const isCustom = key && (customSubjects[key] || []).includes(subject);

              return (
                <div
                  key={`${subject}-${index}`}
                  className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-0 items-start md:items-center bg-gray-50 hover:bg-gray-100 p-4 rounded-2xl transition"
                >
                  <div className="text-sm text-gray-700">
                    <span className="md:hidden font-semibold text-gray-600"># </span>
                    {index + 1}
                  </div>

                  <div className="text-sm font-medium text-gray-900">
                    {subject}{" "}
                    {isCustom && (
                      <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Custom
                      </span>
                    )}
                  </div>

                  <div className="flex md:justify-center gap-3">
                    <button
                      className="p-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => openEdit(subject)}
                      title={isCustom ? "Edit subject" : "Edit (adds a custom version)"}
                    >
                      <FiEdit />
                    </button>

                    <button
                      className="p-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => openDelete(subject)}
                      disabled={!isCustom} // only allow deleting custom subjects
                      title={isCustom ? "Delete subject" : "Only custom subjects can be deleted"}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              );
            })}

            {subjects.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                No subjects found for this selection.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      <Modal
        open={addOpen}
        title="Add Subject"
        subtitle={`${faculty} → ${department} → ${program} → Level ${level}`}
        onClose={() => setAddOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Subject name</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
              placeholder="e.g. Software Testing"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setAddOpen(false)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveAdd}
              className="w-full sm:w-auto rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Add Subject
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={editOpen}
        title="Edit Subject"
        subtitle={
          selectedSubject
            ? `Editing: "${selectedSubject}" (Changes save as custom)`
            : ""
        }
        onClose={() => {
          setEditOpen(false);
          setSelectedSubject(null);
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Subject name</label>
            <input
              className="mt-1 w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-600/10"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => {
                setEditOpen(false);
                setSelectedSubject(null);
              }}
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="w-full sm:w-auto rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 transition"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        open={deleteOpen}
        title="Delete Subject"
        subtitle="Only custom subjects can be deleted"
        onClose={() => {
          setDeleteOpen(false);
          setSelectedSubject(null);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {selectedSubject || "this subject"}
            </span>
            ?
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                setDeleteOpen(false);
                setSelectedSubject(null);
              }}
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="w-full sm:w-auto rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
