import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, storeFollowers, notifications, stores, systemMessages, systemMessageRecipients } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const sendMessageToStoreFollowersProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      title: z.string().min(1),
      message: z.string().min(1),
      imageUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { storeId, title, message, imageUrl } = input;

    // Verify the caller is the store owner
    const [store] = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.ownerId, ctx.user.id)))
      .limit(1);

    if (!store) {
      throw new Error("ليس لديك صلاحية لإرسال رسائل لمتابعي هذا المتجر");
    }

    // Get all follower user IDs
    const followers = await db
      .select({ userId: storeFollowers.userId })
      .from(storeFollowers)
      .where(eq(storeFollowers.storeId, storeId));

    if (followers.length === 0) {
      return { success: true, count: 0 };
    }

    // Create system message record
    const [systemMessage] = await db
      .insert(systemMessages)
      .values({
        senderId: ctx.user.id,
        title,
        content: message,
        type: "announcement",
        targetAudience: "specific",
        targetUserIds: followers.map((f) => f.userId),
        imageUrl: imageUrl || null,
        sentAt: new Date(),
      })
      .returning();

    // Bulk insert message recipients
    await db.insert(systemMessageRecipients).values(
      followers.map((f) => ({
        messageId: systemMessage.id,
        userId: f.userId,
      }))
    );

    // Bulk insert notifications for each follower
    await db.insert(notifications).values(
      followers.map((f) => ({
        userId: f.userId,
        title,
        message,
        type: "info",
        data: { storeId, imageUrl },
        isRead: false,
      }))
    );

    return { success: true, count: followers.length };
  });
