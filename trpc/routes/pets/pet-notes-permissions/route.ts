import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import {
  db,
  pets,
  clinics,
  medicalRecords,
  vaccinations,
  petReminders,
  pendingMedicalActions,
  users,
  veterinarians,
} from "../../../../db";

// ============================================
// VETERINARIAN: Request to add medical record
// ============================================
export const requestAddMedicalRecordProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      diagnosis: z.string().min(1),
      treatment: z.string().min(1),
      notes: z.string().optional(),
      prescriptionImage: z.string().optional(),
      requestReason: z.string().min(1, "يجب إدخال سبب الطلب"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [request] = await db
        .insert(pendingMedicalActions)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          actionType: "medical_record",
          actionData: {
            diagnosis: input.diagnosis,
            treatment: input.treatment,
            notes: input.notes,
            prescriptionImage: input.prescriptionImage,
          },
          reason: input.requestReason,
          status: "pending",
        })
        .returning();

      return {
        success: true,
        request,
        message: "تم إرسال طلب إضافة السجل الطبي إلى مالك الحيوان",
      };
    } catch (error) {
      console.error("Error requesting medical record:", error);
      throw new Error("فشل في إرسال طلب السجل الطبي");
    }
  });

// ============================================
// VETERINARIAN: Request to add vaccination
// ============================================
export const requestAddVaccinationProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      name: z.string().min(1),
      nextDate: z.string().optional(),
      notes: z.string().optional(),
      requestReason: z.string().min(1, "يجب إدخال سبب الطلب"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [request] = await db
        .insert(pendingMedicalActions)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          actionType: "vaccination",
          actionData: {
            name: input.name,
            nextDate: input.nextDate,
            notes: input.notes,
          },
          reason: input.requestReason,
          status: "pending",
        })
        .returning();

      return {
        success: true,
        request,
        message: "تم إرسال طلب إضافة التطعيم إلى مالك الحيوان",
      };
    } catch (error) {
      console.error("Error requesting vaccination:", error);
      throw new Error("فشل في إرسال طلب التطعيم");
    }
  });

// ============================================
// VETERINARIAN: Request to add reminder
// ============================================
export const requestAddReminderProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      reminderDate: z.string(),
      reminderType: z.enum(["vaccination", "medication", "checkup", "other"]).default("checkup"),
      requestReason: z.string().min(1, "يجب إدخال سبب الطلب"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [request] = await db
        .insert(pendingMedicalActions)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          actionType: "reminder",
          actionData: {
            title: input.title,
            description: input.description,
            reminderDate: input.reminderDate,
            reminderType: input.reminderType,
          },
          reason: input.requestReason,
          status: "pending",
        })
        .returning();

      return {
        success: true,
        request,
        message: "تم إرسال طلب إضافة التذكير إلى مالك الحيوان",
      };
    } catch (error) {
      console.error("Error requesting reminder:", error);
      throw new Error("فشل في إرسال طلب التذكير");
    }
  });

// ============================================
// OWNER: Get pending medical action requests
// ============================================
export const getPendingMedicalActionsProcedure = protectedProcedure.query(async ({ ctx }) => {
  try {
    const requests = await db
      .select({
        id: pendingMedicalActions.id,
        petId: pendingMedicalActions.petId,
        petName: pets.name,
        petType: pets.type,
        clinicId: pendingMedicalActions.clinicId,
        clinicName: clinics.name,
        veterinarianName: users.name,
        actionType: pendingMedicalActions.actionType,
        actionData: pendingMedicalActions.actionData,
        reason: pendingMedicalActions.reason,
        notes: pendingMedicalActions.notes,
        createdAt: pendingMedicalActions.createdAt,
      })
      .from(pendingMedicalActions)
      .leftJoin(pets, eq(pets.id, pendingMedicalActions.petId))
      .leftJoin(clinics, eq(clinics.id, pendingMedicalActions.clinicId))
      .leftJoin(veterinarians, eq(veterinarians.id, pendingMedicalActions.veterinarianId))
      .leftJoin(users, eq(users.id, veterinarians.userId))
      .where(and(eq(pendingMedicalActions.status, "pending"), eq(pets.ownerId, ctx.user.id)))
      .orderBy(desc(pendingMedicalActions.createdAt));

    return {
      success: true,
      requests,
    };
  } catch (error) {
    console.error("Error fetching pending medical actions:", error);
    throw new Error("فشل في جلب الطلبات المعلقة");
  }
});

// ============================================
// OWNER: Approve medical action
// ============================================
export const approveMedicalActionProcedure = protectedProcedure
  .input(
    z.object({
      requestId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Get the pending request
      const [request] = await db
        .select({
          action: pendingMedicalActions,
          petOwnerId: pets.ownerId,
        })
        .from(pendingMedicalActions)
        .leftJoin(pets, eq(pets.id, pendingMedicalActions.petId))
        .where(and(eq(pendingMedicalActions.id, input.requestId), eq(pendingMedicalActions.status, "pending")));

      if (!request) {
        throw new Error("الطلب غير موجود أو تم معالجته مسبقاً");
      }

      // Verify owner
      if (request.petOwnerId !== ctx.user.id) {
        throw new Error("غير مصرح لك بالموافقة على هذا الطلب");
      }

      const actionData = request.action.actionData as any;

      // Add the record based on action type
      switch (request.action.actionType) {
        case "medical_record":
          await db.insert(medicalRecords).values({
            petId: request.action.petId,
            clinicId: request.action.clinicId,
            veterinarianId: request.action.veterinarianId,
            diagnosis: actionData.diagnosis,
            treatment: actionData.treatment,
            notes: actionData.notes,
            prescriptionImage: actionData.prescriptionImage,
            date: new Date(),
          });
          break;

        case "vaccination":
          await db.insert(vaccinations).values({
            petId: request.action.petId,
            clinicId: request.action.clinicId,
            name: actionData.name,
            date: new Date(),
            nextDate: actionData.nextDate ? new Date(actionData.nextDate) : undefined,
            notes: actionData.notes,
          });
          break;

        case "reminder":
          await db.insert(petReminders).values({
            petId: request.action.petId,
            clinicId: request.action.clinicId,
            title: actionData.title,
            description: actionData.description,
            reminderDate: new Date(actionData.reminderDate),
            reminderType: actionData.reminderType,
            isCompleted: false,
          });
          break;

        default:
          throw new Error("نوع الطلب غير صالح");
      }

      // Update request status
      await db
        .update(pendingMedicalActions)
        .set({
          status: "approved",
          approvedAt: new Date(),
        })
        .where(eq(pendingMedicalActions.id, input.requestId));

      return {
        success: true,
        message: "تمت الموافقة على الطلب وإضافة البيانات بنجاح",
      };
    } catch (error) {
      console.error("Error approving medical action:", error);
      throw new Error(error instanceof Error ? error.message : "فشل في الموافقة على الطلب");
    }
  });

// ============================================
// OWNER: Reject medical action
// ============================================
export const rejectMedicalActionProcedure = protectedProcedure
  .input(
    z.object({
      requestId: z.number(),
      rejectionReason: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const [request] = await db
        .select({
          action: pendingMedicalActions,
          petOwnerId: pets.ownerId,
        })
        .from(pendingMedicalActions)
        .leftJoin(pets, eq(pets.id, pendingMedicalActions.petId))
        .where(and(eq(pendingMedicalActions.id, input.requestId), eq(pendingMedicalActions.status, "pending")));

      if (!request) {
        throw new Error("الطلب غير موجود أو تم معالجته مسبقاً");
      }

      if (request.petOwnerId !== ctx.user.id) {
        throw new Error("غير مصرح لك برفض هذا الطلب");
      }

      await db
        .update(pendingMedicalActions)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          rejectionReason: input.rejectionReason,
        })
        .where(eq(pendingMedicalActions.id, input.requestId));

      return {
        success: true,
        message: "تم رفض الطلب",
      };
    } catch (error) {
      console.error("Error rejecting medical action:", error);
      throw new Error("فشل في رفض الطلب");
    }
  });

// ============================================
// VETERINARIAN: Get my pending requests
// ============================================
export const getMyMedicalRequestsProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const whereConditions = [eq(pendingMedicalActions.clinicId, Number(ctx.user.clinicId))];

      if (input.petId) {
        whereConditions.push(eq(pendingMedicalActions.petId, input.petId));
      }

      const requests = await db
        .select({
          id: pendingMedicalActions.id,
          petId: pendingMedicalActions.petId,
          petName: pets.name,
          actionType: pendingMedicalActions.actionType,
          actionData: pendingMedicalActions.actionData,
          reason: pendingMedicalActions.reason,
          status: pendingMedicalActions.status,
          createdAt: pendingMedicalActions.createdAt,
          approvedAt: pendingMedicalActions.approvedAt,
          rejectedAt: pendingMedicalActions.rejectedAt,
          rejectionReason: pendingMedicalActions.rejectionReason,
        })
        .from(pendingMedicalActions)
        .leftJoin(pets, eq(pets.id, pendingMedicalActions.petId))
        .where(and(...whereConditions))
        .orderBy(desc(pendingMedicalActions.createdAt));

      return {
        success: true,
        requests,
      };
    } catch (error) {
      console.error("Error fetching my medical requests:", error);
      throw new Error("فشل في جلب الطلبات");
    }
  });
