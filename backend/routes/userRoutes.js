import { Router } from "express";
import { getProfile, login, register } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/profile").get(authMiddleware, getProfile);

export default router;
