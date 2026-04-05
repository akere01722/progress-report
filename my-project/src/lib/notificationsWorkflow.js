import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const AUDIENCE_OPTIONS = [
  { value: "teachers", label: "Teachers Only" },
  { value: "students", label: "Students Only" },
  { value: "all", label: "Everyone" },
];

const normalizeAudience = (value) => {
  if (value === "teachers" || value === "students") return value;
  return "all";
};

const normalizeRecipientRole = (role) => {
  if (role === "teacher" || role === "student") return role;
  return "student";
};

const ensureBackend = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase is not configured.");
  }
};

const mapMessageRecord = (row) => ({
  id: String(row?.id || ""),
  adminId: row?.admin_id != null ? String(row.admin_id) : "",
  audience: normalizeAudience(row?.target_group),
  title: String(row?.title || "").trim(),
  message: String(row?.body || "").trim(),
  createdAt: row?.created_at || null,
});

const mapRecipientRecord = (row) => {
  const message = row?.messages || {};
  return {
    id: String(row?.id || ""),
    messageId: String(row?.message_id || message?.id || ""),
    audience: normalizeAudience(message?.target_group),
    title: String(message?.title || "").trim(),
    message: String(message?.body || "").trim(),
    createdAt: message?.created_at || row?.created_at || null,
    isRead: Boolean(row?.is_read),
    readAt: row?.read_at || null,
  };
};

export const fetchAudienceCounts = async () => {
  ensureBackend();

  const [
    { count: teachersCount, error: teacherError },
    { count: studentsCount, error: studentError },
  ] = await Promise.all([
    supabase.from("teachers").select("id", { head: true, count: "exact" }),
    supabase.from("students").select("id", { head: true, count: "exact" }),
  ]);

  if (teacherError) throw teacherError;
  if (studentError) throw studentError;

  return {
    teachers: Number(teachersCount || 0),
    students: Number(studentsCount || 0),
  };
};

export const fetchAdminNotifications = async ({ limit = 50, adminId = "" } = {}) => {
  ensureBackend();

  let query = supabase
    .from("messages")
    .select("id,admin_id,title,body,target_group,created_at")
    .order("created_at", { ascending: false });

  const normalizedAdminId = String(adminId || "").trim();
  if (normalizedAdminId) query = query.eq("admin_id", normalizedAdminId);
  if (Number.isFinite(limit) && limit > 0) query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapMessageRecord);
};

export const sendAdminNotification = ({
  audience,
  title,
  message,
  senderId,
}) => {
  ensureBackend();

  return supabase.rpc("send_admin_message", {
    p_admin_id: senderId,
    p_title: String(title || "").trim(),
    p_body: String(message || "").trim(),
    p_target_group: normalizeAudience(audience),
  });
};

export const getAudienceLabel = (audience) => {
  if (audience === "teachers") return "Teachers";
  if (audience === "students") return "Students";
  return "Everyone";
};

export const fetchNotificationsForRole = async (
  role,
  userId,
  { limit = 6, onlyUnread = false } = {}
) => {
  ensureBackend();

  const normalizedRole = normalizeRecipientRole(String(role || "").toLowerCase());
  const normalizedRecipientId = String(userId ?? "");

  let query = supabase
    .from("message_recipients")
    .select(
      `id,message_id,is_read,read_at,created_at,messages!inner(id,title,body,target_group,created_at)`
    )
    .eq("recipient_role", normalizedRole)
    .eq("recipient_id", normalizedRecipientId)
    .order("created_at", { ascending: false });

  if (onlyUnread) query = query.eq("is_read", false);
  if (Number.isFinite(limit) && limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapRecipientRecord);
};

export const markNotificationRead = async ({ messageId, role, userId }) => {
  ensureBackend();
  const normalizedRole = normalizeRecipientRole(String(role || "").toLowerCase());
  const normalizedRecipientId = String(userId ?? "");

  const { error } = await supabase.rpc("mark_message_read", {
    p_message_id: messageId,
    p_recipient_role: normalizedRole,
    p_recipient_id: normalizedRecipientId,
  });

  if (error) throw error;
};

export const deleteNotificationForRole = async ({ recipientRowId, role, userId }) => {
  ensureBackend();
  const normalizedRole = normalizeRecipientRole(String(role || "").toLowerCase());
  const normalizedRecipientId = String(userId ?? "");

  const { error } = await supabase
    .from("message_recipients")
    .delete()
    .eq("id", recipientRowId)
    .eq("recipient_role", normalizedRole)
    .eq("recipient_id", normalizedRecipientId);

  if (error) throw error;
};

export const deleteAdminNotification = async ({ messageId, adminId = "" }) => {
  ensureBackend();

  let query = supabase.from("messages").delete().eq("id", messageId);

  const normalizedAdminId = String(adminId || "").trim();
  if (normalizedAdminId) {
    query = query.eq("admin_id", normalizedAdminId);
  }

  const { error } = await query;
  if (error) throw error;
};
