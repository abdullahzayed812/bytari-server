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
    // Create aliases for user joins
    const owners = alias(users, "owners");
    const requesters = alias(users, "requesters");
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

        // Assignment info from farm
        assignedVetId: poultryFarms?.assignedVetId ?? null,
        assignedSupervisorId: poultryFarms?.assignedSupervisorId ?? null,

        // Vet info
        assignedVetName: veterinarians?.name ?? null,
        assignedVetPhone: veterinarians?.phone ?? null,

        // Supervisor info
        assignedSupervisorName: supervisors?.name ?? null,
        assignedSupervisorPhone: supervisors?.phone ?? null,
      })
      .from(assignmentRequests)
      .leftJoin(poultryFarms, eq(assignmentRequests.farmId, poultryFarms.id))
      .leftJoin(owners, eq(poultryFarms.ownerId, owners.id))
      .leftJoin(requesters, eq(assignmentRequests.requestedBy, requesters.id))
      .leftJoin(veterinarians, eq(poultryFarms.assignedVetId, veterinarians.id))
      .leftJoin(supervisors, eq(poultryFarms.assignedSupervisorId, supervisors.id))
      .orderBy(desc(assignmentRequests.createdAt));

    const transformed = requests.map((req) => ({
      id: req.id,
      farmId: req.farmId,
      farmName: req.farmName,
      ownerName: req.ownerName,
      requestedBy: req.requestedBy,
      requesterName: req.requesterName,
      requestType:
        req.isRemovalRequest === true
          ? `removal_${req.requestType}`
          : req.requestType === "vet"
          ? "vet_assignment"
          : req.requestType === "supervisor"
          ? "supervision"
          : "general",
      status: req.status,
      notes: req.notes || "",
      createdAt: req.createdAt,

      // Assignment info
      assignedVetId: req.assignedVetId,
      assignedVetName: req.assignedVetName,
      assignedVetPhone: req.assignedVetPhone,
      assignedSupervisorId: req.assignedSupervisorId,
      assignedSupervisorName: req.assignedSupervisorName,
      assignedSupervisorPhone: req.assignedSupervisorPhone,
    }));

    return {
      success: true,
      requests: transformed,
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
      const [request] = await db
        .update(assignmentRequests)
        .set({ status: "approved" })
        .where(eq(assignmentRequests.id, input.assignmentRequestId))
        .returning();

      if (request.requestType === "vet" && input.vetId) {
        await db.update(poultryFarms).set({ assignedVetId: input.vetId }).where(eq(poultryFarms.id, request.farmId));
      } else if (request.requestType === "supervisor" && input.supervisorId) {
        await db
          .update(poultryFarms)
          .set({ assignedSupervisorId: input.supervisorId })
          .where(eq(poultryFarms.id, request.farmId));
      }

      return {
        success: true,
        request,
      };
    } catch (error) {
      console.error("Error approving assignment request:", error);
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
      requestType: z.enum(["vet", "supervisor"]),
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
