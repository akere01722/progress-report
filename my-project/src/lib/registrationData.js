export const STUDENTS_STORAGE_KEY = "admin_students";
export const TEACHERS_STORAGE_KEY = "admin_teachers";
export const SYSTEM_PASSWORD_STORAGE_KEY = "system_login_password";
export const DEFAULT_SYSTEM_PASSWORD = "Progress@123";

export const FACULTY_DEPARTMENTS = {
  Engineering: ["Software Engineering", "Civil Engineering", "Electrical Engineering"],
  "Biomedical Sciences": ["Nursing", "Laboratory Science", "Midwifery"],
  Business: ["Accounting", "Marketing", "Human Resource"],
};

export const PROGRAMS = ["HND", "BSc", "Masters I", "Masters II"];

export const safeReadArray = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

export const writeArray = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const getMaxSuffix = (records, field) =>
  records.reduce((max, record) => {
    const value = String(record?.[field] ?? "");
    const match = value.match(/(\d+)$/);
    if (!match) return max;
    const n = Number(match[1]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);

const normalizePrefix = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const getYearSuffix = () => String(new Date().getFullYear()).slice(-2);

export const generateStudentMatricule = (students, departmentCode = "STU") => {
  const prefix = normalizePrefix(departmentCode) || "STU";
  const yearSuffix = getYearSuffix();
  const pattern = new RegExp(`^${prefix}/${yearSuffix}/(\\d+)$`, "i");

  const next = students.reduce((max, student) => {
    const value = String(student?.matricule || "").trim();
    const match = value.match(pattern);
    if (!match) return max;
    const n = Number(match[1]);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0) + 1;

  return `${prefix}/${yearSuffix}/${String(next).padStart(4, "0")}`;
};

export const generateTeacherStaffId = (teachers) => {
  const next = getMaxSuffix(teachers, "staffId") + 1;
  return `TCH-${getYearSuffix()}-${String(next).padStart(3, "0")}`;
};

export const normalizeId = (value) => String(value ?? "").trim().toLowerCase();

export const getSystemPassword = () => {
  const stored = localStorage.getItem(SYSTEM_PASSWORD_STORAGE_KEY);
  if (!stored) return DEFAULT_SYSTEM_PASSWORD;
  return String(stored);
};
