import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createMeeting,
  getMeetingHistory,
  joinMeeting,
  summarizeMeeting,
} from "../controllers/meetingController.js";

const router = Router();

router.route("/create").post(authMiddleware, createMeeting);
router.route("/join").post(authMiddleware, joinMeeting);
router.route("/my-meetings", authMiddleware, getMeetingHistory);

router.route("/:meetingId/summarize", authMiddleware, summarizeMeeting);

export default router;
