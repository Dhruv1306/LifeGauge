import { Router } from "express";
import {
  getHabits,
  getCompletedHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabit,
  getHabitMatrix,
  reorderHabits,
  resumeHabit,
  updateTodaySchedule,
} from "../controllers/habitController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All habit routes require authentication
router.use(requireAuth);

router.get("/", getHabits);
router.get("/completed", getCompletedHabits);
router.post("/", createHabit);
router.put("/reorder", reorderHabits);
router.get("/matrix", getHabitMatrix);
router.patch("/:id", updateHabit);
router.post("/:id/resume", resumeHabit);
router.post("/:id/schedule-today", updateTodaySchedule);
router.delete("/:id", deleteHabit);
router.post("/:id/toggle", toggleHabit);

export default router;
