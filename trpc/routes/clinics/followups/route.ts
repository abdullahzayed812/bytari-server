import { z } from "zod";
import { eq, desc, and, or, isNull, gt } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, clinicAccessRequests, approvedClinicAccess, pets, users, veterinarians, clinics } from "../../../../db";

// Get all followup requests for a clinic
export const getClinicFollowupsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      status: z.enum(["all", "pending", "approved", "rejected"]).optional().default("all"),
    })
  )
  .query(async ({ input }) => {
    try {
      // Build where conditions based on status filter
      let whereConditions = and(
        eq(clinicAccessRequests.clinicId, input.clinicId)
        // eq(clinicAccessRequests.reason, "followup") // Using reason field to identify followup requests
      );

      if (input.status !== "all") {
        whereConditions = and(
          eq(clinicAccessRequests.clinicId, input.clinicId),
          // eq(clinicAccessRequests.reason, "followup"),
          eq(clinicAccessRequests.status, input.status)
        );
      }

      const followupsQuery = db
        .select({
          id: clinicAccessRequests.id,
          petName: pets.name,
          petType: pets.type,
          ownerName: users.name,
          ownerPhone: users.phone,
          // veterinarianName: veterinarians.name,
          clinicName: clinics.name,
          reason: clinicAccessRequests.reason,
          status: clinicAccessRequests.status,
          scheduledDate: clinicAccessRequests.expiresAt, // Using expiresAt as scheduled date
          approvedAt: clinicAccessRequests.approvedAt,
          rejectedAt: clinicAccessRequests.rejectedAt,
          rejectionReason: clinicAccessRequests.rejectionReason,
          createdAt: clinicAccessRequests.createdAt,
          updatedAt: clinicAccessRequests.updatedAt,
        })
        .from(clinicAccessRequests)
        .innerJoin(pets, eq(pets.id, clinicAccessRequests.petId))
        .innerJoin(users, eq(users.id, pets.ownerId))
        .innerJoin(clinics, eq(clinics.id, clinicAccessRequests.clinicId))
        // .leftJoin(veterinarians, eq(veterinarians.id, clinicAccessRequests.veterinarianId))
        .where(whereConditions)
        .orderBy(desc(clinicAccessRequests.createdAt));

      const allFollowups = await followupsQuery;

      // Process followups to add computed fields
      const processedFollowups = allFollowups.map((followup) => {
        const scheduledDate = followup.scheduledDate ? new Date(followup.scheduledDate) : new Date();
        const isToday = scheduledDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

        // Format date and time
        const formattedDate = scheduledDate.toISOString().split("T")[0];
        const formattedTime = scheduledDate.toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        // Determine followup type from reason
        const followupType = getFollowupTypeFromReason(followup.reason);

        return {
          id: followup.id.toString(),
          petName: followup.petName,
          petType: followup.petType,
          ownerName: followup.ownerName,
          ownerPhone: followup.ownerPhone || "+964 770 000 0000",
          veterinarian: followup.veterinarianName || "د. محمد أحمد",
          clinicName: followup.clinicName,
          title: `متابعة ${getFollowupTypeText(followupType)}`,
          description: followup.reason,
          followupType: followupType,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          status: followup.status,
          priority: getPriorityFromStatus(followup.status),
          notes: followup.rejectionReason || "لا توجد ملاحظات",
          createdDate: followup.createdAt.toISOString().split("T")[0],
          lastUpdate: followup.updatedAt.toISOString().split("T")[0],
          isToday: isToday,
        };
      });

      return {
        success: true,
        followups: processedFollowups,
      };
    } catch (error) {
      console.error("Error fetching clinic followups:", error);
      throw new Error("فشل في جلب بيانات المتابعات");
    }
  });

// Request a followup
export const requestFollowupProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      veterinarianId: z.number().optional(),
      followupType: z.enum(["post-surgery", "medication", "chronic-condition", "recovery", "checkup"]),
      scheduledDate: z.date(),
      reason: z.string().min(1, "يجب إدخال سبب المتابعة"),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Check if pet exists and get owner info
      const [pet] = await db
        .select({
          id: pets.id,
          ownerId: pets.ownerId,
          name: pets.name,
        })
        .from(pets)
        .where(eq(pets.id, input.petId));

      if (!pet) {
        throw new Error("الحيوان غير موجود");
      }

      // Check if there's already a pending followup request
      const existingRequest = await db
        .select()
        .from(clinicAccessRequests)
        .where(
          and(
            eq(clinicAccessRequests.petId, input.petId),
            eq(clinicAccessRequests.clinicId, input.clinicId),
            eq(clinicAccessRequests.status, "pending"),
            eq(clinicAccessRequests.reason, "followup")
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        throw new Error("يوجد طلب متابعة معلق بالفعل لهذا الحيوان");
      }

      // Check if clinic already has access to the pet
      const existingAccess = await db
        .select()
        .from(approvedClinicAccess)
        .where(
          and(
            eq(approvedClinicAccess.petId, input.petId),
            eq(approvedClinicAccess.clinicId, input.clinicId),
            eq(approvedClinicAccess.isActive, true),
            or(isNull(approvedClinicAccess.expiresAt), gt(approvedClinicAccess.expiresAt, new Date()))
          )
        )
        .limit(1);

      if (existingAccess.length === 0) {
        throw new Error("لا تملك الصلاحية للوصول إلى هذا الحيوان. يرجى طلب الصلاحية أولاً");
      }

      // Create followup request (using expiresAt as scheduled date)
      const fullReason = `متابعة ${getFollowupTypeText(input.followupType)}: ${input.reason}${
        input.notes ? ` - ${input.notes}` : ""
      }`;

      const [followupRequest] = await db
        .insert(clinicAccessRequests)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          veterinarianId: input.veterinarianId,
          reason: fullReason,
          expiresAt: input.scheduledDate, // Using expiresAt as scheduled date
          status: "pending",
        })
        .returning();

      // TODO: Send notification to pet owner
      // await sendNotificationToOwner(pet.ownerId, {
      //   title: "طلب متابعة عيادة",
      //   message: `العيادة تطلب موعد متابعة لحيوانك ${pet.name}`,
      //   data: { requestId: followupRequest.id, petId: input.petId }
      // });

      return {
        success: true,
        request: followupRequest,
        message: "تم إرسال طلب المتابعة إلى مالك الحيوان",
      };
    } catch (error) {
      console.error("Error requesting followup:", error);
      throw new Error(error instanceof Error ? error.message : "فشل في إرسال طلب المتابعة");
    }
  });

// Update followup status (approve/reject)
export const updateFollowupStatusProcedure = protectedProcedure
  .input(
    z.object({
      followupId: z.number(),
      status: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const updateData: any = {
        status: input.status,
        updatedAt: new Date(),
      };

      // Set approval or rejection timestamps and reasons
      if (input.status === "approved") {
        updateData.approvedAt = new Date();
      } else if (input.status === "rejected") {
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = input.rejectionReason;
      }

      await db.update(clinicAccessRequests).set(updateData).where(eq(clinicAccessRequests.id, input.followupId));

      return {
        success: true,
        message: input.status === "approved" ? "تم الموافقة على المتابعة" : "تم رفض المتابعة",
      };
    } catch (error) {
      console.error("Error updating followup status:", error);
      throw new Error("فشل في تحديث حالة المتابعة");
    }
  });

// Reschedule followup
export const rescheduleFollowupProcedure = protectedProcedure
  .input(
    z.object({
      followupId: z.number(),
      newDate: z.date(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db
        .update(clinicAccessRequests)
        .set({
          expiresAt: input.newDate, // Using expiresAt as scheduled date
          updatedAt: new Date(),
        })
        .where(eq(clinicAccessRequests.id, input.followupId));

      return {
        success: true,
        message: "تم تأجيل المتابعة بنجاح",
      };
    } catch (error) {
      console.error("Error rescheduling followup:", error);
      throw new Error("فشل في تأجيل المتابعة");
    }
  });

// Delete followup request
export const deleteFollowupProcedure = protectedProcedure
  .input(
    z.object({
      followupId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db.delete(clinicAccessRequests).where(eq(clinicAccessRequests.id, input.followupId));

      return {
        success: true,
        message: "تم حذف طلب المتابعة بنجاح",
      };
    } catch (error) {
      console.error("Error deleting followup:", error);
      throw new Error("فشل في حذف طلب المتابعة");
    }
  });

// Get followup statistics
export const getFollowupStatsProcedure = protectedProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    try {
      const clinicFollowups = await db
        .select({
          status: clinicAccessRequests.status,
          expiresAt: clinicAccessRequests.expiresAt,
        })
        .from(clinicAccessRequests)
        .where(and(eq(clinicAccessRequests.clinicId, input.clinicId), eq(clinicAccessRequests.reason, "followup")));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        total: clinicFollowups.length,
        pending: clinicFollowups.filter((f) => f.status === "pending").length,
        approved: clinicFollowups.filter((f) => f.status === "approved").length,
        rejected: clinicFollowups.filter((f) => f.status === "rejected").length,
        today: clinicFollowups.filter(
          (f) =>
            f.status === "pending" &&
            f.expiresAt &&
            new Date(f.expiresAt).toISOString().split("T")[0] === today.toISOString().split("T")[0]
        ).length,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error fetching followup stats:", error);
      throw new Error("فشل في جلب إحصائيات المتابعات");
    }
  });

// Helper functions
function getFollowupTypeFromReason(reason: string): string {
  if (reason.includes("بعد العملية") || reason.includes("post-surgery")) return "post-surgery";
  if (reason.includes("علاج دوائي") || reason.includes("medication")) return "medication";
  if (reason.includes("حالة مزمنة") || reason.includes("chronic-condition")) return "chronic-condition";
  if (reason.includes("تعافي") || reason.includes("recovery")) return "recovery";
  if (reason.includes("فحص دوري") || reason.includes("checkup")) return "checkup";
  return "checkup";
}

function getFollowupTypeText(type: string): string {
  switch (type) {
    case "post-surgery":
      return "بعد العملية";
    case "medication":
      return "علاج دوائي";
    case "chronic-condition":
      return "حالة مزمنة";
    case "recovery":
      return "تعافي";
    case "checkup":
      return "فحص دوري";
    default:
      return "متابعة";
  }
}

function getPriorityFromStatus(status: string): string {
  switch (status) {
    case "pending":
      return "high";
    case "approved":
      return "normal";
    case "rejected":
      return "normal";
    default:
      return "normal";
  }
}
