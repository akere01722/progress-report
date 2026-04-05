import { useCallback, useEffect, useMemo, useState } from "react";
import { FiBell, FiSend, FiTrash2, FiUsers } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  AUDIENCE_OPTIONS,
  deleteAdminNotification,
  fetchAdminNotifications,
  fetchAudienceCounts,
  getAudienceLabel,
  sendAdminNotification,
} from "../../lib/notificationsWorkflow";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function AdminInbox() {
  const userData = useMemo(() => readUserData(), []);
  const [audience, setAudience] = useState("teachers");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [teachersCount, setTeachersCount] = useState(0);
  const [studentsCount, setStudentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState("");

  const loadInboxData = useCallback(async () => {
    try {
      setLoading(true);
      const [counts, sent] = await Promise.all([
        fetchAudienceCounts(),
        fetchAdminNotifications({ limit: 200, adminId: userData?.id || "" }),
      ]);

      setTeachersCount(Number(counts?.teachers || 0));
      setStudentsCount(Number(counts?.students || 0));
      setNotifications(Array.isArray(sent) ? sent : []);
    } catch (error) {
      toast.error(error?.message || "Failed to load inbox data.");
    } finally {
      setLoading(false);
    }
  }, [userData?.id]);

  useEffect(() => {
    loadInboxData();
  }, [loadInboxData]);

  const targetCount = useMemo(() => {
    if (audience === "teachers") return teachersCount;
    if (audience === "students") return studentsCount;
    return teachersCount + studentsCount;
  }, [audience, studentsCount, teachersCount]);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter notification title and message.");
      return;
    }

    if (!userData?.id) {
      toast.error("Admin session missing. Please sign in again.");
      return;
    }

    try {
      setSending(true);

      const { error } = await sendAdminNotification({
        audience,
        title,
        message,
        senderId: userData.id,
      });

      if (error) throw error;

      setTitle("");
      setMessage("");
      await loadInboxData();
      toast.success("Notification sent successfully.");
    } catch (error) {
      toast.error(error?.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (item) => {
    if (!item?.id) return;
    if (!userData?.id) {
      toast.error("Admin session missing. Please sign in again.");
      return;
    }

    const confirmed = window.confirm("Delete this message for all recipients?");
    if (!confirmed) return;

    try {
      setDeletingMessageId(item.id);
      await deleteAdminNotification({
        messageId: item.id,
        adminId: userData.id,
      });
      setNotifications((prev) => prev.filter((row) => row.id !== item.id));
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error?.message || "Failed to delete message.");
    } finally {
      setDeletingMessageId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 p-6 text-white shadow-lg sm:p-7">
        <h1 className="text-2xl font-bold sm:text-3xl">Admin Inbox & Broadcast</h1>
        <p className="mt-1 text-sm text-blue-50 sm:text-base">
          Send notifications to teachers only, students only, or everyone.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">New Notification</h2>
          <p className="mt-1 text-sm text-gray-500">Audience targeted announcement.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AUDIENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <p className="text-xs font-semibold text-blue-700">Estimated Recipients</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{targetCount}</p>
              <p className="mt-1 text-xs text-blue-700">
                Teachers: {teachersCount} | Students: {studentsCount}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Semester registration deadline"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Write the full notification here..."
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <FiSend />
            {sending ? "Sending..." : "Send Notification"}
          </button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-xs text-blue-700">Total Notifications Sent</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">{notifications.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p className="inline-flex items-center gap-2 font-semibold">
                <FiUsers />
                Active Teachers: {teachersCount}
              </p>
              <p className="mt-1 inline-flex items-center gap-2 font-semibold">
                <FiUsers />
                Active Students: {studentsCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Sent Notifications</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">Audience</th>
                <th className="py-2 pr-3">Message</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-semibold text-gray-900">{item.title}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      <FiBell />
                      {getAudienceLabel(item.audience)}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-gray-700">{item.message}</td>
                  <td className="py-2 text-gray-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(item)}
                      disabled={deletingMessageId === item.id}
                      className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-60"
                      title="Delete message"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p className="pt-4 text-sm text-gray-500">Loading notifications...</p>}
          {!loading && notifications.length === 0 && (
            <p className="pt-4 text-sm text-gray-500">No notifications sent yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
