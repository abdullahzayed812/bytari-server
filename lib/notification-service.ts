import { db, notifications } from "../db";
import { sendPushToUser, sendPushToUsers, toStringRecord } from "./push-notification";

interface NotificationInput {
  title: string;
  message: string;
  type: string;
  data?: Record<string, unknown>;
}

/**
 * Create a single in-app notification then fire a push delivery.
 * Push failure is swallowed — the DB row is always the source of truth.
 */
export async function createNotification(
  userId: number,
  input: NotificationInput
) {
  const [notification] = await db
    .insert(notifications)
    .values({
      userId,
      title: input.title,
      message: input.message,
      type: input.type,
      data: input.data ?? null,
      isRead: false,
    })
    .returning();

  sendPushToUser(userId, {
    title: input.title,
    body: input.message,
    data: toStringRecord({ type: input.type, ...input.data }),
  }).catch(() => {});

  return notification;
}

/**
 * Bulk-create in-app notifications for multiple users then deliver push.
 * Supports single / multi / all-user scenarios via the caller-provided id list.
 */
export async function createNotificationsForUsers(
  userIds: number[],
  input: NotificationInput
) {
  if (userIds.length === 0) return [];

  const inserted = await db
    .insert(notifications)
    .values(
      userIds.map((userId) => ({
        userId,
        title: input.title,
        message: input.message,
        type: input.type,
        data: input.data ?? null,
        isRead: false,
      }))
    )
    .returning();

  sendPushToUsers(userIds, {
    title: input.title,
    body: input.message,
    data: toStringRecord({ type: input.type, ...input.data }),
  }).catch(() => {});

  return inserted;
}
