import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import {
  db,
  approvedClinicAccess,
  notifications,
  approvalRequests,
  systemMessages,
  systemMessageRecipients,
  clinics,
  pets,
} from "../../../../db";
import { eq, and, inArray } from "drizzle-orm";

// Sends a message (notification) to all pet owners who have active approved clinic access
export const sendMessageToClinicVisitorsProcedure = protectedProcedure
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
      throw new Error("ليس لديك صلاحية لإرسال رسائل لمراجعي هذه العيادة");
    }

    const [clinic] = await db
      .select({ name: clinics.name })
      .from(clinics)
      .where(eq(clinics.id, clinicId))
      .limit(1);

    // Get distinct owner IDs of pets with active clinic access
    const accessRows = await db
      .select({ petId: approvedClinicAccess.petId })
      .from(approvedClinicAccess)
      .where(and(eq(approvedClinicAccess.clinicId, clinicId), eq(approvedClinicAccess.isActive, true)));

    if (accessRows.length === 0) {
      return { success: true, count: 0 };
    }

    const petIds = accessRows.map((r) => r.petId);
    const petRows = await db.select({ ownerId: pets.ownerId }).from(pets).where(inArray(pets.id, petIds));
    const visitorUserIds = [...new Set(petRows.map((p) => p.ownerId))];

    if (visitorUserIds.length === 0) {
      return { success: true, count: 0 };
    }

    const [systemMessage] = await db
      .insert(systemMessages)
      .values({
        senderId: ctx.user.id,
        clinicId,
        title,
        content: message,
        type: "announcement",
        targetAudience: "specific",
        targetUserIds: visitorUserIds,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl ?? null,
        metadata: { clinicName: clinic?.name },
        sentAt: new Date(),
      })
      .returning();

    await db.insert(systemMessageRecipients).values(
      visitorUserIds.map((uid) => ({ messageId: systemMessage.id, userId: uid }))
    );

    await db.insert(notifications).values(
      visitorUserIds.map((uid) => ({
        userId: uid,
        title,
        message,
        type: "info",
        data: { clinicId, imageUrl },
        isRead: false,
      }))
    );

    return { success: true, count: visitorUserIds.length };
  });
