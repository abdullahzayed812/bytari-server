import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, adminNotifications, users } from '../../../../db';
import { eq, and, desc, sql } from 'drizzle-orm';

// Get admin notifications
export const getAdminNotificationsProcedure = publicProcedure
  .input(z.object({
    adminId: z.number(),
    filter: z.enum(['all', 'unread', 'high']).default('all'),
    limit: z.number().default(50),
  }))
  .query(async ({ input }) => {
    try {
      let whereConditions = [eq(adminNotifications.recipientId, input.adminId)];

      if (input.filter === 'unread') {
        whereConditions.push(eq(adminNotifications.isRead, false));
      } else if (input.filter === 'high') {
        whereConditions.push(eq(adminNotifications.priority, 'high'));
      }

      const notifications = await db
        .select({
          id: adminNotifications.id,
          type: adminNotifications.type,
          title: adminNotifications.title,
          content: adminNotifications.content,
          relatedResourceType: adminNotifications.relatedResourceType,
          relatedResourceId: adminNotifications.relatedResourceId,
          actionUrl: adminNotifications.actionUrl,
          isRead: adminNotifications.isRead,
          priority: adminNotifications.priority,
          createdAt: adminNotifications.createdAt,
          readAt: adminNotifications.readAt,
        })
        .from(adminNotifications)
        .where(and(...whereConditions))
        .orderBy(desc(adminNotifications.createdAt))
        .limit(input.limit);

      return notifications;
    } catch (error) {
      console.error('Error getting admin notifications:', error);
      throw new Error('Failed to get admin notifications');
    }
  });

// Mark notification as read
export const markNotificationAsReadProcedure = publicProcedure
  .input(z.object({
    notificationId: z.number(),
    adminId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      await db
        .update(adminNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(
          eq(adminNotifications.id, input.notificationId),
          eq(adminNotifications.recipientId, input.adminId)
        ));

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  });

// Mark all notifications as read
export const markAllNotificationsAsReadProcedure = publicProcedure
  .input(z.object({
    adminId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      await db
        .update(adminNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(
          eq(adminNotifications.recipientId, input.adminId),
          eq(adminNotifications.isRead, false)
        ));

      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  });

// Delete notification
export const deleteNotificationProcedure = publicProcedure
  .input(z.object({
    notificationId: z.number(),
    adminId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      await db
        .delete(adminNotifications)
        .where(and(
          eq(adminNotifications.id, input.notificationId),
          eq(adminNotifications.recipientId, input.adminId)
        ));

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  });

// Get unread notifications count
export const getUnreadNotificationsCountProcedure = publicProcedure
  .input(z.object({
    adminId: z.number(),
  }))
  .query(async ({ input }) => {
    try {
      const result = await db
        .select({
          count: sql`COUNT(*)`
        })
        .from(adminNotifications)
        .where(and(
          eq(adminNotifications.recipientId, input.adminId),
          eq(adminNotifications.isRead, false)
        ));

      return { count: Number(result[0]?.count) || 0 };
    } catch (error) {
      console.error('Error getting unread notifications count:', error);
      throw new Error('Failed to get unread notifications count');
    }
  });

// Create notification (for system use)
export const createNotificationProcedure = publicProcedure
  .input(z.object({
    recipientId: z.number(),
    type: z.enum(['approval_request', 'system_alert', 'user_report']),
    title: z.string(),
    content: z.string(),
    relatedResourceType: z.string().optional(),
    relatedResourceId: z.number().optional(),
    actionUrl: z.string().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  }))
  .mutation(async ({ input }) => {
    try {
      const [notification] = await db
        .insert(adminNotifications)
        .values({
          recipientId: input.recipientId,
          type: input.type,
          title: input.title,
          content: input.content,
          relatedResourceType: input.relatedResourceType,
          relatedResourceId: input.relatedResourceId,
          actionUrl: input.actionUrl,
          priority: input.priority,
        })
        .returning();

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  });