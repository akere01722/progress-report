import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiEdit,
  FiMail,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiUserPlus,
  FiUserX,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabaseClient";
import {
  TEACHERS_STORAGE_KEY,
  normalizeId,
  safeReadArray,
  writeArray,
} from "../../lib/registrationData";

const employmentTypes = ["Full-Time", "Part-Time", "Visiting"];

const emptyAssignment = () => ({ className: "", subject: "" });

const GENERAL_CLASS_OPTIONS = [
  "HND - Level 1",
  "HND - Level 2",
  "HND - Level 3",
  "BSc - Level 1",
  "BSc - Level 2",
  "BSc - Level 3",
  "BSc - Level 4",
  "Masters I",
  "Masters II",
].map((item) => ({ value: item, label: item }));

const normalizeAssignments = (rows) => {
  const seen = new Set();
  const output = [];

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const className = String(row?.className || "").trim();
    const subject = String(row?.subject || "").trim();
    if (!className || !subject) return;

    const key = `${normalizeId(className)}__${normalizeId(subject)}`;
    if (seen.has(key)) return;
    seen.add(key);

    output.push({ className, subject });
  });

  return output;
};

const validateAssignments = (rows) => {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  if (normalizedRows.length === 0) {
    return "Add at least one class and subject assignment.";
  }

  const seenPair = new Set();
  const seenSubject = new Set();
  for (const row of normalizedRows) {
    const className = String(row?.className || "").trim();
    const subject = String(row?.subject || "").trim();

    if (!className || !subject) {
      return "Every assignment row must include both class and subject.";
    }

    const subjectKey = normalizeId(subject);
    if (seenSubject.has(subjectKey)) {
      return "A lecturer cannot be assigned the same subject twice.";
    }
    seenSubject.add(subjectKey);

    const pairKey = `${normalizeId(className)}__${subjectKey}`;
    if (seenPair.has(pairKey)) {
      return "Duplicate class and subject assignment found.";
    }
    seenPair.add(pairKey);
  }

  return "";
};

const generateAutoStaffId = (teachers) => {
  const year = String(new Date().getFullYear()).slice(-2);
  const pattern = new RegExp(`^TCH-${year}-(\\d+)$`, "i");

  const next =
    (Array.isArray(teachers) ? teachers : []).reduce((max, teacher) => {
      const value = String(teacher?.staff_id || teacher?.staffId || "").trim();
      const match = value.match(pattern);
      if (!match) return max;
      const n = Number(match[1]);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0) + 1;

  return `TCH-${year}-${String(next).padStart(3, "0")}`;
};

const buildSubjectCatalog = (rows, faculties, departments) => {
  const facultyIdByName = new Map(
    (Array.isArray(faculties) ? faculties : []).map((faculty) => [
      normalizeId(faculty?.name),
      String(faculty?.id),
    ])
  );
  const departmentIdByFacultyName = new Map(
    (Array.isArray(departments) ? departments : []).map((department) => [
      `${String(department?.faculty_id)}::${normalizeId(department?.name)}`,
      String(department?.id),
    ])
  );

  const dedupe = new Set();
  const output = [];

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const name = String(
      row?.name ?? row?.subject_name ?? row?.subject ?? row?.title ?? ""
    ).trim();
    if (!name) return;

    let facultyId = row?.faculty_id != null ? String(row.faculty_id) : "";
    if (!facultyId) {
      const facultyName = String(row?.faculty ?? row?.faculty_name ?? "").trim();
      if (facultyName) facultyId = facultyIdByName.get(normalizeId(facultyName)) || "";
    }

    let departmentId = row?.department_id != null ? String(row.department_id) : "";
    if (!departmentId) {
      const departmentName = String(row?.department ?? row?.department_name ?? "").trim();
      if (departmentName && facultyId) {
        departmentId =
          departmentIdByFacultyName.get(`${facultyId}::${normalizeId(departmentName)}`) || "";
      } else if (departmentName) {
        const matches = (Array.isArray(departments) ? departments : []).filter(
          (department) => normalizeId(department?.name) === normalizeId(departmentName)
        );
        if (matches.length === 1) {
          departmentId = String(matches[0].id);
          facultyId = String(matches[0].faculty_id);
        }
      }
    }

    if (!facultyId || !departmentId) return;
    if (row?.is_active === false) return;

    const code = String(row?.code ?? row?.subject_code ?? "").trim();
    const key = `${facultyId}__${departmentId}__${normalizeId(name)}`;
    if (dedupe.has(key)) return;
    dedupe.add(key);

    output.push({
      id: String(row?.id ?? key),
      name,
      code,
      faculty_id: facultyId,
      department_id: departmentId,
    });
  });

  return output.sort((a, b) => String(a.name).localeCompare(String(b.name)));
};

const getAvailableSubjectOptions = (rows, rowIndex, options) => {
  const current = normalizeId(rows?.[rowIndex]?.subject);
  const usedByOthers = new Set(
    (Array.isArray(rows) ? rows : [])
      .filter((_, index) => index !== rowIndex)
      .map((row) => normalizeId(row?.subject))
      .filter(Boolean)
  );

  return (Array.isArray(options) ? options : []).filter((option) => {
    const key = normalizeId(option?.value);
    return key === current || !usedByOthers.has(key);
  });
};

const findCachedTeacher = (cachedTeachers, row) => {
  const targetId = String(row?.id ?? "");
  const targetStaffId = normalizeId(row?.staff_id);
  const targetEmail = normalizeId(row?.email);

  return (
    cachedTeachers.find((item) => {
      const byId = targetId && String(item?.id ?? "") === targetId;
      const byStaffId = targetStaffId && normalizeId(item?.staffId) === targetStaffId;
      const byEmail = targetEmail && normalizeId(item?.email) === targetEmail;
      return byId || byStaffId || byEmail;
    }) || null
  );
};

const toCacheTeacher = (teacher) => ({
  id: teacher.id,
  name: teacher.name,
  email: teacher.email,
  staffId: teacher.staff_id,
  faculty: teacher.facultyName,
  department: teacher.departmentName,
  employment: teacher.employment,
  status: teacher.status,
  assignments: normalizeAssignments(teacher.assignments),
});

export default function Teachers() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjectsCatalog, setSubjectsCatalog] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [facultyId, setFacultyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employment, setEmployment] = useState("");
  const [query, setQuery] = useState("");

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updatingTeacher, setUpdatingTeacher] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState(null);

  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editAssignments, setEditAssignments] = useState([emptyAssignment()]);
  const [editingTeacherId, setEditingTeacherId] = useState("");

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formEmployment, setFormEmployment] = useState("Full-Time");
  const [formFacultyId, setFormFacultyId] = useState("");
  const [formDepartmentId, setFormDepartmentId] = useState("");
  const [formAssignments, setFormAssignments] = useState([emptyAssignment()]);

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editEmployment, setEditEmployment] = useState("Full-Time");
  const [editFacultyId, setEditFacultyId] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState("");
  const [editStaffId, setEditStaffId] = useState("");

  const filteredDepartments = useMemo(() => {
    if (!facultyId) return [];
    return departments.filter((d) => String(d.faculty_id) === String(facultyId));
  }, [departments, facultyId]);

  const formDepartments = useMemo(() => {
    if (!formFacultyId) return [];
    return departments.filter((d) => String(d.faculty_id) === String(formFacultyId));
  }, [departments, formFacultyId]);

  const editDepartments = useMemo(() => {
    if (!editFacultyId) return [];
    return departments.filter((d) => String(d.faculty_id) === String(editFacultyId));
  }, [departments, editFacultyId]);

  const formClassOptions = useMemo(() => {
    if (!formFacultyId || !formDepartmentId) return [];
    return GENERAL_CLASS_OPTIONS;
  }, [formFacultyId, formDepartmentId]);

  const formSubjectOptions = useMemo(() => {
    if (!formFacultyId || !formDepartmentId) return [];

    return subjectsCatalog
      .filter(
        (item) =>
          String(item.faculty_id) === String(formFacultyId) &&
          String(item.department_id) === String(formDepartmentId)
      )
      .map((item) => ({
        value: String(item.name || "").trim(),
        label: item.code ? `${item.code} - ${item.name}` : item.name,
      }));
  }, [subjectsCatalog, formFacultyId, formDepartmentId]);

  const selectedTeacherClassOptions = useMemo(() => {
    if (!selectedTeacher) return [];
    return GENERAL_CLASS_OPTIONS;
  }, [selectedTeacher]);

  const selectedTeacherSubjectOptions = useMemo(() => {
    if (!selectedTeacher) return [];

    const filtered = subjectsCatalog
      .filter(
        (item) =>
          String(item.faculty_id) === String(selectedTeacher.faculty_id || "") &&
          String(item.department_id) === String(selectedTeacher.department_id || "")
      )
      .map((item) => ({
        value: String(item.name || "").trim(),
        label: item.code ? `${item.code} - ${item.name}` : item.name,
      }));

    if (filtered.length > 0) return filtered;

    const existing = normalizeAssignments(selectedTeacher.assignments).map((row) => row.subject);
    return Array.from(new Set(existing.map((item) => String(item).trim())))
      .filter(Boolean)
      .map((item) => ({ value: item, label: item }));
  }, [selectedTeacher, subjectsCatalog]);

  const refreshData = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [{ data: facultyRows, error: facultyError }, { data: departmentRows, error: departmentError }] =
          await Promise.all([
            supabase.from("faculties").select("id,name,code").order("name"),
            supabase.from("departments").select("id,name,faculty_id").order("name"),
          ]);

        if (facultyError) throw facultyError;
        if (departmentError) throw departmentError;

        const facultyList = facultyRows || [];
        const departmentList = departmentRows || [];
        setFaculties(facultyList);
        setDepartments(departmentList);

        const { data: subjectRows, error: subjectError } = await supabase
          .from("subjects")
          .select("*");

        if (subjectError) {
          const isMissingSubjectsTable =
            subjectError.code === "42P01" ||
            String(subjectError.message || "").toLowerCase().includes("subjects");
          if (!isMissingSubjectsTable) throw subjectError;
          setSubjectsCatalog([]);
        } else {
          setSubjectsCatalog(buildSubjectCatalog(subjectRows || [], facultyList, departmentList));
        }

        const { data: teachersData, error: teachersError } = await supabase
          .from("teachers")
          .select(
            "id, staff_id, full_name, email, faculty_id, department_id, employment, status, created_at"
          );

        let assignmentRows = [];
        let assignmentError = null;

        const assignmentResponse = await supabase
          .from("teacher_assignments")
          .select("teacher_id, class_name, subject")
          .order("created_at", { ascending: true });

        if (assignmentResponse.error) {
          const missingCreatedAt =
            assignmentResponse.error.code === "42703" ||
            String(assignmentResponse.error.message || "")
              .toLowerCase()
              .includes("created_at");

          if (missingCreatedAt) {
            const fallbackAssignmentResponse = await supabase
              .from("teacher_assignments")
              .select("teacher_id, class_name, subject");
            assignmentRows = fallbackAssignmentResponse.data || [];
            assignmentError = fallbackAssignmentResponse.error || null;
          } else {
            assignmentError = assignmentResponse.error;
          }
        } else {
          assignmentRows = assignmentResponse.data || [];
        }

        const assignmentsByTeacherId = new Map();
        if (assignmentError) {
          const isMissingAssignmentsTable =
            assignmentError.code === "42P01" ||
            String(assignmentError.message || "").toLowerCase().includes("teacher_assignments");
          if (!isMissingAssignmentsTable) throw assignmentError;
        } else {
          (assignmentRows || []).forEach((row) => {
            const teacherId = String(row.teacher_id || "");
            if (!teacherId) return;
            if (!assignmentsByTeacherId.has(teacherId)) {
              assignmentsByTeacherId.set(teacherId, []);
            }
            assignmentsByTeacherId.get(teacherId).push({
              className: String(row.class_name || "").trim(),
              subject: String(row.subject || "").trim(),
            });
          });
        }

        if (teachersError) {
          const isCreatedAtMissing =
            teachersError.code === "42703" || String(teachersError.message || "").includes("created_at");

          if (!isCreatedAtMissing) throw teachersError;

          const { data: fallbackRows, error: fallbackError } = await supabase
            .from("teachers")
            .select("id, staff_id, full_name, email, faculty_id, department_id, employment, status");

          if (fallbackError) throw fallbackError;

          const fallbackTeachers = fallbackRows || [];
          const facultyNameById = new Map(facultyList.map((item) => [String(item.id), item.name]));
          const departmentNameById = new Map(
            departmentList.map((item) => [String(item.id), item.name])
          );
          const cachedTeachers = safeReadArray(TEACHERS_STORAGE_KEY, []);

          const mapped = fallbackTeachers
            .map((row) => {
              const cached = findCachedTeacher(cachedTeachers, {
                id: row.id,
                staff_id: row.staff_id,
                email: row.email,
              });
              const backendAssignments =
                normalizeAssignments(assignmentsByTeacherId.get(String(row.id)) || []);

              return {
                id: String(row.id),
                staff_id: row.staff_id || "",
                faculty_id: row.faculty_id ? String(row.faculty_id) : "",
                department_id: row.department_id ? String(row.department_id) : "",
                facultyName:
                  (row.faculty_id && facultyNameById.get(String(row.faculty_id))) ||
                  cached?.faculty ||
                  "",
                departmentName:
                  (row.department_id && departmentNameById.get(String(row.department_id))) ||
                  cached?.department ||
                  "",
                employment: row.employment || "",
                status: row.status || "active",
                name: row.full_name || cached?.name || "Unknown",
                email: row.email || cached?.email || "",
                created_at: null,
                assignments:
                  backendAssignments.length > 0
                    ? backendAssignments
                    : normalizeAssignments(cached?.assignments),
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name));

          setTeachers(mapped);
          return;
        }

        const rawTeachers = teachersData || [];
        const facultyNameById = new Map(facultyList.map((item) => [String(item.id), item.name]));
        const departmentNameById = new Map(departmentList.map((item) => [String(item.id), item.name]));
        const cachedTeachers = safeReadArray(TEACHERS_STORAGE_KEY, []);

        const mapped = rawTeachers
          .map((row) => {
            const cached = findCachedTeacher(cachedTeachers, {
              id: row.id,
              staff_id: row.staff_id,
              email: row.email,
            });
            const backendAssignments =
              normalizeAssignments(assignmentsByTeacherId.get(String(row.id)) || []);

            return {
              id: String(row.id),
              staff_id: row.staff_id || "",
              faculty_id: row.faculty_id ? String(row.faculty_id) : "",
              department_id: row.department_id ? String(row.department_id) : "",
              facultyName:
                (row.faculty_id && facultyNameById.get(String(row.faculty_id))) ||
                cached?.faculty ||
                "",
              departmentName:
                (row.department_id && departmentNameById.get(String(row.department_id))) ||
                cached?.department ||
                "",
              employment: row.employment || "",
              status: row.status || "active",
              name: row.full_name || cached?.name || "Unknown",
              email: row.email || cached?.email || "",
              created_at: row.created_at || null,
              assignments:
                backendAssignments.length > 0
                  ? backendAssignments
                  : normalizeAssignments(cached?.assignments),
            };
          })
          .sort((a, b) => {
            if (!a.created_at && !b.created_at) return a.name.localeCompare(b.name);
            if (!a.created_at) return 1;
            if (!b.created_at) return -1;
            return new Date(b.created_at) - new Date(a.created_at);
          });

        setTeachers(mapped);
      } catch (error) {
        toast.error(error?.message || "Failed to load teachers.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    writeArray(TEACHERS_STORAGE_KEY, teachers.map(toCacheTeacher));
  }, [teachers]);

  const filteredTeachersList = useMemo(() => {
    const q = query.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const facultyMatch = facultyId ? String(teacher.faculty_id) === String(facultyId) : true;
      const departmentMatch = departmentId
        ? String(teacher.department_id) === String(departmentId)
        : true;
      const employmentMatch = employment ? teacher.employment === employment : true;
      const queryMatch = !q
        ? true
        : [
            teacher.staff_id,
            teacher.name,
            teacher.email,
            teacher.facultyName,
            teacher.departmentName,
            teacher.employment,
            (teacher.assignments || [])
              .map((row) => `${row.className} ${row.subject}`)
              .join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);

      return facultyMatch && departmentMatch && employmentMatch && queryMatch;
    });
  }, [teachers, facultyId, departmentId, employment, query]);

  const summary = `Showing ${filteredTeachersList.length} teacher(s)`;

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormEmployment("Full-Time");
    setFormFacultyId("");
    setFormDepartmentId("");
    setFormAssignments([emptyAssignment()]);
  };

  const resetEditForm = () => {
    setEditingTeacherId("");
    setEditName("");
    setEditEmail("");
    setEditEmployment("Full-Time");
    setEditFacultyId("");
    setEditDepartmentId("");
    setEditStaffId("");
  };

  const openEditTeacher = (teacher) => {
    setEditingTeacherId(String(teacher?.id || ""));
    setEditName(String(teacher?.name || ""));
    setEditEmail(String(teacher?.email || ""));
    setEditEmployment(String(teacher?.employment || "Full-Time"));
    setEditFacultyId(String(teacher?.faculty_id || ""));
    setEditDepartmentId(String(teacher?.department_id || ""));
    setEditStaffId(String(teacher?.staff_id || ""));
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    if (updatingTeacher) return;
    setShowEditModal(false);
    resetEditForm();
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    if (!editingTeacherId) {
      toast.error("Teacher not selected.");
      return;
    }

    const normalizedName = String(editName || "").trim();
    const normalizedEmail = String(editEmail || "").trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !editFacultyId || !editDepartmentId) {
      toast.error("Fill all required fields.");
      return;
    }

    const selectedDepartment = departments.find(
      (department) => String(department.id) === String(editDepartmentId)
    );
    if (
      !selectedDepartment ||
      String(selectedDepartment.faculty_id) !== String(editFacultyId)
    ) {
      toast.error("Selected department does not belong to the selected faculty.");
      return;
    }

    setUpdatingTeacher(true);
    try {
      const { error } = await supabase
        .from("teachers")
        .update({
          full_name: normalizedName,
          email: normalizedEmail,
          employment: editEmployment,
          faculty_id: editFacultyId,
          department_id: editDepartmentId,
        })
        .eq("id", editingTeacherId);

      if (error) throw error;

      setShowEditModal(false);
      resetEditForm();
      await refreshData({ silent: true });
      toast.success("Teacher updated.");
    } catch (error) {
      toast.error(error?.message || "Failed to update teacher.");
    } finally {
      setUpdatingTeacher(false);
    }
  };

  const openDeleteTeacher = (teacher) => {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deletingTeacher) return;
    setShowDeleteModal(false);
    setTeacherToDelete(null);
  };

  const handleDeleteTeacher = async () => {
    const teacherId = String(teacherToDelete?.id || "");
    if (!teacherId) {
      toast.error("Teacher not selected.");
      return;
    }

    setDeletingTeacher(true);
    try {
      const assignmentDelete = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("teacher_id", teacherId);

      if (assignmentDelete.error && assignmentDelete.error.code !== "42P01") {
        throw assignmentDelete.error;
      }

      const { error } = await supabase.from("teachers").delete().eq("id", teacherId);
      if (error) throw error;

      if (selectedTeacher && String(selectedTeacher.id) === teacherId) {
        setShowAssignmentsModal(false);
        setSelectedTeacher(null);
        setEditAssignments([emptyAssignment()]);
      }

      setShowDeleteModal(false);
      setTeacherToDelete(null);
      await refreshData({ silent: true });
      toast.success("Teacher deleted.");
    } catch (error) {
      toast.error(error?.message || "Failed to delete teacher.");
    } finally {
      setDeletingTeacher(false);
    }
  };

  const updateFormAssignment = (index, key, value) => {
    setFormAssignments((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      )
    );
  };

  const addFormAssignmentRow = () => {
    setFormAssignments((prev) => [...prev, emptyAssignment()]);
  };

  const removeFormAssignmentRow = (index) => {
    setFormAssignments((prev) => {
      if (prev.length === 1) return [emptyAssignment()];
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const assignmentError = validateAssignments(formAssignments);
      if (assignmentError) throw new Error(assignmentError);
      const generatedStaffId = generateAutoStaffId(teachers);
      const normalizedEmail = formEmail.trim().toLowerCase();
      const normalizedName = formName.trim();

      const payload = {
        email: normalizedEmail,
        full_name: normalizedName,
        staff_id: generatedStaffId,
        employment: formEmployment,
        faculty_id: formFacultyId || null,
        department_id: formDepartmentId,
      };

      const { data: createdTeacher, error } = await supabase
        .from("teachers")
        .insert([
          {
            staff_id: payload.staff_id,
            full_name: payload.full_name,
            email: payload.email,
            faculty_id: payload.faculty_id,
            department_id: payload.department_id,
            employment: payload.employment,
          },
        ])
        .select(
          "id, staff_id, full_name, email, faculty_id, department_id, employment, status, created_at"
        )
        .single();
      if (error) throw error;

      const normalizedAssignments = normalizeAssignments(formAssignments);
      if (normalizedAssignments.length > 0) {
        const { error: assignmentInsertError } = await supabase
          .from("teacher_assignments")
          .insert(
            normalizedAssignments.map((row) => ({
              teacher_id: createdTeacher.id,
              class_name: row.className,
              subject: row.subject,
            }))
          );

        if (assignmentInsertError) {
          await supabase.from("teachers").delete().eq("id", createdTeacher.id);
          throw assignmentInsertError;
        }
      }

      setCreatedCreds({
        email: createdTeacher?.email || payload.email,
        staffId: createdTeacher?.staff_id || payload.staff_id,
        tempPassword: null,
        note: "Teacher can sign in with Staff ID and the system password.",
      });
      setShowCredsModal(true);
      setShowRegisterModal(false);
      resetForm();

      await refreshData({ silent: true });

      toast.success("Teacher registered with assignments.");
    } catch (error) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("profile_id")) {
        toast.error("Teacher table still requires profile_id. Make profile_id nullable or remove it.");
      } else {
        toast.error(message || "Failed to create teacher.");
      }
    } finally {
      setCreating(false);
    }
  };

  const openManageAssignments = (teacher) => {
    setSelectedTeacher(teacher);
    const rows =
      Array.isArray(teacher?.assignments) && teacher.assignments.length > 0
        ? teacher.assignments.map((row) => ({
            className: String(row.className || ""),
            subject: String(row.subject || ""),
          }))
        : [emptyAssignment()];
    setEditAssignments(rows);
    setShowAssignmentsModal(true);
  };

  const updateEditAssignment = (index, key, value) => {
    setEditAssignments((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [key]: value,
            }
          : row
      )
    );
  };

  const addEditAssignmentRow = () => {
    setEditAssignments((prev) => [...prev, emptyAssignment()]);
  };

  const removeEditAssignmentRow = (index) => {
    setEditAssignments((prev) => {
      if (prev.length === 1) return [emptyAssignment()];
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const saveManagedAssignments = async () => {
    const assignmentError = validateAssignments(editAssignments);
    if (assignmentError) {
      toast.error(assignmentError);
      return;
    }

    if (!selectedTeacher?.id) {
      toast.error("Teacher not selected.");
      return;
    }

    setSavingAssignments(true);
    try {
      const teacherId = String(selectedTeacher.id);
      const normalizedRows = normalizeAssignments(editAssignments);

      const { error: deleteError } = await supabase
        .from("teacher_assignments")
        .delete()
        .eq("teacher_id", teacherId);
      if (deleteError) throw deleteError;

      if (normalizedRows.length > 0) {
        const { error: insertError } = await supabase
          .from("teacher_assignments")
          .insert(
            normalizedRows.map((row) => ({
              teacher_id: teacherId,
              class_name: row.className,
              subject: row.subject,
            }))
          );
        if (insertError) throw insertError;
      }

      await refreshData({ silent: true });
      setShowAssignmentsModal(false);
      setSelectedTeacher(null);
      setEditAssignments([emptyAssignment()]);
      toast.success("Teacher assignments updated.");
    } catch (error) {
      toast.error(error?.message || "Failed to update assignments.");
    } finally {
      setSavingAssignments(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="text-sm text-gray-500 mt-4">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Teacher Registration</h2>
            <p className="mt-1 text-sm text-blue-50">
              Register and manage teachers by class using faculty/department filters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshData({ silent: true })}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20 disabled:opacity-60"
              disabled={refreshing}
            >
              <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowRegisterModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50"
            >
              <FiPlus />
              Register Teacher
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border p-3 rounded-lg"
            placeholder="Search teacher, class, or subject..."
          />

          <select
            className="border p-3 rounded-lg"
            value={facultyId}
            onChange={(e) => {
              setFacultyId(e.target.value);
              setDepartmentId("");
            }}
          >
            <option value="">All Faculties</option>
            {faculties.map((faculty) => (
              <option key={faculty.id} value={String(faculty.id)}>
                {faculty.name}
              </option>
            ))}
          </select>

          <select
            className="border p-3 rounded-lg"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            disabled={!facultyId}
          >
            <option value="">All Departments</option>
            {filteredDepartments.map((department) => (
              <option key={department.id} value={String(department.id)}>
                {department.name}
              </option>
            ))}
          </select>

          <select
            className="border p-3 rounded-lg"
            value={employment}
            onChange={(e) => setEmployment(e.target.value)}
          >
            <option value="">All Employment Types</option>
            {employmentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-4 text-gray-600 font-medium">{summary}</p>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-8">
        <div className="grid grid-cols-[1.1fr_1.8fr_1.1fr_2.4fr_0.9fr_1fr] gap-4 font-semibold text-gray-600 border-b-2 p-4 text-sm items-center">
          <span>Staff ID</span>
          <span>Name</span>
          <span>Employment</span>
          <span>Assignments</span>
          <span>Status</span>
          <span className="text-center">Actions</span>
        </div>

        <div className="mt-4 space-y-4">
          {filteredTeachersList.map((teacher) => (
            <div
              key={teacher.id}
              className="grid grid-cols-[1.1fr_1.8fr_1.1fr_2.4fr_0.9fr_1fr] gap-4 items-center bg-gray-50 hover:bg-gray-100 p-4 rounded-lg transition"
            >
              <span className="font-medium">{teacher.staff_id || "-"}</span>
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{teacher.name}</p>
                <p className="truncate text-xs text-gray-500">
                  {teacher.departmentName}
                  {teacher.departmentName && teacher.facultyName ? ", " : ""}
                  {teacher.facultyName}
                </p>
              </div>
              <span>{teacher.employment || "-"}</span>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">
                  {(teacher.assignments || []).length} assignment(s)
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(teacher.assignments || []).slice(0, 2).map((row, index) => (
                    <span
                      key={`${row.className}-${row.subject}-${index}`}
                      className="inline-flex max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700"
                      title={`${row.className} - ${row.subject}`}
                    >
                      {row.className} - {row.subject}
                    </span>
                  ))}
                  {(teacher.assignments || []).length > 2 && (
                    <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                      +{teacher.assignments.length - 2}
                    </span>
                  )}
                </div>
              </div>

              <span className="inline-flex w-fit px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                {teacher.status}
              </span>

              <div className="flex justify-center gap-2">
                <button
                  className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                  title="Manage assignments"
                  onClick={() => openManageAssignments(teacher)}
                >
                  <FiUserPlus />
                </button>
                <button
                  className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  title="Edit teacher"
                  onClick={() => openEditTeacher(teacher)}
                >
                  <FiEdit />
                </button>
                <button
                  className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  title="Delete teacher"
                  onClick={() => openDeleteTeacher(teacher)}
                >
                  <FiUserX />
                </button>
              </div>
            </div>
          ))}

          {filteredTeachersList.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No teachers found for the selected filters.
            </div>
          )}
        </div>
      </div>

      {showCredsModal && createdCreds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Teacher Account Created</h2>
            <p className="text-sm text-gray-600 mb-4">
              Share these login details. If no password is shown, use "Forgot password".
            </p>

            <div className="bg-gray-50 border rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Email</span>
                <span className="font-semibold">{createdCreds.email}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Staff ID</span>
                <span className="font-semibold">{createdCreds.staffId || "-"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Temp Password</span>
                <span className="font-semibold">{createdCreds.tempPassword || "-"}</span>
              </div>
              {createdCreds.note && <p className="text-xs text-gray-500 mt-2">{createdCreds.note}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Email: ${createdCreds.email}\nTemp Password: ${createdCreds.tempPassword || "-"}`
                  );
                  toast.success("Credentials copied.");
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg font-semibold"
              >
                Copy
              </button>
              <button
                onClick={() => setShowCredsModal(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div
            className="absolute inset-0"
            onClick={closeEditModal}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-6 py-5 text-white">
              <h2 className="text-2xl font-bold">Edit Teacher</h2>
              <p className="mt-1 text-sm text-blue-50">Update teacher details and save changes.</p>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                  Staff ID: <span className="font-semibold">{editStaffId || "-"}</span>
                </div>

                <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={updatingTeacher}
                />

                <label className="block text-sm font-semibold text-gray-700">Email</label>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={updatingTeacher}
                  />
                </div>

                <label className="block text-sm font-semibold text-gray-700">Employment</label>
                <select
                  value={editEmployment}
                  onChange={(e) => setEditEmployment(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={updatingTeacher}
                >
                  {employmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-gray-700">Faculty</label>
                <select
                  value={editFacultyId}
                  onChange={(e) => {
                    setEditFacultyId(e.target.value);
                    setEditDepartmentId("");
                  }}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={updatingTeacher}
                >
                  <option value="">Select Faculty</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-gray-700">Department</label>
                <select
                  value={editDepartmentId}
                  onChange={(e) => setEditDepartmentId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  required
                  disabled={!editFacultyId || updatingTeacher}
                >
                  <option value="">Select Department</option>
                  {editDepartments.map((department) => (
                    <option key={department.id} value={String(department.id)}>
                      {department.name}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                    disabled={updatingTeacher}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={updatingTeacher}
                  >
                    {updatingTeacher ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && teacherToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Delete Teacher</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will remove <span className="font-semibold">{teacherToDelete.name}</span> (
              {teacherToDelete.staff_id || "-"}) and all assigned classes/subjects.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeDeleteModal}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                disabled={deletingTeacher}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeacher}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={deletingTeacher}
              >
                {deletingTeacher ? "Deleting..." : "Delete Teacher"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 px-6 py-5 text-white">
              <h2 className="text-2xl font-bold">Register Teacher</h2>
              <p className="mt-1 text-sm text-blue-50">
                Fill one long form and scroll up/down to review all fields before saving.
              </p>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={creating}
                />

                <label className="block text-sm font-semibold text-gray-700">Email</label>
                <div className="relative">
                  <FiMail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="teacher@school.edu"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-3 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={creating}
                  />
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                  Staff ID is generated automatically by the system.
                </div>

                <label className="block text-sm font-semibold text-gray-700">Employment</label>
                <select
                  value={formEmployment}
                  onChange={(e) => setFormEmployment(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creating}
                >
                  {employmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-gray-700">
                  Faculty (optional)
                </label>
                <select
                  value={formFacultyId}
                  onChange={(e) => {
                    setFormFacultyId(e.target.value);
                    setFormDepartmentId("");
                    setFormAssignments([emptyAssignment()]);
                  }}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creating}
                >
                  <option value="">Select Faculty</option>
                  {faculties.map((faculty) => (
                    <option key={faculty.id} value={String(faculty.id)}>
                      {faculty.name}
                    </option>
                  ))}
                </select>

                <label className="block text-sm font-semibold text-gray-700">Department</label>
                <select
                  value={formDepartmentId}
                  onChange={(e) => {
                    setFormDepartmentId(e.target.value);
                    setFormAssignments([emptyAssignment()]);
                  }}
                  className="w-full rounded-xl border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  disabled={!formFacultyId || creating}
                  required
                >
                  <option value="">Select Department</option>
                  {formDepartments.map((department) => (
                    <option key={department.id} value={String(department.id)}>
                      {department.name}
                    </option>
                  ))}
                </select>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">Assign Classes and Subjects</h3>
                      <p className="text-sm text-gray-600">
                        Add one row per class and subject assigned to this teacher.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addFormAssignmentRow}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      disabled={creating}
                    >
                      <FiPlus />
                      Add Row
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {formAssignments.map((row, index) => (
                      <div
                        key={`assignment-${index}`}
                        className="grid grid-cols-1 sm:grid-cols-[1.6fr_1.6fr_auto] gap-2"
                      >
                        <select
                          value={row.className}
                          onChange={(e) => updateFormAssignment(index, "className", e.target.value)}
                          className="rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          disabled={!formFacultyId || !formDepartmentId || creating}
                          required
                        >
                          <option value="">
                            {formClassOptions.length > 0 ? "Select Class" : "No class available"}
                          </option>
                          {formClassOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={row.subject}
                          onChange={(e) => updateFormAssignment(index, "subject", e.target.value)}
                          className="rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                          disabled={!formFacultyId || !formDepartmentId || creating}
                          required
                        >
                          <option value="">
                            {formSubjectOptions.length > 0
                              ? "Select Subject"
                              : "No subject available"}
                          </option>
                          {getAvailableSubjectOptions(
                            formAssignments,
                            index,
                            formSubjectOptions
                          ).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeFormAssignmentRow(index)}
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100"
                          title="Remove row"
                          disabled={creating}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>

                  {formFacultyId && formDepartmentId && formSubjectOptions.length === 0 && (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      No subjects found for this faculty and department. Add subjects first.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {creating ? "Creating..." : "Register Teacher"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAssignmentsModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAssignmentsModal(false)}
          />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Manage Assignments</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedTeacher.name} ({selectedTeacher.staff_id || "No Staff ID"})
                </p>
              </div>
              <button
                onClick={() => setShowAssignmentsModal(false)}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <FiX />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {editAssignments.map((row, index) => (
                <div
                  key={`edit-assignment-${index}`}
                  className="grid grid-cols-1 md:grid-cols-[1.6fr_1.6fr_auto] gap-2"
                >
                  <select
                    value={row.className}
                    onChange={(e) => updateEditAssignment(index, "className", e.target.value)}
                    className="rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">
                      {selectedTeacherClassOptions.length > 0
                        ? "Select Class"
                        : "No class available"}
                    </option>
                    {selectedTeacherClassOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={row.subject}
                    onChange={(e) => updateEditAssignment(index, "subject", e.target.value)}
                    className="rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">
                      {selectedTeacherSubjectOptions.length > 0
                        ? "Select Subject"
                        : "No subject available"}
                    </option>
                    {getAvailableSubjectOptions(
                      editAssignments,
                      index,
                      selectedTeacherSubjectOptions
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeEditAssignmentRow(index)}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100"
                    title="Remove row"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>

            {selectedTeacherSubjectOptions.length === 0 && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                No subjects found for this teacher's faculty and department.
              </p>
            )}

            <button
              type="button"
              onClick={addEditAssignmentRow}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <FiPlus />
              Add Assignment Row
            </button>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAssignmentsModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                disabled={savingAssignments}
              >
                Cancel
              </button>
              <button
                onClick={saveManagedAssignments}
                className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={savingAssignments}
              >
                {savingAssignments ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
