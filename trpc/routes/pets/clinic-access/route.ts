import { z } from "zod";
import { eq, desc, and, or, gt, isNull, sql } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import {
  db,
  pets,
  users,
  clinics,
  clinicAccessRequests,
  approvedClinicAccess,
  veterinarians,
  notifications,
  clinicStaff,
} from "../../../../db";

// Vet requests access to pet
export const requestClinicAccessProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      veterinarianId: z.number().optional(),
      reason: z.string().min(1, "يجب إدخال سبب الطلب"),
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

      // Check if there's already a pending request
      const existingRequest = await db
        .select()
        .from(clinicAccessRequests)
        .where(
          and(
            eq(clinicAccessRequests.petId, input.petId),
            eq(clinicAccessRequests.clinicId, input.clinicId),
            eq(clinicAccessRequests.status, "pending")
          )
        )
        .limit(1);

      if (existingRequest.length > 0) {
        throw new Error("يوجد طلب وصول معلق بالفعل لهذا الحيوان");
      }

      // Check if access is already approved
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

      if (existingAccess.length > 0) {
        throw new Error("لديك بالفعل صلاحية الوصول إلى هذا الحيوان");
      }

      // Create access request (expires in 7 days if not answered)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [accessRequest] = await db
        .insert(clinicAccessRequests)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          veterinarianId: input.veterinarianId,
          reason: input.reason,
          expiresAt: expiresAt,
          status: "pending",
        })
        .returning();

      // Send notification to pet owner
      await db.insert(notifications).values({
        userId: pet.ownerId,
        title: "طلب صلاحية وصول عيادة",
        message: `العيادة تطلب صلاحية الوصول إلى حيوانك ${pet.name}`,
        type: "clinic_access_request",
        data: { requestId: accessRequest.id, petId: input.petId },
      });

      return {
        success: true,
        request: accessRequest,
        message: "تم إرسال طلب الصلاحية إلى مالك الحيوان",
      };
    } catch (error) {
      console.error("Error requesting clinic access:", error);
      throw new Error(error instanceof Error ? error.message : "فشل في إرسال طلب الصلاحية");
    }
  });

// Owner gets pending access requests
export const getPendingAccessRequestsProcedure = protectedProcedure
  .input(z.object({ petId: z.number() }))
  .query(async ({ input, ctx }) => {
    try {
      // Get requests for pets owned by the current user
      const requests = await db
        .select({
          id: clinicAccessRequests.id,
          petId: clinicAccessRequests.petId,
          petName: pets.name,
          petType: pets.type,
          clinicId: clinicAccessRequests.clinicId,
          clinicName: clinics.name,
          veterinarianName: users.name,
          reason: clinicAccessRequests.reason,
          createdAt: clinicAccessRequests.createdAt,
          expiresAt: clinicAccessRequests.expiresAt,
        })
        .from(clinicAccessRequests)
        .leftJoin(pets, eq(pets.id, clinicAccessRequests.petId))
        .leftJoin(clinics, eq(clinics.id, clinicAccessRequests.clinicId))
        .leftJoin(veterinarians, eq(veterinarians.id, clinicAccessRequests.veterinarianId))
        .leftJoin(users, eq(users.id, veterinarians.userId))
        .where(
          and(
            eq(clinicAccessRequests.status, "pending"),
            eq(clinicAccessRequests.petId, input.petId),
            eq(pets.ownerId, ctx.user.id)
          )
        )
        .orderBy(desc(clinicAccessRequests.createdAt));

      return {
        success: true,
        requests,
      };
    } catch (error) {
      console.error("Error fetching pending access requests:", error);
      throw new Error("فشل في جلب طلبات الصلاحية المعلقة");
    }
  });

// Owner approves access
export const approveClinicAccessProcedure = protectedProcedure
  .input(
    z.object({
      requestId: z.number(),
      accessDuration: z.number().default(365), // Default 1 year access
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Get the access request with pet info
      const [accessRequest] = await db
        .select({
          request: clinicAccessRequests,
          petOwnerId: pets.ownerId,
        })
        .from(clinicAccessRequests)
        .leftJoin(pets, eq(pets.id, clinicAccessRequests.petId))
        .where(and(eq(clinicAccessRequests.id, input.requestId), eq(clinicAccessRequests.status, "pending")));

      if (!accessRequest) {
        throw new Error("طلب الصلاحية غير موجود أو تم معالجته مسبقاً");
      }

      // Verify that the current user is the pet owner
      if (accessRequest.petOwnerId !== ctx.user.id) {
        throw new Error("غير مصرح لك بالموافقة على هذا الطلب");
      }

      // Calculate access expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.accessDuration);

      // Update request status to approved
      await db
        .update(clinicAccessRequests)
        .set({
          status: "approved",
          approvedAt: new Date(),
        })
        .where(eq(clinicAccessRequests.id, input.requestId));

      // Create approved access record
      const [approvedAccess] = await db
        .insert(approvedClinicAccess)
        .values({
          petId: accessRequest.request.petId,
          clinicId: accessRequest.request.clinicId,
          requestId: accessRequest.request.id,
          expiresAt: expiresAt,
          grantedBy: ctx.user.id,
          isActive: true,
        })
        .returning();

      // Send notification to clinic
      const clinic = await db.query.clinics.findFirst({
        where: eq(clinics.id, accessRequest.request.clinicId),
      });

      if (clinic) {
        // Find all vets in the clinic
        const clinicVets = await db
          .select({ id: users.id })
          .from(users)
          .leftJoin(veterinarians, eq(veterinarians.userId, users.id))
          .leftJoin(clinicStaff, eq(clinicStaff.veterinarianId, veterinarians.id))
          .where(eq(clinicStaff.clinicId, clinic.id));

        // Send notification to all vets in the clinic
        for (const vet of clinicVets) {
          await db.insert(notifications).values({
            userId: vet.id,
            title: "تمت الموافقة على طلب الصلاحية",
            message: `تمت الموافقة على طلب الصلاحية للحيوان ${accessRequest.request.petId}`,
            type: "clinic_access_approved",
            data: { requestId: accessRequest.request.id, petId: accessRequest.request.petId },
          });
        }
      }

      return {
        success: true,
        approvedAccess,
        message: "تم منح الصلاحية للعيادة بنجاح",
      };
    } catch (error) {
      console.error("Error approving clinic access:", error);
      throw new Error("فشل في الموافقة على طلب الصلاحية");
    }
  });

// Owner rejects access
export const rejectClinicAccessProcedure = protectedProcedure
  .input(
    z.object({
      requestId: z.number(),
      rejectionReason: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Get the access request with pet info
      const [accessRequest] = await db
        .select({
          request: clinicAccessRequests,
          petOwnerId: pets.ownerId,
        })
        .from(clinicAccessRequests)
        .leftJoin(pets, eq(pets.id, clinicAccessRequests.petId))
        .where(and(eq(clinicAccessRequests.id, input.requestId), eq(clinicAccessRequests.status, "pending")));

      if (!accessRequest) {
        throw new Error("طلب الصلاحية غير موجود أو تم معالجته مسبقاً");
      }

      // Verify that the current user is the pet owner
      if (accessRequest.petOwnerId !== ctx.user.id) {
        throw new Error("غير مصرح لك برفض هذا الطلب");
      }

      // Update request status to rejected
      await db
        .update(clinicAccessRequests)
        .set({
          status: "rejected",
          rejectedAt: new Date(),
          rejectionReason: input.rejectionReason,
        })
        .where(eq(clinicAccessRequests.id, input.requestId));

      return {
        success: true,
        message: "تم رفض طلب الصلاحية",
      };
    } catch (error) {
      console.error("Error rejecting clinic access:", error);
      throw new Error("فشل في رفض طلب الصلاحية");
    }
  });

// Check if clinic has access to a pet
export const checkClinicAccessProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const access = await db
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

      return {
        success: true,
        hasAccess: access.length > 0,
        access: access[0] || null,
      };
    } catch (error) {
      console.error("Error checking clinic access:", error);
      throw new Error("فشل في التحقق من صلاحية الوصول");
    }
  });

// Get my clinic access requests (for veterinarians to see their own requests)
export const getMyAccessRequestsProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number().optional(),
      clinicId: z.number().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const whereConditions = [
        // eq(clinicAccessRequests.clinicId, ctx.user.clinicId!) // Only show requests from current user's clinic
      ];

      if (input.petId) {
        whereConditions.push(eq(clinicAccessRequests.petId, input.petId));
      }

      if (input.clinicId) {
        whereConditions.push(eq(clinicAccessRequests.clinicId, input.clinicId));
      }

      const requests = await db
        .select({
          id: clinicAccessRequests.id,
          petId: clinicAccessRequests.petId,
          petName: pets.name,
          petType: pets.type,
          clinicId: clinicAccessRequests.clinicId,
          clinicName: clinics.name,
          reason: clinicAccessRequests.reason,
          status: clinicAccessRequests.status,
          createdAt: clinicAccessRequests.createdAt,
          approvedAt: clinicAccessRequests.approvedAt,
          rejectedAt: clinicAccessRequests.rejectedAt,
          rejectionReason: clinicAccessRequests.rejectionReason,
          expiresAt: clinicAccessRequests.expiresAt,
        })
        .from(clinicAccessRequests)
        .leftJoin(pets, eq(pets.id, clinicAccessRequests.petId))
        .leftJoin(clinics, eq(clinics.id, clinicAccessRequests.clinicId))
        .where(and(...whereConditions))
        .orderBy(desc(clinicAccessRequests.createdAt));

      return {
        success: true,
        requests,
      };
    } catch (error) {
      console.error("Error fetching my access requests:", error);
      throw new Error("فشل في جلب طلبات الصلاحية");
    }
  });

// Get clinic follow-ups for a pet (using approved access records)
export const getClinicFollowUpsProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const { user } = ctx;

      // Verify the user has access to this pet
      const [pet] = await db
        .select()
        .from(pets)
        .where(and(eq(pets.id, input.petId), eq(pets.ownerId, user.id)));

      if (!pet) {
        throw new Error("Pet not found or access denied");
      }

      // Get approved clinic access with clinic information and activity counts
      const followUps = await db
        .select({
          clinicId: approvedClinicAccess.clinicId,
          clinicName: clinics.name,
        })
        .from(approvedClinicAccess)
        .leftJoin(clinics, eq(clinics.id, approvedClinicAccess.clinicId))
        .leftJoin(clinicAccessRequests, eq(clinicAccessRequests.id, approvedClinicAccess.requestId))
        .where(
          and(
            eq(approvedClinicAccess.petId, input.petId),
            eq(approvedClinicAccess.isActive, true),
            or(isNull(approvedClinicAccess.expiresAt), gt(approvedClinicAccess.expiresAt, new Date()))
          )
        )
        .orderBy(desc(approvedClinicAccess.createdAt));

      return {
        success: true,
        followUps,
      };
    } catch (error) {
      console.error("Error fetching clinic follow-ups:", error);
      throw new Error("Failed to fetch clinic follow-ups");
    }
  });

// Cancel follow-ups for a specific clinic (revoke access)
export const cancelClinicFollowUpsProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const { user } = ctx;

      // Verify the user has access to this pet
      const [pet] = await db
        .select()
        .from(pets)
        .where(and(eq(pets.id, input.petId), eq(pets.ownerId, user.id)));

      if (!pet) {
        throw new Error("Pet not found or access denied");
      }

      // Revoke clinic access
      const result = await db
        .update(approvedClinicAccess)
        .set({
          isActive: false,
          revokedAt: new Date(),
          revokedBy: user.id,
        })
        .where(
          and(
            eq(approvedClinicAccess.petId, input.petId),
            eq(approvedClinicAccess.clinicId, input.clinicId),
            eq(approvedClinicAccess.isActive, true)
          )
        );

      // Also reject any pending follow-up requests from this clinic
      await db
        .update(clinicAccessRequests)
        .set({
          status: "rejected",
          rejectionReason: "تم إلغاء المتابعة من قبل المالك",
          rejectedAt: new Date(),
        })
        .where(
          and(
            eq(clinicAccessRequests.petId, input.petId),
            eq(clinicAccessRequests.clinicId, input.clinicId),
            eq(clinicAccessRequests.status, "pending")
          )
        );

      return {
        success: true,
        message: "تم إلغاء المتابعة مع العيادة بنجاح",
        cancelledCount: result.rowCount,
      };
    } catch (error) {
      console.error("Error cancelling clinic follow-ups:", error);
      throw new Error("Failed to cancel clinic follow-ups");
    }
  });
