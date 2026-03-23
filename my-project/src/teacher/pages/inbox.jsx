import React, { useMemo, useState } from "react";
import {
  FiInbox,
  FiSend,
  FiEdit2,
  FiArrowLeft,
  FiSearch,
} from "react-icons/fi";

// eslint-disable-next-line no-unused-vars
const TabButton = ({ icon: Icon, label, value, active, onClick }) => {
  return (
    <button
      onClick={() => onClick(value)}
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
      }`}
    >
      <Icon /> {label}
    </button>
  );
};

export default function TeacherAdminInbox() {
  const [activeTab, setActiveTab] = useState("inbox"); // inbox | sent | compose
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [query, setQuery] = useState("");

  // compose fields
  const [to, setTo] = useState("Admin Office");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  /* MOCK DATA */
  const [inboxMessages] = useState([
    {
      id: 1,
      type: "inbox",
      from: "Admin Office",
      subject: "Submit CA Marks",
      body: "Please upload CA marks for CSC201 before Friday.",
      date: "2026-01-22",
      unread: true,
    },
    {
      id: 2,
      type: "inbox",
      from: "Admin Office",
      subject: "Exam Schedule",
      body: "Exam timetable has been released for Semester 1.",
      date: "2026-01-18",
      unread: false,
    },
  ]);

  // ✅ Sent tab is for viewing messages you sent OR replies you sent
  const [sentMessages, setSentMessages] = useState([
    {
      id: 3,
      type: "sent",
      to: "Admin Office",
      subject: "CA Uploaded",
      body: "CSC201 CA marks have been uploaded successfully.",
      date: "2026-01-20",
    },
  ]);

  const list = useMemo(() => {
    const source = activeTab === "sent" ? sentMessages : inboxMessages;
    const q = query.trim().toLowerCase();
    if (!q) return source;

    return source.filter((m) => {
      const who = activeTab === "sent" ? m.to : m.from;
      return (
        who.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q)
      );
    });
  }, [activeTab, inboxMessages, sentMessages, query]);

  const resetView = (tab) => {
    setActiveTab(tab);
    setSelectedMessage(null);
    setQuery("");
  };

  const openMessage = (msg) => setSelectedMessage(msg);

  const sendNewMessage = () => {
    if (!subject.trim() || !body.trim()) return alert("Please add subject and message.");
    const newMsg = {
      id: Date.now(),
      type: "sent",
      to: to || "Admin Office",
      subject: subject.trim(),
      body: body.trim(),
      date: new Date().toISOString().slice(0, 10),
    };
    setSentMessages((prev) => [newMsg, ...prev]);
    setSubject("");
    setBody("");
    resetView("sent");
    setSelectedMessage(newMsg);
  };

  const sendReply = () => {
    if (!selectedMessage || activeTab !== "inbox") return;
    if (!body.trim()) return alert("Type your reply first.");
    const replyMsg = {
      id: Date.now(),
      type: "sent",
      to: selectedMessage.from || "Admin Office",
      subject: `Re: ${selectedMessage.subject}`,
      body: body.trim(),
      date: new Date().toISOString().slice(0, 10),
      replyToId: selectedMessage.id,
    };
    setSentMessages((prev) => [replyMsg, ...prev]);
    setBody("");
    resetView("sent");
    setSelectedMessage(replyMsg);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-sm text-gray-500">Teacher ↔ Admin Communication</p>
      </div>

      {/* SEARCH */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border p-3 rounded-lg"
          />
          <button 
            onClick={() => {
              // Search is already reactive via query state, this provides visual feedback
              const searchInput = document.querySelector('input[placeholder="Search messages..."]');
              if (searchInput) searchInput.focus();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            <FiSearch />
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <TabButton icon={FiInbox} label="Inbox" value="inbox" active={activeTab === "inbox"} onClick={resetView} />
        <TabButton icon={FiSend} label="Sent" value="sent" active={activeTab === "sent"} onClick={resetView} />
        <TabButton icon={FiEdit2} label="Compose" value="compose" active={activeTab === "compose"} onClick={resetView} />
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-xl shadow grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
        {/* MESSAGE LIST */}
        {(activeTab === "inbox" || activeTab === "sent") && (
          <div className="border-r p-4 space-y-2">
            {list.map((msg) => (
              <button
                key={msg.id}
                onClick={() => openMessage(msg)}
                className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {activeTab === "sent" ? msg.to : msg.from}
                  </span>
                  <span className="text-xs text-gray-400">{msg.date}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{msg.subject}</p>
                {msg.unread && activeTab === "inbox" && (
                  <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-2"></span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* MESSAGE VIEW / COMPOSE */}
        <div className="md:col-span-2 p-6">
          {/* MESSAGE VIEW */}
          {selectedMessage && activeTab !== "compose" && (
            <div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="flex items-center gap-2 text-blue-600 mb-4"
              >
                <FiArrowLeft />
                Back
              </button>
              <h2 className="text-xl font-bold">{selectedMessage.subject}</h2>
              <p className="text-sm text-gray-500 mb-2">
                {activeTab === "inbox"
                  ? `From: ${selectedMessage.from}`
                  : `To: ${selectedMessage.to}`}{" "}
                • {selectedMessage.date}
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                {selectedMessage.body}
              </div>
              {/* REPLY */}
              {activeTab === "inbox" && (
                <div>
                  <h3 className="font-semibold mb-2">Reply</h3>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="border p-3 rounded-lg w-full mb-3"
                    rows="4"
                    placeholder="Type your reply..."
                  />
                  <button
                    onClick={sendReply}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold"
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          )}

          {/* COMPOSE */}
          {activeTab === "compose" && (
            <div>
              <h2 className="text-xl font-bold mb-4">New Message</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="To"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border p-3 rounded-lg w-full"
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="border p-3 rounded-lg w-full"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows="6"
                  placeholder="Write message..."
                  className="border p-3 rounded-lg w-full"
                />
                <button
                  onClick={sendNewMessage}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  <FiSend />
                  Send Message
                </button>
              </div>
            </div>
          )}

          {!selectedMessage && activeTab !== "compose" && (
            <div className="text-gray-400 flex items-center justify-center h-full">
              Select a message to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
