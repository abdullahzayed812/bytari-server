import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { publicProcedure } from "../../create-context";
import { assignmentRequests, db, poultryFarms, users, veterinarians } from "../../../db";

export const requestVetAssignmentProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      requestedBy: z.number().int().positive(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Requesting vet assignment:", input);

    try {
      const [request] = await db
        .insert(assignmentRequests)
        .values({
          farmId: input.farmId,
          requestType: "vet",
          requestedBy: input.requestedBy,
          status: "pending",
          notes: input.notes,
        })
        .returning();

      console.log("Vet assignment request created");
      return {
        success: true,
        request,
      };
    } catch (error) {
      console.error("Error creating vet assignment request:", error);
      throw new Error("فشل في إرسال طلب تعيين الطبيب");
    }
  });

// ============== GET ALL ASSIGNMENT REQUESTS =============
export const getAssignmentRequestsProcedure = publicProcedure.query(async () => {
  try {
    const owners = alias(users, "owners");
    const requesters = alias(users, "requesters");
    const vetUsers = alias(users, "vetUsers");
    const supervisors = alias(users, "supervisors");

    const requests = await db
      .select({
        id: assignmentRequests.id,
        farmId: poultryFarms.id,
        farmName: poultryFarms.name,
        ownerId: poultryFarms.ownerId,
        ownerName: owners.name,
        requestType: assignmentRequests.requestType,
        isRemovalRequest: assignmentRequests.isRemovalRequest,
        requestedBy: assignmentRequests.requestedBy,
        requesterName: requesters.name,
        status: assignmentRequests.status,
        notes: assignmentRequests.notes,
        createdAt: assignmentRequests.createdAt,

        // Assignment IDs
        assignedVetId: poultryFarms.assignedVetId,
        assignedSupervisorId: poultryFarms.assignedSupervisorId,

        // Vet info from users table
        assignedVetName: vetUsers.name,
        assignedVetPhone: vetUsers.phone,

        // Supervisor info
        assignedSupervisorName: supervisors.name,
        assignedSupervisorPhone: supervisors.phone,
      })
      .from(assignmentRequests)
      .leftJoin(poultryFarms, eq(assignmentRequests.farmId, poultryFarms.id))
      .leftJoin(owners, eq(poultryFarms.ownerId, owners.id))
      .leftJoin(requesters, eq(assignmentRequests.requestedBy, requesters.id))
      // Join veterinarians table, then join to users for vet details
      .leftJoin(veterinarians, eq(poultryFarms.assignedVetId, veterinarians.id))
      .leftJoin(vetUsers, eq(veterinarians.userId, vetUsers.id))
      // Supervisor is directly in users table
      .leftJoin(supervisors, eq(poultryFarms.assignedSupervisorId, supervisors.id))
      .orderBy(desc(assignmentRequests.createdAt));

    return {
      success: true,
      requests,
    };
  } catch (error) {
    console.error("Error fetching assignment requests:", error);
    throw new Error("فشل في جلب طلبات التعيين");
  }
});

// ============== APPROVE ASSIGNMENT REQUEST =============
export const approveAssignmentRequestProcedure = publicProcedure
  .input(
    z.object({
      assignmentRequestId: z.number().int().positive(),
      vetId: z.number().int().positive().optional(),
      supervisorId: z.number().int().positive().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // First, get the request to check its type
      const [request] = await db
        .select()
        .from(assignmentRequests)
        .where(eq(assignmentRequests.id, input.assignmentRequestId))
        .limit(1);

      if (!request) {
        throw new Error("لم يتم العثور على الطلب");
      }

      // 🔹 Handle normal vet assignment
      if (request.requestType === "vet" && input.vetId) {
        const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.id, input.vetId)).limit(1);

        if (!vet) {
          throw new Error("الطبيب البيطري غير موجود");
        }

        await db.update(poultryFarms).set({ assignedVetId: input.vetId }).where(eq(poultryFarms.id, request.farmId));

        console.log(`✅ Vet ${input.vetId} assigned to farm ${request.farmId}`);
      }

      // 🔹 Handle normal supervisor assignment
      else if (request.requestType === "supervisor" && input.supervisorId) {
        const [supervisor] = await db.select().from(users).where(eq(users.id, input.supervisorId)).limit(1);

        if (!supervisor) {
          throw new Error("المشرف غير موجود");
        }

        await db
          .update(poultryFarms)
          .set({ assignedSupervisorId: input.supervisorId })
          .where(eq(poultryFarms.id, request.farmId));

        console.log(`✅ Supervisor ${input.supervisorId} assigned to farm ${request.farmId}`);
      }

      // 🔹 Handle vet removal requests
      else if (request.requestType === "removeVet" || (request.isRemovalRequest && request.requestType === "vet")) {
        await db.update(poultryFarms).set({ assignedVetId: null }).where(eq(poultryFarms.id, request.farmId));

        console.log(`🗑️ Vet removed from farm ${request.farmId}`);
      }

      // 🔹 Handle supervisor removal requests
      else if (
        request.requestType === "removeSupervisor" ||
        (request.isRemovalRequest && request.requestType === "supervisor")
      ) {
        await db.update(poultryFarms).set({ assignedSupervisorId: null }).where(eq(poultryFarms.id, request.farmId));

        console.log(`🗑️ Supervisor removed from farm ${request.farmId}`);
      }

      // 🔹 Finally, mark request as approved
      const [updatedRequest] = await db
        .update(assignmentRequests)
        .set({ status: "approved" })
        .where(eq(assignmentRequests.id, input.assignmentRequestId))
        .returning();

      return {
        success: true,
        request: updatedRequest,
      };
    } catch (error) {
      console.error("Error approving assignment request:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("فشل في الموافقة على طلب التعيين");
    }
  });

// ============== REJECT ASSIGNMENT REQUEST =============
export const rejectAssignmentRequestProcedure = publicProcedure
  .input(
    z.object({
      assignmentRequestId: z.number().int().positive(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [request] = await db
        .update(assignmentRequests)
        .set({ status: "rejected" })
        .where(eq(assignmentRequests.id, input.assignmentRequestId))
        .returning();

      return {
        success: true,
        request,
      };
    } catch (error) {
      console.error("Error rejecting assignment request:", error);
      throw new Error("فشل في رفض طلب التعيين");
    }
  });

// ============== REQUEST SUPERVISOR ASSIGNMENT =============
export const requestSupervisorAssignmentProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      requestedBy: z.number().int().positive(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Requesting supervisor assignment:", input);

    try {
      const [request] = await db
        .insert(assignmentRequests)
        .values({
          farmId: input.farmId,
          requestType: "supervisor",
          requestedBy: input.requestedBy,
          status: "pending",
          notes: input.notes,
        })
        .returning();

      console.log("Supervisor assignment request created");
      return {
        success: true,
        request,
      };
    } catch (error) {
      console.error("Error creating supervisor assignment request:", error);
      throw new Error("فشل في إرسال طلب الإشراف");
    }
  });

// ============== REQUEST REMOVAL ==============
export const requestRemovalProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      requestedBy: z.number().int().positive(),
      requestType: z.enum(["vet", "supervisor", "removeVet", "removeSupervisor"]),
      targetUserId: z.number().int().positive(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Requesting removal:", input);

    try {
      const [request] = await db
        .insert(assignmentRequests)
        .values({
          farmId: input.farmId,
          requestType: input.requestType,
          requestedBy: input.requestedBy,
          isRemovalRequest: true,
          targetUserId: input.targetUserId,
          status: "pending",
          notes: input.notes,
        })
        .returning();

      console.log("Removal request created");
      return {
        success: true,
        request,
      };
    } catch (error) {
      console.error("Error creating removal request:", error);
      throw new Error("فشل في إرسال طلب الإزالة");
    }
  });

// ============== REMOVE VET FROM FARM ==============
export const removeVetProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Removing vet from farm:", input);

    try {
      await db.update(poultryFarms).set({ assignedVetId: null }).where(eq(poultryFarms.id, input.farmId));

      console.log("Vet removed from farm successfully");
      return {
        success: true,
        message: "تم إلغاء تعيين الطبيب البيطري بنجاح",
      };
    } catch (error) {
      console.error("Error removing vet:", error);
      throw new Error("فشل في إلغاء تعيين الطبيب البيطري");
    }
  });

// ============== REMOVE SUPERVISOR FROM FARM ==============
export const removeSupervisorProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Removing supervisor from farm:", input);

    try {
      await db.update(poultryFarms).set({ assignedSupervisorId: null }).where(eq(poultryFarms.id, input.farmId));

      console.log("Supervisor removed from farm successfully");
      return {
        success: true,
        message: "تم إلغاء تعيين المشرف بنجاح",
      };
    } catch (error) {
      console.error("Error removing supervisor:", error);
      throw new Error("فشل في إلغاء تعيين المشرف");
    }
  });
