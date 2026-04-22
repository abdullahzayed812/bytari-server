import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, clinicFollowers, notifications, approvalRequests, systemMessages, systemMessageRecipients, clinics } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const sendMessageToClinicFollowersProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      title: z.string().min(1),
      message: z.string().min(1),
      imageUrl: z.string().optional(),
      linkUrl: z.string().url().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { clinicId, title, message, imageUrl, linkUrl } = input;

    // Verify the caller is the clinic owner
    const [ownerRequest] = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.resourceId, clinicId),
          eq(approvalRequests.requesterId, ctx.user.id),
          eq(approvalRequests.requestType, "clinic_activation"),
          eq(approvalRequests.status, "approved")
        )
      )
      .limit(1);

    if (!ownerRequest) {
      throw new Error("ليس لديك صلاحية لإرسال رسائل لمتابعي هذه العيادة");
    }

    // Get clinic info for metadata
    const [clinic] = await db
      .select({ name: clinics.name })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    // Get all follower user IDs
    const followers = await db
      .select({ userId: clinicFollowers.userId })
      .from(clinicFollowers)
      .where(eq(clinicFollowers.clinicId, clinicId));

    if (followers.length === 0) {
      return { success: true, count: 0 };
    }

    // Create system message record
    const [systemMessage] = await db
      .insert(systemMessages)
      .values({
        senderId: ctx.user.id,
        clinicId,
        title,
        content: message,
        type: "announcement",
        targetAudience: "specific",
        targetUserIds: followers.map((f) => f.userId),
        imageUrl: imageUrl || null,
        linkUrl: linkUrl ?? null,
        metadata: { clinicName: clinic?.name },
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
        data: { clinicId, imageUrl },
        isRead: false,
      }))
    );

    return { success: true, count: followers.length };
  });
