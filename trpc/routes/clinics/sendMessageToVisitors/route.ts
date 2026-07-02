import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import {
  db,
  approvedClinicAccess,
  approvalRequests,
  systemMessages,
  systemMessageRecipients,
  clinics,
  pets,
  medicalRecords,
  vaccinations,
  petReminders,
  clinicAppointments,
} from "../../../../db";
import { createNotificationsForUsers } from "../../../../lib/notification-service";
import { eq, and, inArray } from "drizzle-orm";

// Sends a message to all pet owners who have any clinic data (visits, records, vaccinations, reminders, appointments)
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

    // Collect all pet IDs that have any data from this clinic across all tables
    const [accessRows, recordRows, vaccinationRows, reminderRows] = await Promise.all([
      db.select({ petId: approvedClinicAccess.petId }).from(approvedClinicAccess)
        .where(and(eq(approvedClinicAccess.clinicId, clinicId), eq(approvedClinicAccess.isActive, true))),
      db.select({ petId: medicalRecords.petId }).from(medicalRecords)
        .where(eq(medicalRecords.clinicId, clinicId)),
      db.select({ petId: vaccinations.petId }).from(vaccinations)
        .where(eq(vaccinations.clinicId, clinicId)),
      db.select({ petId: petReminders.petId }).from(petReminders)
        .where(eq(petReminders.clinicId, clinicId)),
    ]);

    // clinicAppointments has ownerId directly — collect those too
    const appointmentOwnerRows = await db
      .select({ ownerId: clinicAppointments.ownerId })
      .from(clinicAppointments)
      .where(eq(clinicAppointments.clinicId, clinicId));

    const allPetIds = [
      ...new Set([
        ...accessRows.map((r) => r.petId),
        ...recordRows.map((r) => r.petId),
        ...vaccinationRows.map((r) => r.petId),
        ...reminderRows.map((r) => r.petId),
      ]),
    ];

    // Resolve pet owners for all pet-based records
    const petOwnerIds = allPetIds.length > 0
      ? (await db.select({ ownerId: pets.ownerId }).from(pets).where(inArray(pets.id, allPetIds))).map((p) => p.ownerId)
      : [];

    const visitorUserIds = [
      ...new Set([
        ...petOwnerIds,
        ...appointmentOwnerRows.map((r) => r.ownerId),
      ]),
    ];

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

    await createNotificationsForUsers(visitorUserIds, {
      title,
      message,
      type: "info",
      data: { clinicId, imageUrl },
    });

    return { success: true, count: visitorUserIds.length };
  });
