import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { db, deviceTokens } from "../db";
import { inArray } from "drizzle-orm";
import logger from "./logger";

export interface PushPayload {
  title: string;
  body: string;
  /** All values must be strings — FCM data envelope requirement. */
  data?: Record<string, string>;
}

function getFirebaseMessaging() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn("[Push] Firebase credentials not set — push notifications disabled");
    return null;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  return getMessaging();
}

/** Convert any JSON-serialisable object to Record<string,string> for FCM data field. */
export function toStringRecord(
  data: unknown
): Record<string, string> | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([k, v]) => [
      k,
      String(v),
    ])
  );
}

async function fetchTokenRows(
  userIds: number[]
): Promise<{ id: number; token: string }[]> {
  if (userIds.length === 0) return [];
  return db
    .select({ id: deviceTokens.id, token: deviceTokens.token })
    .from(deviceTokens)
    .where(inArray(deviceTokens.userId, userIds));
}

async function purgeStaleTokens(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db.delete(deviceTokens).where(inArray(deviceTokens.id, ids));
}

/**
 * Send a push notification to one or more users.
 * Never throws — push failure must never affect in-app notification creation.
 */
export async function sendPushToUsers(
  userIds: number[],
  payload: PushPayload
): Promise<void> {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    const rows = await fetchTokenRows(userIds);
    if (rows.length === 0) {
      logger.warn("[Push] No device tokens found for users", { userIds });
      return;
    }

    const response = await messaging.sendEachForMulticast({
      tokens: rows.map((r) => r.token),
      notification: { title: payload.title, body: payload.body },
      ...(payload.data ? { data: payload.data } : {}),
      android: { priority: "high", notification: { channelId: "default" } },
      apns: { payload: { aps: { sound: "default" } } },
    });

    const staleIds = response.responses
      .map((r, i) => ({ ...r, id: rows[i].id }))
      .filter(
        (r) =>
          !r.success &&
          (r.error?.code === "messaging/registration-token-not-registered" ||
            r.error?.code === "messaging/invalid-registration-token")
      )
      .map((r) => r.id);

    await purgeStaleTokens(staleIds);

    logger.info(
      `[Push] ${response.successCount}/${rows.length} delivered` +
        (response.failureCount > 0
          ? `, ${response.failureCount} failed`
          : "")
    );
  } catch (error: any) {
    logger.error("[Push] sendPushToUsers failed", {
      message: error?.message,
      code: error?.code,
      errorInfo: error?.errorInfo,
    });
  }
}

/** Convenience wrapper for a single user. */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload
): Promise<void> {
  return sendPushToUsers([userId], payload);
}
