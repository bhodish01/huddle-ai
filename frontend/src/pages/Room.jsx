import { BACKEND_URL } from "../config";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export default function Room() {
  const { meetingId } = useParams();
  const navigate = useNavigate();

  const [cameraError, setCameraError] = useState("");
  const [peerConnected, setPeerConnected] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const [isCaptionsOn, setIsCaptionsOn] = useState(true);
  const [activeCaption, setActiveCaption] = useState("");
  const [transcript, setTranscript] = useState([]);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const isChatOpenRef = useRef(false);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef([]);

  // const iceCandidateQueue = useRef([]);

  const toggleChatDrawer = () => {
    setIsChatOpen((prev) => {
      const next = !prev;
      isChatOpenRef.current = next;
      if (next) setUnreadCount(0);
      return next;
    });
  };

  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatOpen]);

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const stopScreenShare = () => {
    if (!isScreenSharing) return;

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    const webcamVideoTrack = localStreamRef.current?.getVideoTracks()[0];

    if (peerConnectionRef.current && webcamVideoTrack) {
      const videoSender = peerConnectionRef.current
        .getSenders()
        .find((sender) => sender.track?.kind === "video");

      if (videoSender) {
        videoSender.replaceTrack(webcamVideoTrack);
      }
    }

    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    setIsScreenSharing(false);
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });

      screenStreamRef.current = screenStream;
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (peerConnectionRef.current) {
        const pc = peerConnectionRef.current;
        const videoSender = pc
          .getSenders()
          .find((sender) => sender.track?.kind === "video");

        if (videoSender) {
          await videoSender.replaceTrack(screenVideoTrack);
        } else {
          // If no video sender existed yet, add track directly
          pc.addTrack(screenVideoTrack, screenStream);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
        localVideoRef.current.play().catch(() => {});
      }

      setIsScreenSharing(true);

      screenVideoTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn("Screen share cancelled or failed:", err);
    }
  };

  const stopMediaTracks = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !socketRef.current) return;

    let currentUsername = localStorage.getItem("username");
    const storedUser = localStorage.getItem("user");

    if (!currentUsername && storedUser) {
      try {
        currentUsername = JSON.parse(storedUser).username;
      } catch {
        currentUsername = null;
      }
    }

    socketRef.current.emit("send-message", {
      meetingId,
      message: messageInput.trim(),
      senderName: "User-" + socketRef.current.id?.slice(0, 4),
    });

    setMessageInput("");
  };

  const handleEndAndSummarize = async () => {
    setIsSummarizing(true);
    stopMediaTracks();

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${BACKEND_URL}/api/meetings/${meetingId}/summarize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ transcript: transcriptRef.current }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        setSummaryData(data.meeting);
      } else {
        alert(data.message || "Failed to genrate meeting summary.");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Summarization call failed:", err);
      navigate("/dashboard");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSimpleLeave = () => {
    stopMediaTracks();
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    navigate("/dashboard");
  };

  const attachLocalTracks = (pc, stream) => {
    if (!pc || !stream) return;
    const senders = pc.getSenders();
    stream.getTracks().forEach((track) => {
      const alreadyAdded = senders.some((s) => s.track?.id === track.id);
      if (!alreadyAdded) {
        pc.addTrack(track, stream);
      }
    });
  };

  const createPeerConnection = (targetSocketId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Remote track recevied");
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteVideoRef.current.play().catch((err) => {
          console.warn(
            "Remote autoplay blocked, waiting for interaction:",
            err,
          );
        });
        setPeerConnected(true);
      }
    };

    if (localStreamRef.current) {
      attachLocalTracks(pc, localStreamRef.current);
    }

    return pc;
  };

  const handleLeaveMeeting = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    navigate("/dashboard");
  };

  useEffect(() => {
    let isMounted = true;

    // const socket = io("http://localhost:8080");
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    let myUsername = localStorage.getItem("username") || "Guest";

    if (SpeechRecognition) {
      const recognizer = new SpeechRecognition();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = "en-US";

      recognizer.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            const timestamp = new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const item = { speaker: myUsername, text: piece.trim(), timestamp };

            transcriptRef.current.push(item);
            setTranscript([...transcriptRef.current]);

            socket.emit("send-caption", {
              meetingId,
              speakerName: myUsername,
              text: piece.trim(),
              isFinal: true,
            });

            setActiveCaption(`${myUsername}: ${piece.trim()}`);
          } else {
            interimTranscript += piece;
            setActiveCaption(`${myUsername}: ${interimTranscript}`);
          }
        }
      };

      recognizer.onerror = (e) => {
        console.warn("Speech recognition error:", e.error);
      };

      recognizer.onend = () => {
        if (isMounted && recognitionRef.current) {
          try {
            recognizer.start();
          } catch {
            // Already started
          }
        }
      };

      try {
        recognizer.start();
        recognitionRef.current = recognizer;
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }

    const initializeMediaAndSignaling = async () => {
      let stream = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (videoErr) {
        console.warn(
          "Camera in use by other tab or denied. Falling back to audio-only:",
          videoErr,
        );
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsVideoOff(true);
        } catch (audioErr) {
          console.error("Microphone also unavailable:", audioErr);
          setCameraError("Could not access camera or microphone.");
        }
      }

      if (!isMounted) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current
            .play()
            .catch((e) => console.warn("Local play error:", e));
        }
        if (peerConnectionRef.current) {
          attachLocalTracks(peerConnectionRef.current, stream);
        }
      }

      socket.emit("join-room", {
        meetingId,
        userId: myUsername,
      });
    };

    initializeMediaAndSignaling();

    socket.on("user-connected", async ({ peerSocketId }) => {
      console.log("Peer joined, creating a offer for:", peerSocketId);

      const pc = createPeerConnection(peerSocketId);
      peerConnectionRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", {
        to: peerSocketId,
        offer,
      });
    });

    socket.on("offer", async ({ from, offer }) => {
      console.log("Recevied offer from:", from);

      const pc = createPeerConnection(from);
      peerConnectionRef.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answer", {
        to: from,
        answer,
      });
    });

    socket.on("answer", async (data) => {
      console.log("Received answer back");
      const answerPayload = data.answer || data;

      if (peerConnectionRef.current && answerPayload) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(answerPayload),
        );
      }
    });

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        const pc = peerConnectionRef.current;
        if (
          pc &&
          pc.remoteDescription &&
          pc.remoteDescription.type &&
          candidate
        ) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (e) {
        console.error("Error adding received ICE candidate:", e);
      }
    });

    socket.on("user-disconnected", () => {
      setPeerConnected(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    });

    socket.on("receive-caption", ({ speakerName, text, isFinal }) => {
      setActiveCaption(`${speakerName}: ${text}`);
      if (isFinal) {
        const timestamp = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const item = { speaker: speakerName, text, timestamp };
        transcriptRef.current.push(item);
        setTranscript([...transcriptRef.current]);
      }
    });

    const handleReceiveMessage = (incomingMsg) => {
      setMessages((prev) => [...prev, incomingMsg]);
      if (!isChatOpenRef.current) {
        setUnreadCount((count) => count + 1);
      }
    };

    socket.on("receive-message", handleReceiveMessage);

    // Clean up on leave
    return () => {
      isMounted = false;
      stopMediaTracks();
      socket.off("receive-message", handleReceiveMessage);

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [meetingId]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Main Video & Screen Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "20px",
          position: "relative",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
            Huddle AI — Room: {meetingId}
          </h2>
          <span
            style={{
              color: peerConnected ? "#4ade80" : "#facc15",
              fontWeight: "600",
              fontSize: "0.95rem",
            }}
          >
            {peerConnected ? "🟢 Connected" : "🟡 Waiting for peer..."}
          </span>
        </div>

        {cameraError && (
          <div
            style={{
              color: "#fca5a5",
              background: "#7f1d1d",
              padding: "8px 16px",
              borderRadius: "8px",
              margin: "10px 0",
            }}
          >
            {cameraError}
          </div>
        )}

        {/* Video Grid */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            overflowY: "auto",
            position: "relative",
          }}
        >
          {/* Local Feed */}
          <div
            style={{
              position: "relative",
              width: "440px",
              height: "290px",
              background: "#1e293b",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)",
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                transform: isScreenSharing ? "none" : "scaleX(-1)",
                display: isVideoOff && !isScreenSharing ? "none" : "block",
              }}
            />
            {isVideoOff && !isScreenSharing && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#94a3b8",
                }}
              >
                Camera Off
              </div>
            )}
            <span
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                background: "rgba(15,23,42,0.8)",
                color: "#f8fafc",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              {isScreenSharing
                ? "You (Sharing)"
                : `You ${isMuted ? "(Muted)" : ""}`}
            </span>
          </div>

          {/* Remote Feed */}
          <div
            style={{
              position: "relative",
              width: "440px",
              height: "290px",
              background: "#1e293b",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.3)",
            }}
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <span
              style={{
                position: "absolute",
                bottom: "10px",
                left: "10px",
                background: "rgba(15,23,42,0.8)",
                color: "#f8fafc",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              {peerConnected ? "Remote Peer" : "Waiting for participant..."}
            </span>
          </div>

          {/* Live Floating Captions Overlay */}
          {isCaptionsOn && activeCaption && (
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                background: "rgba(15, 23, 42, 0.9)",
                border: "1px solid #334155",
                color: "#38bdf8",
                padding: "10px 24px",
                borderRadius: "24px",
                fontSize: "1rem",
                fontWeight: "500",
                maxWidth: "75%",
                textAlign: "center",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
              }}
            >
              💬 {activeCaption}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "12px",
            padding: "16px 0",
            borderTop: "1px solid #334155",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={toggleAudio}
            style={{
              background: isMuted ? "#ef4444" : "#334155",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            {isMuted ? "🔇 Unmute" : "🎤 Mute"}
          </button>

          <button
            onClick={toggleVideo}
            disabled={isScreenSharing}
            style={{
              background: isVideoOff ? "#ef4444" : "#334155",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: isScreenSharing ? "not-allowed" : "pointer",
              opacity: isScreenSharing ? 0.5 : 1,
              fontWeight: "600",
            }}
          >
            {isVideoOff ? "📷 Start Cam" : "🚫 Stop Cam"}
          </button>

          <button
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            style={{
              background: isScreenSharing ? "#2563eb" : "#334155",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            {isScreenSharing ? "🛑 Stop Share" : "🖥️ Share Screen"}
          </button>

          {/* Toggle Live Captions */}
          <button
            onClick={() => setIsCaptionsOn(!isCaptionsOn)}
            style={{
              background: isCaptionsOn ? "#0284c7" : "#334155",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            {isCaptionsOn ? "📝 Captions: ON" : "📝 Captions: OFF"}
          </button>

          {/* Toggle Chat */}
          <button
            onClick={toggleChatDrawer}
            style={{
              background: isChatOpen ? "#2563eb" : "#334155",
              color: "white",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              position: "relative",
            }}
          >
            💬 Chat
            {unreadCount > 0 && !isChatOpen && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "#ef4444",
                  color: "white",
                  fontSize: "11px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "10px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* AI End & Summarize Button */}
          <button
            onClick={handleEndAndSummarize}
            disabled={isSummarizing}
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              color: "white",
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: isSummarizing ? "wait" : "pointer",
              fontWeight: "bold",
            }}
          >
            {isSummarizing
              ? "✨ Summarizing with Gemini..."
              : "✨ End & AI Summarize"}
          </button>

          <button
            onClick={handleSimpleLeave}
            style={{
              background: "#dc2626",
              color: "white",
              padding: "10px 18px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Leave
          </button>
        </div>
      </div>

      {/* Side Chat Drawer */}
      {isChatOpen && (
        <div
          style={{
            width: "340px",
            background: "#1e293b",
            borderLeft: "1px solid #334155",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <div
            style={{
              padding: "16px",
              borderBottom: "1px solid #334155",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>In-Call Messages</h3>
            <button
              onClick={toggleChatDrawer}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "1.2rem",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {messages.length === 0 ? (
              <p
                style={{
                  color: "#64748b",
                  textAlign: "center",
                  marginTop: "20px",
                  fontSize: "0.9rem",
                }}
              >
                No messages yet.
              </p>
            ) : (
              messages.map((msg, idx) => {
                const isMe = msg.senderId === socketRef.current?.id;
                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      background: isMe ? "#2563eb" : "#334155",
                      color: "#ffffff",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      fontSize: "0.9rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        opacity: 0.8,
                        marginBottom: "2px",
                      }}
                    >
                      {isMe ? "You" : msg.senderName} • {msg.timestamp}
                    </div>
                    <div style={{ wordBreak: "break-word" }}>{msg.message}</div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          <form
            onSubmit={handleSendMessage}
            style={{
              padding: "12px",
              borderTop: "1px solid #334155",
              display: "flex",
              gap: "8px",
            }}
          >
            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "#0f172a",
                color: "white",
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Post-Meeting AI Summary Modal */}
      {summaryData && (
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
              maxWidth: "680px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid #334155",
            }}
          >
            <h2
              style={{
                margin: "0 0 16px 0",
                color: "#a855f7",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              ✨ AI Meeting Summary
            </h2>

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
                {summaryData.summary || "No summary available."}
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 8px 0", color: "#94a3b8" }}>
                Action Items
              </h4>
              {summaryData.actionItems?.length > 0 ? (
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
                  {summaryData.actionItems.map((item, index) => (
                    <li
                      key={index}
                      style={{
                        background: "#0f172a",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        borderLeft: "4px solid #6366f1",
                        display: "flex",
                        justifyContent: "space-between",
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
                  No action items detected.
                </p>
              )}
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              style={{
                width: "100%",
                background: "#2563eb",
                color: "white",
                padding: "12px",
                borderRadius: "8px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
