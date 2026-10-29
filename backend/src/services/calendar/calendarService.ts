/**
 * calendarService.ts
 *
 * Core service for Google Calendar OAuth2, bidirectional event sync,
 * encrypted token storage, and incremental sync with full recovery.
 *
 * ISOLATION GUARANTEE:
 * This service only reads/writes GoogleCalendarToken and CalendarEvent tables.
 * It never touches TimeEntry, and the analytics engine never reads CalendarEvent.
 */

import crypto from "crypto";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../../lib/prisma";
import { config } from "../../config";

// ---------------------------------------------------------------------------
// AES-256-GCM encryption helpers for refresh token storage
// ---------------------------------------------------------------------------

const ALGORITHM = "aes-256-gcm";
const KEY_BUFFER = Buffer.from(config.calendarEncryptionKey, "hex"); // 32 bytes

function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 16-byte GCM authentication tag
  // Format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptToken(encoded: string): string {
  const [ivHex, authTagHex, ciphertextHex] = encoded.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted token format.");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

// ---------------------------------------------------------------------------
// OAuth2 client factory
// ---------------------------------------------------------------------------

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri,
  );
}

/**
 * Builds the Google OAuth consent URL.
 * State parameter contains a signed value to prevent CSRF.
 */
export function getAuthUrl(userId: string): string {
  if (!config.googleClientId || !config.googleClientSecret) {
    throw new Error(
      "Google Calendar credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.",
    );
  }
  const oauth2Client = createOAuth2Client();
  // CSRF state: sign userId with JWT secret so it can be verified on callback
  const statePayload = Buffer.from(
    JSON.stringify({ userId, ts: Date.now() }),
  ).toString("base64url");
  const stateSignature = crypto
    .createHmac("sha256", config.jwtSecret)
    .update(statePayload)
    .digest("hex");
  const state = `${statePayload}.${stateSignature}`;

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Always return refresh_token
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "openid",
      "email",
      "profile",
    ],
    state,
  });
}

/**
 * Validates the OAuth state parameter to prevent CSRF attacks.
 * Returns the userId embedded in the state.
 */
export function validateOAuthState(state: string): string {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Invalid OAuth state format.");

  const expectedSig = crypto
    .createHmac("sha256", config.jwtSecret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSig, "hex"),
    )
  ) {
    throw new Error("OAuth state signature mismatch. Possible CSRF attack.");
  }

  const { userId, ts } = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  );

  // State expires in 10 minutes
  if (Date.now() - ts > 10 * 60 * 1000) {
    throw new Error(
      "OAuth state has expired. Please start the connection flow again.",
    );
  }

  return userId;
}

/**
 * Exchanges authorization code for tokens and stores them encrypted.
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
): Promise<string> {
  const userId = validateOAuthState(state);
  const oauth2Client = createOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Please disconnect and reconnect to grant offline access.",
    );
  }

  // Get the user's email for the UI status badge when Google returns profile access.
  // Calendar connection should not fail if this optional profile lookup is unavailable.
  let googleEmail: string | null = null;
  oauth2Client.setCredentials(tokens);
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: googleUser } = await oauth2.userinfo.get();
    googleEmail = googleUser.email ?? null;
  } catch (error) {
    console.warn(
      "[calendarService] Google profile lookup skipped:",
      error instanceof Error ? error.message : error,
    );
  }

  const encryptedRefreshToken = encryptToken(tokens.refresh_token);

  await prisma.googleCalendarToken.upsert({
    where: { userId },
    create: {
      userId,
      encryptedRefreshToken,
      googleEmail,
      syncToken: null, // Triggers full sync on first fetch
    },
    update: {
      encryptedRefreshToken,
      googleEmail,
      syncToken: null, // Reset sync state on reconnect
      lastSyncedAt: null,
    },
  });

  return userId;
}

/**
 * Returns an authenticated OAuth2 client for the given user.
 * Handles automatic token refresh.
 */
async function getAuthClientForUser(userId: string): Promise<OAuth2Client> {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });
  if (!tokenRecord) throw new Error("Google Calendar not connected.");

  const refreshToken = decryptToken(tokenRecord.encryptedRefreshToken);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * Checks if the user has a valid Google Calendar connection.
 */
export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  googleEmail?: string | null;
  lastSyncedAt?: Date | null;
}> {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
    select: { googleEmail: true, lastSyncedAt: true },
  });
  return {
    connected: !!tokenRecord,
    googleEmail: tokenRecord?.googleEmail,
    lastSyncedAt: tokenRecord?.lastSyncedAt,
  };
}

/**
 * Revokes the Google token and deletes all cached data for the user.
 */
export async function disconnectCalendar(userId: string): Promise<void> {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });
  if (!tokenRecord) return; // Already disconnected

  try {
    const refreshToken = decryptToken(tokenRecord.encryptedRefreshToken);
    const oauth2Client = createOAuth2Client();
    await oauth2Client.revokeToken(refreshToken);
  } catch {
    // Best-effort revocation — still delete local data even if Google revocation fails
    console.warn(
      "[calendarService] Failed to revoke Google token on disconnect — local data will still be cleared.",
    );
  }

  // Delete token record (cascades are not set here — delete events separately)
  await prisma.googleCalendarToken.delete({ where: { userId } });
  await prisma.calendarEvent.deleteMany({ where: { userId } });
}

// ---------------------------------------------------------------------------
// Event Sync — Incremental with full-sync fallback
// ---------------------------------------------------------------------------

interface GoogleEventItem {
  id?: string | null;
  status?: string | null;
  summary?: string | null;
  description?: string | null;
  location?: string | null;
  start?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  } | null;
  end?: {
    dateTime?: string | null;
    date?: string | null;
    timeZone?: string | null;
  } | null;
  recurringEventId?: string | null;
  recurrence?: string[] | null;
  etag?: string | null;
  updated?: string | null;
}

/**
 * Performs an incremental sync (or full sync if no syncToken or 410 Gone).
 * Respects lastSyncedAt to avoid redundant syncs on rapid view switches.
 *
 * @param userId - The LifeGauge user to sync for
 * @param force  - Skip the "recently synced" debounce (e.g. user clicked "Sync Now")
 */
export async function syncCalendarEvents(
  userId: string,
  force = false,
): Promise<{ synced: number; deleted: number }> {
  const tokenRecord = await prisma.googleCalendarToken.findUnique({
    where: { userId },
  });
  if (!tokenRecord) throw new Error("Google Calendar not connected.");

  // Debounce: skip if synced within the last 30 seconds (unless forced)
  if (!force && tokenRecord.lastSyncedAt) {
    const secondsSinceSync =
      (Date.now() - tokenRecord.lastSyncedAt.getTime()) / 1000;
    if (secondsSinceSync < 30) {
      return { synced: 0, deleted: 0 };
    }
  }

  const authClient = await getAuthClientForUser(userId);
  const calendar = google.calendar({ version: "v3", auth: authClient });

  let syncedCount = 0;
  let deletedCount = 0;
  let newSyncToken: string | null | undefined = null;

  try {
    // Incremental sync with existing syncToken, or full sync if null
    const result = await performSync(
      calendar,
      userId,
      tokenRecord.syncToken,
      false,
    );
    syncedCount = result.synced;
    deletedCount = result.deleted;
    newSyncToken = result.nextSyncToken;
  } catch (err: unknown) {
    const isGoneError =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: number }).code === 410;
    if (isGoneError) {
      // 410 Gone: syncToken is expired. Clear cache and perform a full re-sync.
      console.info(
        "[calendarService] SyncToken expired (410 Gone). Clearing cache and performing full re-sync.",
      );
      await prisma.calendarEvent.deleteMany({ where: { userId } });
      const result = await performSync(calendar, userId, null, true);
      syncedCount = result.synced;
      deletedCount = result.deleted;
      newSyncToken = result.nextSyncToken;
    } else {
      throw err;
    }
  }

  // Persist the new syncToken and update lastSyncedAt
  await prisma.googleCalendarToken.update({
    where: { userId },
    data: {
      syncToken: newSyncToken ?? tokenRecord.syncToken,
      lastSyncedAt: new Date(),
    },
  });

  return { synced: syncedCount, deleted: deletedCount };
}

/**
 * Core sync loop — handles pagination and writes upserted/deleted events to DB.
 */
async function performSync(
  calendar: ReturnType<typeof google.calendar>,
  userId: string,
  syncToken: string | null | undefined,
  _isFullSync: boolean,
): Promise<{ synced: number; deleted: number; nextSyncToken: string | null }> {
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;
  let synced = 0;
  let deleted = 0;

  do {
    const params: {
      calendarId: string;
      syncToken?: string;
      pageToken?: string;
      singleEvents: boolean;
      maxResults: number;
      showDeleted: boolean;
    } = {
      calendarId: "primary",
      singleEvents: true,
      maxResults: 250,
      showDeleted: true, // Required to receive CANCELLED events for deletion
    };

    if (syncToken) {
      params.syncToken = syncToken;
    }
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await calendar.events.list(params);
    const data = response.data;

    const items: GoogleEventItem[] = (data.items as GoogleEventItem[]) || [];

    for (const event of items) {
      if (!event.id) continue;

      if (event.status === "cancelled") {
        // Soft-delete: mark as cancelled (not hard-delete, for UI consistency)
        await prisma.calendarEvent.updateMany({
          where: { userId, googleEventId: event.id },
          data: { status: "cancelled" },
        });
        deleted++;
      } else {
        const isAllDay = !event.start?.dateTime && !!event.start?.date;
        const startTime = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : null;
        const endTime = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : null;
        const timezone = event.start?.timeZone ?? null;

        await prisma.calendarEvent.upsert({
          where: { userId_googleEventId: { userId, googleEventId: event.id } },
          create: {
            userId,
            googleEventId: event.id,
            title: event.summary ?? "(No title)",
            description: event.description ?? null,
            location: event.location ?? null,
            startTime,
            endTime,
            startDate: event.start?.date ?? null,
            endDate: event.end?.date ?? null,
            isAllDay,
            isRecurring: !!event.recurringEventId,
            recurringEventId: event.recurringEventId ?? null,
            status: event.status ?? "confirmed",
            timezone,
            etag: event.etag ?? null,
            syncedAt: new Date(),
          },
          update: {
            title: event.summary ?? "(No title)",
            description: event.description ?? null,
            location: event.location ?? null,
            startTime,
            endTime,
            startDate: event.start?.date ?? null,
            endDate: event.end?.date ?? null,
            isAllDay,
            isRecurring: !!event.recurringEventId,
            recurringEventId: event.recurringEventId ?? null,
            status: event.status ?? "confirmed",
            timezone,
            etag: event.etag ?? null,
            syncedAt: new Date(),
          },
        });
        synced++;
      }
    }

    pageToken = data.nextPageToken ?? undefined;
    nextSyncToken = data.nextSyncToken ?? null;
  } while (pageToken);

  return { synced, deleted, nextSyncToken };
}

// ---------------------------------------------------------------------------
// Event CRUD — bidirectional writes (LifeGauge ↔ Google Calendar)
// ---------------------------------------------------------------------------

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startTime?: string; // ISO 8601 datetime
  endTime?: string;
  startDate?: string; // YYYY-MM-DD (all-day)
  endDate?: string; // YYYY-MM-DD (exclusive, all-day)
  isAllDay: boolean;
  timezone?: string;
}

export interface UpdateEventInput extends Partial<CreateEventInput> {}

/**
 * Creates an event in Google Calendar and caches it locally.
 * Loop prevention: sets writtenByUsAt so the next sync ignores this write.
 */
export async function createCalendarEvent(
  userId: string,
  input: CreateEventInput,
) {
  const authClient = await getAuthClientForUser(userId);
  const calendar = google.calendar({ version: "v3", auth: authClient });

  const eventBody: Record<string, unknown> = {
    summary: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
  };

  if (input.isAllDay) {
    eventBody.start = { date: input.startDate };
    eventBody.end = { date: input.endDate ?? input.startDate };
  } else {
    eventBody.start = {
      dateTime: input.startTime,
      timeZone: input.timezone ?? "UTC",
    };
    eventBody.end = {
      dateTime: input.endTime,
      timeZone: input.timezone ?? "UTC",
    };
  }

  const { data: created } = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventBody,
  });

  if (!created.id)
    throw new Error("Google Calendar did not return an event ID.");

  const now = new Date();
  const isAllDay = input.isAllDay;
  const startTime = input.startTime ? new Date(input.startTime) : null;
  const endTime = input.endTime ? new Date(input.endTime) : null;

  const cached = await prisma.calendarEvent.create({
    data: {
      userId,
      googleEventId: created.id,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      startTime,
      endTime,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      isAllDay,
      isRecurring: false,
      status: "confirmed",
      timezone: input.timezone ?? null,
      etag: created.etag ?? null,
      writtenByUsAt: now, // Loop prevention marker
      syncedAt: now,
    },
  });

  return cached;
}

/**
 * Updates an event in Google Calendar and refreshes the local cache.
 */
export async function updateCalendarEvent(
  userId: string,
  localId: string,
  input: UpdateEventInput,
) {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: localId, userId },
  });
  if (!existing) throw new Error("Calendar event not found.");

  const authClient = await getAuthClientForUser(userId);
  const calendar = google.calendar({ version: "v3", auth: authClient });

  const isAllDay = input.isAllDay ?? existing.isAllDay;
  const patchBody: Record<string, unknown> = {
    summary: input.title ?? existing.title,
    description: input.description ?? existing.description,
    location: input.location ?? existing.location,
  };

  if (isAllDay) {
    patchBody.start = { date: input.startDate ?? existing.startDate };
    patchBody.end = {
      date: input.endDate ?? existing.endDate ?? existing.startDate,
    };
  } else {
    const tz = input.timezone ?? existing.timezone ?? "UTC";
    patchBody.start = {
      dateTime: input.startTime ?? existing.startTime?.toISOString(),
      timeZone: tz,
    };
    patchBody.end = {
      dateTime: input.endTime ?? existing.endTime?.toISOString(),
      timeZone: tz,
    };
  }

  const { data: updated } = await calendar.events.patch({
    calendarId: "primary",
    eventId: existing.googleEventId,
    requestBody: patchBody,
  });

  const now = new Date();
  const refreshed = await prisma.calendarEvent.update({
    where: { id: localId },
    data: {
      title: updated.summary ?? existing.title,
      description: updated.description ?? existing.description,
      location: updated.location ?? existing.location,
      startTime: updated.start?.dateTime
        ? new Date(updated.start.dateTime)
        : null,
      endTime: updated.end?.dateTime ? new Date(updated.end.dateTime) : null,
      startDate: updated.start?.date ?? null,
      endDate: updated.end?.date ?? null,
      isAllDay,
      timezone: input.timezone ?? existing.timezone,
      etag: updated.etag ?? null,
      writtenByUsAt: now,
      syncedAt: now,
    },
  });

  return refreshed;
}

/**
 * Deletes an event from Google Calendar and removes it from the local cache.
 */
export async function deleteCalendarEvent(
  userId: string,
  localId: string,
): Promise<void> {
  const existing = await prisma.calendarEvent.findFirst({
    where: { id: localId, userId },
  });
  if (!existing) throw new Error("Calendar event not found.");

  const authClient = await getAuthClientForUser(userId);
  const calendar = google.calendar({ version: "v3", auth: authClient });

  await calendar.events.delete({
    calendarId: "primary",
    eventId: existing.googleEventId,
  });

  await prisma.calendarEvent.delete({ where: { id: localId } });
}

/**
 * Queries the local CalendarEvent cache for a date range.
 * NOTE: Does NOT include any productivity analytics data.
 */
export async function getEventsByRange(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<
  {
    id: string;
    googleEventId: string;
    title: string;
    description: string | null;
    location: string | null;
    startTime: Date | null;
    endTime: Date | null;
    startDate: string | null;
    endDate: string | null;
    isAllDay: boolean;
    isRecurring: boolean;
    recurringEventId: string | null;
    status: string;
    timezone: string | null;
  }[]
> {
  const start = new Date(startIso);
  const end = new Date(endIso);

  return prisma.calendarEvent.findMany({
    where: {
      userId,
      status: { not: "cancelled" }, // Exclude cancelled events from the UI
      OR: [
        // Timed events overlapping the range
        {
          startTime: { gte: start, lte: end },
        },
        // All-day events overlapping the range
        {
          isAllDay: true,
          startDate: {
            gte: startIso.substring(0, 10),
            lte: endIso.substring(0, 10),
          },
        },
      ],
    },
    select: {
      id: true,
      googleEventId: true,
      title: true,
      description: true,
      location: true,
      startTime: true,
      endTime: true,
      startDate: true,
      endDate: true,
      isAllDay: true,
      isRecurring: true,
      recurringEventId: true,
      status: true,
      timezone: true,
    },
    orderBy: [{ startTime: "asc" }, { startDate: "asc" }],
  });
}
