import { BACKEND_URL } from "../config";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [meetingIdInput, setMeetingIdInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const username = localStorage.getItem("username") || "Colleague";

  const fetchMeetingHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND_URL}/api/meetings/my-meetings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMeetings(data.meetings || []);
      }
    } catch (err) {
      console.warn("Could not fetch meetings:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Auth protection & initial fetch on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      fetchMeetingHistory();
    }
  }, [navigate]);

  const handleCreateMeeting = async () => {
    setLoading(true);
    setLoadingAction("create");
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/meetings/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        navigate(`/room/${data.meeting.meetingId}`);
      } else {
        setError(data.message || "Failed to create meeting.");
      }
    } catch (err) {
      console.error("Create meeting error:", err);
      setError("Error reaching the server.");
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  const handleJoinMeeting = async (e) => {
    e.preventDefault();
    setError("");

    if (!meetingIdInput.trim()) {
      setError("Please enter a valid Meeting ID");
      return;
    }

    setLoadingAction("join");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/meetings/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ meetingId: meetingIdInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to join meeting");
      }

      navigate(`/room/${data.meetingId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAction("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "sans-serif",
        padding: "30px 40px",
      }}
    >
      {/* Top Navbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #334155",
          paddingBottom: "20px",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", color: "#38bdf8" }}>
            Huddle AI
          </h1>
          <p
            style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.9rem" }}
          >
            Welcome back,{" "}
            <strong style={{ color: "#f8fafc" }}>{username}</strong>
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "#334155",
            color: "#f8fafc",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Logout
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#7f1d1d",
            color: "#fca5a5",
            padding: "10px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      {/* Main Grid: Launcher Panel & Meeting History */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.6fr",
          gap: "30px",
          alignItems: "start",
        }}
      >
        {/* Left Column: Quick Meeting Launchers */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Card 1: Start Instant Meeting */}
          <div
            style={{
              background: "#1e293b",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid #334155",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#f8fafc" }}>
              Start a Meeting
            </h3>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#94a3b8",
                fontSize: "0.9rem",
              }}
            >
              Generate a unique room ID and start hosting right away with AI
              summaries.
            </p>
            <button
              onClick={handleCreateMeeting}
              disabled={loadingAction === "create"}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)",
                color: "white",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "bold",
                cursor: loadingAction === "create" ? "wait" : "pointer",
                fontSize: "1rem",
              }}
            >
              {loadingAction === "create"
                ? "Creating..."
                : "✨ Start Instant Meeting"}
            </button>
          </div>

          {/* Card 2: Join with Code */}
          <div
            style={{
              background: "#1e293b",
              padding: "24px",
              borderRadius: "12px",
              border: "1px solid #334155",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#f8fafc" }}>
              Join a Meeting
            </h3>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#94a3b8",
                fontSize: "0.9rem",
              }}
            >
              Enter the code shared with you by the host.
            </p>
            <form
              onSubmit={handleJoinMeeting}
              style={{ display: "flex", gap: "10px" }}
            >
              <input
                type="text"
                placeholder="Enter Meeting ID (e.g. 05178d86)"
                value={meetingIdInput}
                onChange={(e) => setMeetingIdInput(e.target.value)}
                style={{
                  flex: 1,
                  background: "#0f172a",
                  border: "1px solid #475569",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  color: "white",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={loadingAction === "join"}
                style={{
                  background: "#334155",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontWeight: "600",
                  cursor: loadingAction === "join" ? "wait" : "pointer",
                }}
              >
                {loadingAction === "join" ? "Joining..." : "Join"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Meeting History & AI Summaries */}
        <div
          style={{
            background: "#1e293b",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #334155",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px 0",
              color: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Past Meetings & AI Summaries</span>
            <button
              onClick={fetchMeetingHistory}
              style={{
                background: "transparent",
                border: "none",
                color: "#38bdf8",
                cursor: "pointer",
                fontSize: "0.85rem",
              }}
            >
              🔄 Refresh
            </button>
          </h3>

          {historyLoading ? (
            <p
              style={{
                color: "#94a3b8",
                textAlign: "center",
                margin: "40px 0",
              }}
            >
              Loading meeting history...
            </p>
          ) : meetings.length === 0 ? (
            <p
              style={{
                color: "#64748b",
                textAlign: "center",
                margin: "40px 0",
              }}
            >
              No meetings found yet. Start one to generate your first AI
              summary!
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "65vh",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {meetings.map((m) => (
                <div
                  key={m._id}
                  style={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "10px",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: "600",
                        color: "#f8fafc",
                        marginBottom: "4px",
                      }}
                    >
                      Room:{" "}
                      <span style={{ color: "#38bdf8" }}>{m.meetingId}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                      {new Date(m.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      •{" "}
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {m.summary ? (
                      <button
                        onClick={() => setSelectedMeeting(m)}
                        style={{
                          background:
                            "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                          color: "white",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          cursor: "pointer",
                        }}
                      >
                        ✨ View AI Notes
                      </button>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "#64748b",
                          fontStyle: "italic",
                          marginRight: "6px",
                        }}
                      >
                        No summary
                      </span>
                    )}

                    <button
                      onClick={() => navigate(`/room/${m.meetingId}`)}
                      style={{
                        background: "#334155",
                        color: "#f8fafc",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      Rejoin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal for Selected Past Meeting Summary */}
      {selectedMeeting && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 50,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "16px",
              maxWidth: "650px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "26px",
              border: "1px solid #334155",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0, color: "#a855f7", fontSize: "1.3rem" }}>
                ✨ Meeting Summary ({selectedMeeting.meetingId})
              </h2>
              <button
                onClick={() => setSelectedMeeting(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#94a3b8" }}>
                Executive Overview
              </h4>
              <p
                style={{
                  lineHeight: "1.6",
                  color: "#f1f5f9",
                  background: "#0f172a",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                }}
              >
                {selectedMeeting.summary}
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#94a3b8" }}>
                Action Items
              </h4>
              {selectedMeeting.actionItems?.length > 0 ? (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {selectedMeeting.actionItems.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        background: "#0f172a",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        borderLeft: "4px solid #6366f1",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ color: "#f8fafc" }}>{item.task}</span>
                      <span
                        style={{
                          color: "#818cf8",
                          fontWeight: "600",
                          fontSize: "0.85rem",
                        }}
                      >
                        👤 {item.assignee}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#64748b", fontStyle: "italic" }}>
                  No action items assigned.
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedMeeting(null)}
              style={{
                width: "100%",
                background: "#2563eb",
                color: "white",
                padding: "10px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
