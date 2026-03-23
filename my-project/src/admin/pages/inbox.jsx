import { useState } from "react";
import {
  FiInbox,
  FiSend,
  FiEdit2,
  FiArrowLeft,
  FiUser,
} from "react-icons/fi";

export default function AdminInbox() {
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sentMessages, setSentMessages] = useState([]);

  /* MOCK DATA */
  const inboxMessages = [
    {
      id: 1,
      from: "John Doe (Teacher)",
      subject: "Request for Leave",
      body: "I need to take leave on 2026-01-25 due to personal reasons.",
      date: "2026-01-22",
    },
    {
      id: 2,
      from: "Jane Smith (Teacher)",
      subject: "Class Schedule Change",
      body: "Please adjust the schedule for CSC201 as per the new timetable.",
      date: "2026-01-18",
    },
  ];

  const handleSendReply = () => {
    if (!replyText.trim()) return alert("Please type a reply");
    const newMsg = {
      id: Date.now(),
      to: selectedMessage.from,
      subject: `Re: ${selectedMessage.subject}`,
      body: replyText,
      date: new Date().toISOString().slice(0, 10),
    };
    setSentMessages([newMsg, ...sentMessages]);
    setReplyText("");
    alert("Reply sent successfully!");
  };

  const handleSendMessage = () => {
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      return alert("Please fill in all fields");
    }
    const newMsg = {
      id: Date.now(),
      to: composeTo,
      subject: composeSubject,
      body: composeBody,
      date: new Date().toISOString().slice(0, 10),
    };
    setSentMessages([newMsg, ...sentMessages]);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setActiveTab("sent");
    alert("Message sent successfully!");
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">

      {/* PAGE HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Inbox
        </h1>
        <p className="text-sm text-gray-500">
          Admin ↔ Teacher Communication
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => {
            setActiveTab("inbox");
            setSelectedMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
            activeTab === "inbox"
              ? "bg-blue-600 text-white"
              : "bg-white shadow"
          }`}
        >
          <FiInbox /> Inbox
        </button>

        <button
          onClick={() => {
            setActiveTab("sent");
            setSelectedMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
            activeTab === "sent"
              ? "bg-blue-600 text-white"
              : "bg-white shadow"
          }`}
        >
          <FiSend /> Sent
        </button>

        <button
          onClick={() => {
            setActiveTab("compose");
            setSelectedMessage(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
            activeTab === "compose"
              ? "bg-blue-600 text-white"
              : "bg-white shadow"
          }`}
        >
          <FiEdit2 /> Compose
        </button>
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-xl shadow grid grid-cols-1 md:grid-cols-3 min-h-[500px]">

        {/* MESSAGE LIST */}
        {(activeTab === "inbox" || activeTab === "sent") && (
          <div className="border-r p-4 space-y-2">

            {(activeTab === "inbox"
              ? inboxMessages
              : sentMessages
            ).map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition"
              >
                <div className="flex justify-between">
                  <span className="font-semibold">
                    {activeTab === "inbox"
                      ? msg.from
                      : msg.to}
                  </span>
                  <span className="text-xs text-gray-400">
                    {msg.date}
                  </span>
                </div>

                <p className="text-sm text-gray-600 truncate">
                  {msg.subject}
                </p>
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

              <h2 className="text-xl font-bold">
                {selectedMessage.subject}
              </h2>

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
                  <h3 className="font-semibold mb-2">
                    Reply
                  </h3>

                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="border p-3 rounded-lg w-full mb-3"
                    rows="4"
                    placeholder="Type your reply..."
                  />

                  <button 
                    onClick={handleSendReply}
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

              <h2 className="text-xl font-bold mb-4">
                New Message
              </h2>

              <div className="space-y-4">

                <input
                  type="text"
                  placeholder="To (Teacher)"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="border p-3 rounded-lg w-full"
                />

                <input
                  type="text"
                  placeholder="Subject"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="border p-3 rounded-lg w-full"
                />

                <textarea
                  rows="6"
                  placeholder="Write message..."
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  className="border p-3 rounded-lg w-full"
                />

                <button 
                  onClick={handleSendMessage}
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
