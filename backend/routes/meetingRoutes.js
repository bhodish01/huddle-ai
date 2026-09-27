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
router.route("/my-meetings").get(authMiddleware, getMeetingHistory);

router.route("/:meetingId/summarize").post(authMiddleware, summarizeMeeting);

export default router;
