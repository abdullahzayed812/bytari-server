import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { db } from "../../../db";
import { notifications } from "../../../db/schema";
import { eq, and, desc, or, gte } from "drizzle-orm";
import { createNotification } from "../../../lib/notification-service";

// Get user notifications
export const getUserNotificationsProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      type: z.string().optional(),
      isRead: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const conditions = [
      eq(notifications.userId, input.userId),
      or(eq(notifications.isRead, false), gte(notifications.createdAt, sevenDaysAgo)),
    ];

    if (input.type) {
      conditions.push(eq(notifications.type, input.type));
    }

    if (input.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, input.isRead));
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return { success: true, notifications: userNotifications };
  });

// Mark notification as read
export const markNotificationAsReadProcedure = protectedProcedure
  .input(
    z.object({
      notificationId: z.number(),
      userId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const result = await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, input.notificationId),
          eq(notifications.userId, input.userId)
        )
      )
      .returning();

    if (result.length === 0) {
      throw new Error("Notification not found");
    }

    return result[0];
  });

// Mark all notifications as read
export const markAllNotificationsAsReadProcedure = protectedProcedure
  .input(z.object({ userId: z.number() }))
  .mutation(async ({ input }) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, input.userId));

    return { success: true };
  });

// Delete notification
export const deleteUserNotificationProcedure = protectedProcedure
  .input(
    z.object({
      notificationId: z.number(),
      userId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, input.notificationId),
          eq(notifications.userId, input.userId)
        )
      );

    return { success: true };
  });

// Get unread notifications count
export const getUnreadNotificationsCountProcedure = protectedProcedure
  .input(z.object({ userId: z.number() }))
  .query(async ({ input }) => {
    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, input.userId),
          eq(notifications.isRead, false)
        )
      );

    return { count: result.length };
  });

// Create notification — delegates to notification-service which handles both
// DB persistence and push delivery. Push failure never affects the DB row.
export const createNotificationProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      title: z.string(),
      message: z.string(),
      type: z.string(),
      data: z.record(z.unknown()).optional(),
    })
  )
  .mutation(async ({ input }) => {
    return createNotification(input.userId, {
      title: input.title,
      message: input.message,
      type: input.type,
      data: input.data as Record<string, unknown> | undefined,
    });
  });
