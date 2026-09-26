import Meeting from "../models/meetingModel.js";
import crypto from "crypto";
import { generateMeetingSummary } from "../services/aiService.js";

export const createMeeting = async (req, res) => {
  try {
    const meetId = crypto.randomUUID().slice(0, 8);

    const hostId = req.user.id || req.user;

    const newMeeting = new Meeting({
      meetingId: meetId,
      hostId: hostId,
      participants: [hostId],
    });

    await newMeeting.save();

    return res.status(201).json({
      message: "Meeting created successfully",
      meetingId: meetId,
      meeting: newMeeting,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const joinMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;
    const userId = req.user.id || req.user;

    if (!meetingId)
      return res.status(400).json({ message: "Meeting ID required" });

    const meeting = await Meeting.findOne({ meetingId, status: "active" });

    if (!meeting)
      return res
        .status(404)
        .json({ message: "Meeting not found or has ended" });

    const isAlreadyParticipant = meeting.participants.some(
      (id) => id.toString() === userId.toString(),
    );

    if (!isAlreadyParticipant) {
      meeting.participants.push(userId);
      await meeting.save();
    }

    return res.status(200).json({
      message: "Joined the meeting",
      meetingId: meeting.meetingId,
      meeting,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const summarizeMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { transcript } = req.body;

    const meeting = await Meeting.findOne({ meetingId });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found." });
    }

    const { summary, actionItems } = await generateMeetingSummary(transcript);

    meeting.transcript = transcript || [];
    meeting.summary = summary;
    meeting.actionItems = actionItems;
    meeting.status = "ended";
    await meeting.save();

    return res.status(200).json({
      message: "Meeting summarized successfully",
      meeting,
      summary,
      actionItems,
    });
  } catch (error) {
    console.error("Summarize Controller Error:", error);
    res
      .status(500)
      .json({ message: error.message || "Server error while summarizing" });
  }
};

export const getMeetingHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find meetings where the user is either the host or in participants array
    const meetings = await Meeting.find({
      $or: [{ host: userId }, { participants: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("host", "username email");

    res.status(200).json({ meetings });
  } catch (error) {
    console.error("Error fetching user meetings:", error);
    res.status(500).json({ message: "Server error fetching meeting history." });
  }
};
