import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import {
  db,
  systemMessages,
  systemMessageRecipients,
  users,
  notifications,
} from "../../../../db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";

// Send system message
export const sendSystemMessageProcedure = publicProcedure
  .input(
    z.object({
      senderId: z.number(),
      title: z.string().min(1),
      content: z.string().min(1),
      type: z.enum(["announcement", "maintenance", "update", "warning"]),
      targetAudience: z.enum([
        "all",
        "users",
        "vets",
        "students",
        "clinics",
        "stores",
        "specific",
        "multiple",
      ]),
      targetCategories: z
        .array(z.enum(["users", "vets", "students", "clinics", "stores"]))
        .optional(),
      targetUserIds: z.array(z.number()).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      scheduledAt: z.date().optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Create system message
      const [message] = await db
        .insert(systemMessages)
        .values({
          senderId: input.senderId,
          title: input.title,
          content: input.content,
          type: input.type,
          targetAudience: input.targetAudience,
          targetUserIds: input.targetUserIds
            ? JSON.stringify(input.targetUserIds)
            : null,
          targetCategories: input.targetCategories
            ? JSON.stringify(input.targetCategories)
            : null,
          priority: input.priority,
          scheduledAt: input.scheduledAt,
          sentAt: input.scheduledAt ? null : new Date(),
        })
        .returning();

      // If not scheduled, send immediately
      if (!input.scheduledAt) {
        await sendMessageToRecipients(
          message.id,
          input.targetAudience,
          input.targetUserIds,
          input.targetCategories
        );
      }

      return message;
    } catch (error) {
      console.error("Error sending system message:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to send system message"
      );
    }
  });

// Helper function to send message to recipients
async function sendMessageToRecipients(
  messageId: number,
  targetAudience: string,
  targetUserIds?: number[],
  targetCategories?: string[]
) {
  let recipients: { id: number }[] = [];

  if (targetAudience === "all") {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true));
  } else if (targetAudience === "users") {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.userType, "user"), eq(users.isActive, true)));
  } else if (targetAudience === "vets") {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.userType, "vet"), eq(users.isActive, true)));
  } else if (targetAudience === "students") {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.userType, "student"), eq(users.isActive, true)));
  } else if (targetAudience === "clinics") {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.userType, "clinic"), eq(users.isActive, true)));
  } else if (targetAudience === "stores") {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.userType, "store"), eq(users.isActive, true)));
  } else if (
    targetAudience === "multiple" &&
    targetCategories &&
    targetCategories.length > 0
  ) {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(inArray(users.userType, targetCategories), eq(users.isActive, true))
      );
  } else if (targetAudience === "specific" && targetUserIds) {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, targetUserIds), eq(users.isActive, true)));
  }

  // Create message recipients
  const recipientData = recipients.map((recipient) => ({
    messageId,
    userId: recipient.id,
  }));

  if (recipientData.length > 0) {
    await db.insert(systemMessageRecipients).values(recipientData);

    // Also create notifications for immediate delivery
    const notificationData = recipients.map((recipient) => ({
      userId: recipient.id,
      title: "رسالة جديدة من الإدارة",
      content: "لديك رسالة جديدة من إدارة التطبيق",
      type: "system" as const,
      data: JSON.stringify({ messageId }),
    }));

    if (notificationData.length > 0) {
      await db.insert(notifications).values(notificationData);
    }
  }
}

// Get system messages for user
export const getUserSystemMessagesProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      const messages = await db
        .select({
          id: systemMessages.id,
          title: systemMessages.title,
          content: systemMessages.content,
          type: systemMessages.type,
          priority: systemMessages.priority,
          sentAt: systemMessages.sentAt,
          isRead: systemMessageRecipients.isRead,
          readAt: systemMessageRecipients.readAt,
        })
        .from(systemMessageRecipients)
        .innerJoin(
          systemMessages,
          eq(systemMessageRecipients.messageId, systemMessages.id)
        )
        .where(eq(systemMessageRecipients.userId, input.userId))
        .orderBy(desc(systemMessages.sentAt))
        .limit(input.limit)
        .offset(input.offset);

      return { success: true, messages };
    } catch (error) {
      console.error("Error getting user system messages:", error);
      throw new Error("Failed to get system messages");
    }
  });

// Mark system message as read
export const markSystemMessageAsReadProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
      messageId: z.number(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      await db
        .update(systemMessageRecipients)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(
          and(
            eq(systemMessageRecipients.userId, input.userId),
            eq(systemMessageRecipients.messageId, input.messageId)
          )
        );

      return { success: true };
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw new Error("Failed to mark message as read");
    }
  });

// Send notification to users
export const sendNotificationProcedure = publicProcedure
  .input(
    z.object({
      senderId: z.number(),
      title: z.string().min(1),
      content: z.string().min(1),
      type: z.enum(["appointment", "inquiry", "order", "system"]),
      targetUserIds: z.array(z.number()),
      data: z.record(z.string(), z.any()).optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Create notifications for target users
      const notificationData = input.targetUserIds.map((userId: number) => ({
        userId,
        title: input.title,
        content: input.content,
        type: input.type,
        data: input.data ? JSON.stringify(input.data) : null,
      }));

      const notificationResults = await db
        .insert(notifications)
        .values(notificationData)
        .returning();

      return notificationResults;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to send notification"
      );
    }
  });

// Get all system messages (Admin only)
export const getAllSystemMessagesProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const messages = await db
        .select({
          id: systemMessages.id,
          title: systemMessages.title,
          content: systemMessages.content,
          type: systemMessages.type,
          targetAudience: systemMessages.targetAudience,
          targetUserIds: systemMessages.targetUserIds,
          priority: systemMessages.priority,
          isActive: systemMessages.isActive,
          scheduledAt: systemMessages.scheduledAt,
          sentAt: systemMessages.sentAt,
          createdAt: systemMessages.createdAt,
          senderName: users.name,
        })
        .from(systemMessages)
        .innerJoin(users, eq(systemMessages.senderId, users.id))
        .orderBy(desc(systemMessages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return messages;
    } catch (error) {
      console.error("Error getting all system messages:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to get system messages"
      );
    }
  });

// Delete system message (Admin only)
export const deleteSystemMessageProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      messageId: z.number(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Deactivate the message instead of deleting
      await db
        .update(systemMessages)
        .set({ isActive: false })
        .where(eq(systemMessages.id, input.messageId));

      return { success: true };
    } catch (error) {
      console.error("Error deleting system message:", error);
      throw new Error("Failed to delete system message");
    }
  });

// Get unread messages count for user
export const getUnreadMessagesCountProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      const result = await db
        .select({
          count: sql`COUNT(*)`,
        })
        .from(systemMessageRecipients)
        .innerJoin(
          systemMessages,
          eq(systemMessageRecipients.messageId, systemMessages.id)
        )
        .where(
          and(
            eq(systemMessageRecipients.userId, input.userId),
            eq(systemMessageRecipients.isRead, false),
            eq(systemMessages.isActive, true)
          )
        );

      return { count: Number(result[0]?.count) || 0 };
    } catch (error) {
      console.error("Error getting unread messages count:", error);
      return { count: 0 }; // Return default value instead of throwing
    }
  });
