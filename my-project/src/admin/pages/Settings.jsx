import { useState } from "react";
import { FiLogOut } from "react-icons/fi";

export default function Settings() {
  // Keep only typical, necessary settings
  const [settings, setSettings] = useState({
    theme: "light", // light | dark
    language: "English", // English | French
    notifications: true, // on/off
  });

  const update = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const logout = () => {
    alert("Logged out successfully");
  };

  return (
    <div className="w-full max-w-3xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">
            Manage your basic preferences.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-red-700 transition"
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </div>

      {/* Settings Card */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-5">
        {/* Theme */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800">Theme</p>
            <p className="text-sm text-gray-500">Choose light or dark mode.</p>
          </div>

          <select
            className="border border-gray-200 rounded-xl p-2"
            value={settings.theme}
            onChange={(e) => update("theme", e.target.value)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <hr />

        {/* Language */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800">Language</p>
            <p className="text-sm text-gray-500">Select your preferred language.</p>
          </div>

          <select
            className="border border-gray-200 rounded-xl p-2"
            value={settings.language}
            onChange={(e) => update("language", e.target.value)}
          >
            <option>English</option>
            <option>French</option>
          </select>
        </div>

        <hr />

        {/* Notifications */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800">Notifications</p>
            <p className="text-sm text-gray-500">Turn system alerts on or off.</p>
          </div>

          <input
            type="checkbox"
            className="h-5 w-5"
            checked={settings.notifications}
            onChange={() => update("notifications", !settings.notifications)}
          />
        </div>
      </div>
    </div>
  );
}
