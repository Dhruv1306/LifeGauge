import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getGoogleAuthUrl,
  handleGoogleCallback,
  getCalendarStatus,
  disconnectGoogle,
  triggerSync,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/calendarController";

const router = Router();

// OAuth flow — callback is NOT behind requireAuth (Google calls it directly)
router.get("/google/auth-url", requireAuth, getGoogleAuthUrl);
router.get("/google/callback", handleGoogleCallback);
router.get("/google/status", requireAuth, getCalendarStatus);
router.post("/google/disconnect", requireAuth, disconnectGoogle);

// Sync
router.post("/sync", requireAuth, triggerSync);

// Events CRUD
router.get("/events", requireAuth, listEvents);
router.post("/events", requireAuth, createEvent);
router.patch("/events/:id", requireAuth, updateEvent);
router.delete("/events/:id", requireAuth, deleteEvent);

export default router;
