import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import {
  db,
  systemMessages,
  systemMessageRecipients,
  users,
  notifications,
  systemMessageReplies,
} from "../../../../db";
import { eq, and, desc, inArray, sql, asc, exists } from "drizzle-orm";

// Send system message
export const sendSystemMessage = publicProcedure
  .input(
    z.object({
      senderId: z.number(),
      title: z.string().min(1),
      content: z.string().min(1),
      type: z.enum(["announcement", "maintenance", "update", "warning"]),
      targetAudience: z.enum(["all", "users", "vets", "students", "clinics", "stores", "specific", "multiple"]),
      targetCategories: z.array(z.enum(["users", "vets", "students", "clinics", "stores"])).optional(),
      targetUserIds: z.array(z.number()).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
      scheduledAt: z.date().optional(),
      imageUrl: z.string().optional(),
      linkUrl: z.string().optional(),
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
          targetUserIds: input.targetUserIds || null,
          targetCategories: input.targetCategories || null,
          priority: input.priority,
          scheduledAt: input.scheduledAt,
          sentAt: input.scheduledAt ? null : new Date(),
          imageUrl: input.imageUrl,
          linkUrl: input.linkUrl,
        })
        .returning();

      // If not scheduled, send immediately
      if (!input.scheduledAt) {
        await sendMessageToRecipients(message.id, input.targetAudience, input.targetUserIds, input.targetCategories);
      }

      return message;
    } catch (error) {
      console.error("Error sending system message:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to send system message");
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
    recipients = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));
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
  } else if (targetAudience === "multiple" && targetCategories && targetCategories.length > 0) {
    recipients = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.userType, targetCategories), eq(users.isActive, true)));
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
      message: "لديك رسالة جديدة من إدارة التطبيق",
      type: "system" as const,
      data: JSON.stringify({ messageId }),
    }));

    if (notificationData.length > 0) {
      await db.insert(notifications).values(notificationData);
    }
  }
}

// Get system messages for user
export const getUserSystemMessages = publicProcedure
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
          createdAt: systemMessages.createdAt,
          isRead: systemMessageRecipients.isRead,
          readAt: systemMessageRecipients.readAt,
        })
        .from(systemMessageRecipients)
        .innerJoin(systemMessages, eq(systemMessageRecipients.messageId, systemMessages.id))
        .where(eq(systemMessageRecipients.userId, input.userId))
        // .orderBy(desc(systemMessages.sentAt))
        .limit(input.limit)
        .offset(input.offset);

      return { success: true, messages };
    } catch (error) {
      console.error("Error getting user system messages:", error);
      throw new Error("Failed to get system messages");
    }
  });

// Mark system message as read
export const markSystemMessageAsRead = publicProcedure
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
          and(eq(systemMessageRecipients.userId, input.userId), eq(systemMessageRecipients.messageId, input.messageId))
        );

      return { success: true };
    } catch (error) {
      console.error("Error marking message as read:", error);
      throw new Error("Failed to mark message as read");
    }
  });

// Send notification to users
export const sendNotification = publicProcedure
  .input(
    z.object({
      senderId: z.number(),
      title: z.string().min(1),
      message: z.string().min(1),
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
        message: input.message,
        type: input.type,
        data: input.data ? JSON.stringify(input.data) : null,
      }));

      const notificationResults = await db.insert(notifications).values(notificationData).returning();

      return notificationResults;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to send notification");
    }
  });

// Get all system messages (Admin only)
export const getAllSystemMessages = publicProcedure
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
          status: systemMessages.status, // Add this
          scheduledAt: systemMessages.scheduledAt,
          sentAt: systemMessages.sentAt,
          createdAt: systemMessages.createdAt,
          senderName: users.name,
          replyCount: sql<number>`count(${systemMessageReplies.id})`,
        })
        .from(systemMessages)
        .innerJoin(users, eq(systemMessages.senderId, users.id))
        .leftJoin(systemMessageReplies, eq(systemMessageReplies.messageId, systemMessages.id))
        .groupBy(systemMessages.id, users.name)
        .orderBy(desc(systemMessages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { success: true, messages };
    } catch (error) {
      console.error("Error getting all system messages:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get system messages");
    }
  });

// Delete system message (Admin only)
export const deleteSystemMessage = publicProcedure
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
      await db.update(systemMessages).set({ isActive: false }).where(eq(systemMessages.id, input.messageId));

      return { success: true };
    } catch (error) {
      console.error("Error deleting system message:", error);
      throw new Error("Failed to delete system message");
    }
  });

// Send a reply to a system message
export const sendSystemMessageReply = publicProcedure
  .input(
    z.object({
      messageId: z.number(),
      userId: z.number(),
      content: z.string().min(1),
      isFromAdmin: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      const [reply] = await db
        .insert(systemMessageReplies)
        .values({
          messageId: input.messageId,
          userId: input.userId,
          content: input.content,
          isFromAdmin: input.isFromAdmin,
        })
        .returning();

      // Update the status of the parent system message to 'replied'
      await db.update(systemMessages).set({ status: "replied" }).where(eq(systemMessages.id, input.messageId));

      return reply;
    } catch (error) {
      console.error("Error sending system message reply:", error);
      throw new Error("Failed to send system message reply");
    }
  });

// Get replies for a system message
export const getSystemMessageReplies = publicProcedure
  .input(
    z.object({
      messageId: z.number(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      const replies = await db
        .select({
          id: systemMessageReplies.id,
          messageId: systemMessageReplies.messageId,
          userId: systemMessageReplies.userId,
          content: systemMessageReplies.content,
          isFromAdmin: systemMessageReplies.isFromAdmin,
          createdAt: systemMessageReplies.createdAt,
          userName: users.name, // Join with users to get replier's name
        })
        .from(systemMessageReplies)
        .innerJoin(users, eq(systemMessageReplies.userId, users.id))
        .where(eq(systemMessageReplies.messageId, input.messageId))
        .orderBy(asc(systemMessageReplies.createdAt));

      return { replies };
    } catch (error) {
      console.error("Error getting system message replies:", error);
      throw new Error("Failed to get system message replies");
    }
  });

// Get unread messages count for user
export const getUnreadMessagesCount = publicProcedure
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
        .innerJoin(systemMessages, eq(systemMessageRecipients.messageId, systemMessages.id))
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

// Helper function to send welcome message to a specific user
export async function sendWelcomeMessageToUser(userId: number, userType: string) {
  try {
    // Check if user already has a welcome message
    const [existing] = await db
      .select({ id: systemMessageRecipients.id })
      .from(systemMessageRecipients)
      .innerJoin(systemMessages, eq(systemMessageRecipients.messageId, systemMessages.id))
      .where(
        and(
          eq(systemMessageRecipients.userId, userId),
          eq(systemMessages.type, "announcement"),
          eq(systemMessages.title, "مرحباً بك في تطبيق بيطري!")
        )
      )
      .limit(1);

    if (existing) return;

    const title = "مرحباً بك في تطبيق بيطري!";
    const content =
      userType === "veterinarian"
        ? "مرحباً بك دكتور في تطبيق تطبيق بيطري. يمكنك الآن إدارة عيادتك، متابعة الحالات المرضية، والتواصل مع أصحاب الحيوانات الأليفة بكل سهولة."
        : "مرحباً بك في تطبيق تطبيق بيطري. يمكنك الآن إضافة حيواناتك الأليفة، حجز المواعيد في العيادات، والحصول على استشارات طبية فورية.";

    // Create system message
    const [message] = await db
      .insert(systemMessages)
      .values({
        senderId: 1, // System/Admin ID
        title,
        content,
        type: "announcement",
        targetAudience: "specific",
        targetUserIds: [userId],
        priority: "high",
        sentAt: new Date(),
      })
      .returning();

    // Create recipient record
    await db.insert(systemMessageRecipients).values({
      messageId: message.id,
      userId,
    });

    // Create notification
    await db.insert(notifications).values({
      userId,
      title,
      message: "لديك رسالة ترحيبية جديدة",
      type: "system",
      data: JSON.stringify({ messageId: message.id, isWelcome: true }),
    });
  } catch (error) {
    console.error("Error sending welcome message:", error);
  }
}
