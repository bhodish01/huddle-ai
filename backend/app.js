import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import userRoutes from "./routes/userRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/auth", userRoutes);
app.use("/api/meetings", meetingRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join-room", ({ meetingId, userId }) => {
    socket.meetingId = meetingId;
    socket.join(meetingId);
    console.log(`User ${userId || socket.id} joined room: ${meetingId}`);

    socket.to(meetingId).emit("user-connected", {
      peerSocketId: socket.id,
      userId,
    });
  });

  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", {
      from: socket.id,
      offer,
    });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", {
      from: socket.id,
      answer,
    });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  socket.on("send-message", ({ meetingId, message, senderName }) => {
    io.to(meetingId).emit("receive-message", {
      senderId: socket.id,
      senderName: senderName || "Guest",
      message,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  });

  socket.on("send-caption", ({ meetingId, speakerName, text, isFinal }) => {
    socket.to(meetingId).emit("receive-caption", {
      speakerName,
      text,
      isFinal,
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    if (socket.meetingId) {
      socket.to(socket.meetingId).emit("user-disconnected", {
        peerSocketId: socket.id,
      });
    }
  });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MOngoDB connected successfully");

    server.listen(PORT, () => {
      console.log(`App and Socket server listening on port ${PORT} `);
    });
  } catch (error) {
    console.error("MongoDB connection failed");
    console.error(error.message);
  }
};

start();
