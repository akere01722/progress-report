import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiBookOpen, FiLayers, FiTrash2, FiUser } from "react-icons/fi";
import {
  TEACHERS_STORAGE_KEY,
  normalizeId,
  safeReadArray,
} from "../../lib/registrationData";
import {
  deleteNotificationForRole,
  fetchNotificationsForRole,
  getAudienceLabel,
} from "../../lib/notificationsWorkflow";
import { toast } from "react-toastify";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const DEMO_TEACHER = {
  id: "demo-teacher",
  name: "John Acha",
  email: "john.acha@school.edu",
  staffId: "TCH-26-001",
  faculty: "Engineering",
  department: "Software Engineering",
  program: "BSc",
  level: "Level 3",
  assignments: [
    { className: "BSc - Level 2", subject: "Data Structures" },
    { className: "BSc - Level 3", subject: "Operating Systems" },
    { className: "BSc - Level 3", subject: "Database Systems" },
    { className: "BSc - Level 4", subject: "Software Engineering" },
  ],
};

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const userData = useMemo(() => readUserData(), []);
  const [notifications, setNotifications] = useState([]);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      if (!userData?.id) {
        if (mounted) setNotifications([]);
        return;
      }

      try {
        const list = await fetchNotificationsForRole("teacher", userData.id, { limit: 5 });
        if (mounted) setNotifications(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setNotifications([]);
      }
    };

    const refresh = () => {
      void loadNotifications();
    };

    window.addEventListener("focus", refresh);
    void loadNotifications();

    return () => {
      mounted = false;
      window.removeEventListener("focus", refresh);
    };
  }, [userData?.id]);

  const handleDeleteNotification = async (item) => {
    if (!item?.id || !userData?.id) return;

    try {
      setDeletingId(item.id);
      await deleteNotificationForRole({
        recipientRowId: item.id,
        role: "teacher",
        userId: userData.id,
      });
      setNotifications((prev) => prev.filter((row) => row.id !== item.id));
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error?.message || "Failed to delete message.");
    } finally {
      setDeletingId("");
    }
  };

  const teacherView = useMemo(() => {
    const teachers = safeReadArray(TEACHERS_STORAGE_KEY, []);
    const targetStaffId = normalizeId(userData?.staffId);
    const targetEmail = normalizeId(userData?.email);
    const targetId = String(userData?.id ?? "");

    const matchedTeacher = teachers.find((item) => {
      const byId = targetId && String(item.id ?? "") === targetId;
      const byStaffId = targetStaffId && normalizeId(item.staffId) === targetStaffId;
      const byEmail = targetEmail && normalizeId(item.email) === targetEmail;
      return byId || byStaffId || byEmail;
    });

    if (matchedTeacher) return { teacher: matchedTeacher, isPreview: false };
    if (teachers.length > 0) return { teacher: teachers[0], isPreview: true };
    return { teacher: DEMO_TEACHER, isPreview: true };
  }, [userData]);

  const teacher = teacherView.teacher;
  const isPreview = teacherView.isPreview;

  const assignments = useMemo(
    () => (Array.isArray(teacher?.assignments) ? teacher.assignments : []),
    [teacher]
  );

  const groupedAssignments = useMemo(() => {
    const grouped = {};

    assignments.forEach((row) => {
      const className = String(row?.className || "").trim();
      const subject = String(row?.subject || "").trim();
      if (!className || !subject) return;

      if (!grouped[className]) grouped[className] = [];
      if (!grouped[className].includes(subject)) grouped[className].push(subject);
    });

    return Object.entries(grouped).map(([className, subjects]) => ({
      className,
      subjects,
    }));
  }, [assignments]);

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Teacher Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your details and assigned classes from admin.
        </p>
        {isPreview && (
          <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Preview data mode
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <FiUser />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{teacher.name}</p>
            <p className="text-sm text-gray-500">{teacher.email}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Staff ID</p>
            <p className="mt-1 font-semibold text-gray-900">{teacher.staffId}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Faculty</p>
            <p className="mt-1 font-semibold text-gray-900">{teacher.faculty}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Department</p>
            <p className="mt-1 font-semibold text-gray-900">{teacher.department}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Program / Level</p>
            <p className="mt-1 font-semibold text-gray-900">
              {teacher.program} {teacher.level ? `- ${teacher.level}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Admin Notifications</h2>
            <p className="mt-1 text-sm text-gray-500">
              Messages sent to teachers or everyone.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <FiBell />
            {notifications.length} latest
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <span className="mt-1 inline-flex rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {getAudienceLabel(item.audience)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteNotification(item)}
                  disabled={deletingId === item.id}
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-60"
                  title="Delete message"
                >
                  <FiTrash2 />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-700">{item.message}</p>
              <p className="mt-2 text-xs text-gray-500">
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
              </p>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No notifications from admin yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assigned Classes & Subjects</h2>
            <p className="mt-1 text-sm text-gray-500">
              Total assignments:{" "}
              <span className="font-semibold text-gray-900">{assignments.length}</span>
            </p>
          </div>
          <button
            onClick={() => navigate("/teacher/courses")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            <FiBookOpen />
            Open My Courses
          </button>
        </div>

        {groupedAssignments.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-600">
            No class or subject has been assigned yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {groupedAssignments.map((group) => (
              <div
                key={group.className}
                className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"
              >
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <FiLayers />
                  {group.className}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.subjects.map((subject) => (
                    <span
                      key={subject}
                      className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
