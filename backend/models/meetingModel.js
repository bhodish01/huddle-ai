import mongoose from "mongoose";

const meetingSchema = mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
      unique: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "Instant meeting",
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
    transcript: [
      {
        speaker: {
          type: String,
          default: "Speaker",
        },
        text: {
          type: String,
          default: "",
        },
        timestamp: {
          type: String,
          default: () =>
            new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
        },
      },
    ],
    summary: {
      type: String,
      default: "",
    },

    actionItems: [
      {
        task: {
          type: String,
          required: true,
        },
        assignee: {
          type: String,
          default: "Unassigned",
        },
      },
    ],
  },
  { timestamps: true },
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;
