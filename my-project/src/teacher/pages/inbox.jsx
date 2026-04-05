import { useCallback, useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiInbox, FiRefreshCw, FiSearch, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  deleteNotificationForRole,
  fetchNotificationsForRole,
  getAudienceLabel,
  markNotificationRead,
} from "../../lib/notificationsWorkflow";

const readUserData = () => {
  try {
    const raw = localStorage.getItem("userData");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function TeacherAdminInbox() {
  const userData = useMemo(() => readUserData(), []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const loadMessages = useCallback(
    async (isManualRefresh = false) => {
      if (!userData?.id) {
        setLoading(false);
        return;
      }

      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const rows = await fetchNotificationsForRole("teacher", userData.id, { limit: 200 });
        setMessages(Array.isArray(rows) ? rows : []);
      } catch (error) {
        toast.error(error?.message || "Failed to load inbox.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userData?.id]
  );

  useEffect(() => {
    loadMessages(false);
  }, [loadMessages]);

  const filteredMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;

    return messages.filter((item) =>
      `${item.title} ${item.message} ${item.audience}`.toLowerCase().includes(q)
    );
  }, [messages, query]);

  const openMessage = async (item) => {
    setSelectedMessage(item);
    if (item.isRead || !userData?.id || !item.messageId) return;

    try {
      await markNotificationRead({
        messageId: item.messageId,
        role: "teacher",
        userId: userData.id,
      });
      setMessages((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, isRead: true, readAt: new Date().toISOString() } : row
        )
      );
      setSelectedMessage((prev) =>
        prev && prev.id === item.id ? { ...prev, isRead: true, readAt: new Date().toISOString() } : prev
      );
    } catch (error) {
      toast.error(error?.message || "Failed to mark notification as read.");
    }
  };

  const handleDelete = async (item, closeSelected = false) => {
    if (!item?.id || !userData?.id) return;

    try {
      setDeletingId(item.id);
      await deleteNotificationForRole({
        recipientRowId: item.id,
        role: "teacher",
        userId: userData.id,
      });

      setMessages((prev) => prev.filter((row) => row.id !== item.id));
      if (closeSelected) setSelectedMessage(null);
      toast.success("Message deleted.");
    } catch (error) {
      toast.error(error?.message || "Failed to delete message.");
    } finally {
      setDeletingId("");
    }
  };

  if (!userData?.id) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        User session missing. Please sign in again.
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            <p className="mt-1 text-sm text-gray-500">Notifications from admin.</p>
          </div>
          <button
            type="button"
            onClick={() => loadMessages(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            <FiRefreshCw />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-lg border border-gray-200 p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => {
              const input = document.querySelector('input[placeholder="Search messages..."]');
              if (input) input.focus();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            <FiSearch />
          </button>
        </div>
      </div>

      <div className="grid min-h-[500px] grid-cols-1 rounded-xl bg-white shadow md:grid-cols-3">
        <div className="space-y-2 border-r p-4">
          {loading && <p className="text-sm text-gray-500">Loading messages...</p>}
          {!loading &&
            filteredMessages.map((item) => (
              <div key={item.id} className="rounded-lg p-2 transition hover:bg-blue-50">
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => openMessage(item)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900">{item.title}</p>
                      {!item.isRead && <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />}
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-600">{item.message}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item, selectedMessage?.id === item.id)}
                    disabled={deletingId === item.id}
                    className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-60"
                    title="Delete message"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          {!loading && filteredMessages.length === 0 && (
            <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
              No messages found.
            </div>
          )}
        </div>

        <div className="p-6 md:col-span-2">
          {selectedMessage ? (
            <div>
              <button
                type="button"
                onClick={() => setSelectedMessage(null)}
                className="mb-4 inline-flex items-center gap-2 text-blue-600"
              >
                <FiArrowLeft />
                Back
              </button>

              <h2 className="text-xl font-bold text-gray-900">{selectedMessage.title}</h2>
              <p className="mt-1 text-sm text-gray-500">
                Audience: {getAudienceLabel(selectedMessage.audience)} |{" "}
                {selectedMessage.createdAt
                  ? new Date(selectedMessage.createdAt).toLocaleString()
                  : "-"}
              </p>
              <div className="mt-4 rounded-lg bg-gray-50 p-4 text-gray-700">
                {selectedMessage.message}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(selectedMessage, true)}
                disabled={deletingId === selectedMessage.id}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
              >
                <FiTrash2 />
                {deletingId === selectedMessage.id ? "Deleting..." : "Delete Message"}
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <span className="inline-flex items-center gap-2">
                <FiInbox />
                Select a message to view
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
