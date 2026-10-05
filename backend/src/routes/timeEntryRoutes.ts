import { Router } from "express";
import {
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeSummary,
} from "../controllers/timeEntryController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All time entry routes require authentication
router.use(requireAuth);

router.get("/", getTimeEntries);
router.post("/", createTimeEntry);
router.get("/summary", getTimeSummary);
router.patch("/:id", updateTimeEntry);
router.delete("/:id", deleteTimeEntry);

export default router;
