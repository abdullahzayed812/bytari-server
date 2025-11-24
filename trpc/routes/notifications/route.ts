import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { db } from "../../../db";
import { notifications } from "../../../db/schema";
import { eq, and, desc } from "drizzle-orm";

// Get user notifications
export const getUserNotificationsProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      type: z.enum(["appointment", "inquiry", "order", "system"]).optional(),
      isRead: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    const conditions = [eq(notifications.userId, input.userId)];

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
      .where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, input.userId)))
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
    console.log("[markAllNotificationsAsRead] Marking all notifications as read for user:", input.userId);

    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, input.userId));

    console.log("[markAllNotificationsAsRead] All notifications marked as read");
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
    console.log("[deleteUserNotification] Deleting notification:", input.notificationId);

    await db
      .delete(notifications)
      .where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, input.userId)));

    console.log("[deleteUserNotification] Notification deleted");
    return { success: true };
  });

// Get unread notifications count
export const getUnreadNotificationsCountProcedure = protectedProcedure
  .input(z.object({ userId: z.number() }))
  .query(async ({ input }) => {
    console.log("[getUnreadNotificationsCount] Getting count for user:", input.userId);

    const result = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, input.userId), eq(notifications.isRead, false)));

    const count = result.length;
    console.log(`[getUnreadNotificationsCount] User has ${count} unread notifications`);
    return { count };
  });

// Create notification
export const createNotificationProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      title: z.string(),
      content: z.string(),
      type: z.enum(["appointment", "inquiry", "order", "system"]),
      data: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("[createNotification] Creating notification for user:", input.userId);

    const result = await db
      .insert(notifications)
      .values({
        userId: input.userId,
        title: input.title,
        content: input.content,
        type: input.type,
        data: input.data,
        isRead: false,
        createdAt: new Date(),
      })
      .returning();

    console.log("[createNotification] Notification created successfully");
    return result[0];
  });
