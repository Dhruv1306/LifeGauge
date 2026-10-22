import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../types";
import {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectCalendar,
  syncCalendarEvents,
  getEventsByRange,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "../services/calendar/calendarService";
import { config } from "../config";

// ---------------------------------------------------------------------------
// OAuth Flow
// ---------------------------------------------------------------------------

/** GET /api/calendar/google/auth-url
 * Returns the Google OAuth consent URL for the authenticated user.
 */
export async function getGoogleAuthUrl(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  try {
    const url = getAuthUrl(req.user.id);
    res.status(200).json({ success: true, authUrl: url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate auth URL.";
    res.status(503).json({
      success: false,
      error: {
        code: "GOOGLE_CREDENTIALS_MISSING",
        message,
      },
    });
  }
}

/** GET /api/calendar/google/callback
 * OAuth2 callback handler — exchanges code for tokens and redirects to the frontend.
 * Note: This route is NOT authenticated via JWT (Google calls it directly after consent).
 */
export async function handleGoogleCallback(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    // User denied consent
    res.redirect(`${config.corsOrigin}/time?tab=calendar&oauth=denied`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${config.corsOrigin}/time?tab=calendar&oauth=error&reason=missing_params`);
    return;
  }

  try {
    await handleOAuthCallback(code, state);
    res.redirect(`${config.corsOrigin}/time?tab=calendar&oauth=success`);
  } catch (err: unknown) {
    const reason = err instanceof Error ? encodeURIComponent(err.message) : "unknown";
    res.redirect(`${config.corsOrigin}/time?tab=calendar&oauth=error&reason=${reason}`);
  }
}

/** GET /api/calendar/google/status
 * Returns connection status for the authenticated user.
 */
export async function getCalendarStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  try {
    const status = await getConnectionStatus(req.user.id);
    res.status(200).json({ success: true, ...status });
  } catch (err) {
    console.error("[calendarController] getCalendarStatus error:", err);
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to check calendar status." } });
  }
}

/** POST /api/calendar/google/disconnect
 * Revokes Google token and clears all cached calendar data.
 */
export async function disconnectGoogle(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  try {
    await disconnectCalendar(req.user.id);
    res.status(200).json({ success: true, message: "Google Calendar disconnected and all cached events removed." });
  } catch (err) {
    console.error("[calendarController] disconnectGoogle error:", err);
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to disconnect calendar." } });
  }
}

// ---------------------------------------------------------------------------
// Sync
// ---------------------------------------------------------------------------

const syncSchema = z.object({
  force: z.boolean().optional().default(false),
});

/** POST /api/calendar/sync
 * Triggers an incremental sync (or full re-sync on 410). Respects 30s debounce unless forced.
 */
export async function triggerSync(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  const parsed = syncSchema.safeParse(req.body);
  const force = parsed.success ? parsed.data.force : false;

  try {
    const result = await syncCalendarEvents(req.user.id, force);
    res.status(200).json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    if (message.includes("not connected")) {
      res.status(409).json({ success: false, error: { code: "CALENDAR_NOT_CONNECTED", message: "Google Calendar is not connected." } });
    } else {
      console.error("[calendarController] triggerSync error:", err);
      res.status(500).json({ success: false, error: { code: "SYNC_FAILED", message: "Calendar sync failed. Please try again." } });
    }
  }
}

// ---------------------------------------------------------------------------
// Events — Query from cache
// ---------------------------------------------------------------------------

const eventsQuerySchema = z.object({
  start: z.string().datetime({ message: "start must be an ISO 8601 datetime" }),
  end: z.string().datetime({ message: "end must be an ISO 8601 datetime" }),
});

/** GET /api/calendar/events?start=ISO&end=ISO
 * Returns cached calendar events for the given date range.
 * Also triggers an incremental background sync (debounced to 30s).
 */
export async function listEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  const parsed = eventsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid date range." },
    });
    return;
  }

  try {
    // Trigger a background incremental sync (debounced — won't re-sync if <30s ago)
    syncCalendarEvents(req.user.id, false).catch((err) =>
      console.warn("[calendarController] Background sync warning:", err?.message)
    );

    const events = await getEventsByRange(req.user.id, parsed.data.start, parsed.data.end);
    res.status(200).json({ success: true, count: events.length, events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load events.";
    if (message.includes("not connected")) {
      res.status(409).json({ success: false, error: { code: "CALENDAR_NOT_CONNECTED", message: "Google Calendar is not connected." } });
    } else {
      console.error("[calendarController] listEvents error:", err);
      res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Failed to load calendar events." } });
    }
  }
}

// ---------------------------------------------------------------------------
// Event CRUD
// ---------------------------------------------------------------------------

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").trim(),
  description: z.string().optional(),
  location: z.string().optional(),
  isAllDay: z.boolean(),
  // Timed event fields
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  // All-day event fields
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD").optional(),
}).refine((d) => {
  if (d.isAllDay) return !!d.startDate;
  return !!d.startTime && !!d.endTime;
}, { message: "Timed events require startTime and endTime. All-day events require startDate." });

const updateEventSchema = z.object({
  title: z.string().min(1).trim().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  isAllDay: z.boolean().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** POST /api/calendar/events — Create a new event */
export async function createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid event data." },
    });
    return;
  }

  try {
    const event = await createCalendarEvent(req.user.id, parsed.data);
    res.status(201).json({ success: true, event });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create event.";
    console.error("[calendarController] createEvent error:", err);
    res.status(500).json({ success: false, error: { code: "GOOGLE_API_ERROR", message } });
  }
}

/** PATCH /api/calendar/events/:id — Update an existing event */
export async function updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  const eventId = req.params.id;
  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message ?? "Invalid event data." },
    });
    return;
  }

  try {
    const event = await updateCalendarEvent(req.user.id, eventId, parsed.data);
    res.status(200).json({ success: true, event });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update event.";
    if (message.includes("not found")) {
      res.status(404).json({ success: false, error: { code: "EVENT_NOT_FOUND", message: "Calendar event not found." } });
    } else {
      console.error("[calendarController] updateEvent error:", err);
      res.status(500).json({ success: false, error: { code: "GOOGLE_API_ERROR", message } });
    }
  }
}

/** DELETE /api/calendar/events/:id — Delete an event */
export async function deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ success: false, error: { code: "AUTH_TOKEN_REQUIRED", message: "Authentication required." } });
    return;
  }

  const eventId = req.params.id;

  try {
    await deleteCalendarEvent(req.user.id, eventId);
    res.status(200).json({ success: true, message: "Event deleted." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete event.";
    if (message.includes("not found")) {
      res.status(404).json({ success: false, error: { code: "EVENT_NOT_FOUND", message: "Calendar event not found." } });
    } else {
      console.error("[calendarController] deleteEvent error:", err);
      res.status(500).json({ success: false, error: { code: "GOOGLE_API_ERROR", message } });
    }
  }
}
