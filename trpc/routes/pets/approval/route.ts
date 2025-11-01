import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db } from "../../../../db";
import {
  pets,
  petApprovalRequests,
  notifications,
  users,
  petApprovals,
} from "../../../../db/schema";
import { eq, and, desc } from "drizzle-orm";

// Create pet approval request
export const createPetApprovalProcedure = publicProcedure
  .input(
    z.object({
      name: z.string(),
      type: z.string(),
      breed: z.string().optional(),
      age: z.number().optional(),
      weight: z.number().optional(),
      color: z.string().optional(),
      gender: z.string().optional(),
      image: z.string().optional(),
      ownershipProof: z.string().optional(),
      veterinaryCertificate: z.string().optional(),
      ownerId: z.number(),
      requestType: z.enum(["adoption", "breeding", "lost_pet"]),
      description: z.string().optional(),
      images: z.array(z.string()).optional(),
      contactInfo: z.string().optional(),
      location: z.string().optional(),
      price: z.number().optional(),
      specialRequirements: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // 1️⃣ Insert into pet_approvals instead of pets
      const [petApproval] = await db
        .insert(petApprovals)
        .values({
          userId: input.ownerId,
          petName: input.name,
          petType: input.type,
          petBreed: input.breed,
          petAge: input.age,
          petWeight: input.weight,
          petColor: input.color,
          petGender: input.gender,
          petImage: input.image,
          ownershipProof: input.ownershipProof,
          veterinaryCertificate: input.veterinaryCertificate,
        })
        .returning();

      // 2️⃣ Create approval request
      const title =
        input.requestType === "adoption"
          ? `طلب تبني - ${input.name}`
          : input.requestType === "breeding"
          ? `طلب تزويج - ${input.name}`
          : `بلاغ حيوان مفقود - ${input.name}`;

      const [approvalRequest] = await db
        .insert(petApprovalRequests)
        .values({
          petId: petApproval.id,
          ownerId: input.ownerId,
          requestType: input.requestType,
          title,
          description: input.description,
          images: input.images ? JSON.stringify(input.images) : null,
          contactInfo: input.contactInfo,
          location: input.location,
          price: input.price,
          specialRequirements: input.specialRequirements,
        })
        .returning();

      // 3️⃣ Send user notification
      await db.insert(notifications).values({
        userId: input.ownerId,
        title: "تم إرسال الطلب",
        message:
          "تم إرسال طلبك بنجاح وهو الآن في انتظار موافقة الإدارة. سيتم إشعارك عند اتخاذ قرار بشأن الطلب.",
        type: "pet_approval",
        data: JSON.stringify({
          petApprovalId: petApproval.id,
          requestType: input.requestType,
          approvalRequestId: approvalRequest.id,
        }),
      });

      return {
        success: true,
        petApproval,
        approvalRequest,
        message: "تم إرسال الطلب بنجاح وهو في انتظار موافقة الإدارة",
      };
    } catch (error) {
      console.error("Error creating pet approval request:", error);
      throw new Error("فشل في إرسال الطلب");
    }
  });

// Get all pending pet approval requests (for admin)
export const getPendingPetApprovalsProcedure = protectedProcedure.query(
  async () => {
    try {
      const pendingRequests = await db
        .select({
          id: petApprovalRequests.id,
          petId: petApprovalRequests.petId,
          ownerId: petApprovalRequests.ownerId,
          requestType: petApprovalRequests.requestType,
          title: petApprovalRequests.title,
          description: petApprovalRequests.description,
          images: petApprovalRequests.images,
          contactInfo: petApprovalRequests.contactInfo,
          location: petApprovalRequests.location,
          price: petApprovalRequests.price,
          specialRequirements: petApprovalRequests.specialRequirements,
          status: petApprovalRequests.status,
          priority: petApprovalRequests.priority,
          createdAt: petApprovalRequests.createdAt,
          // Pet details
          petName: pets.name,
          petType: pets.type,
          petBreed: pets.breed,
          petAge: pets.age,
          petColor: pets.color,
          petGender: pets.gender,
          petImage: pets.image,
          // Owner details
          ownerName: users.name,
          ownerEmail: users.email,
          ownerPhone: users.phone,
        })
        .from(petApprovalRequests)
        .leftJoin(pets, eq(petApprovalRequests.petId, pets.id))
        .leftJoin(users, eq(petApprovalRequests.ownerId, users.id))
        .where(eq(petApprovalRequests.status, "pending"))
        .orderBy(desc(petApprovalRequests.createdAt));

      let requests = pendingRequests.map((request) => ({
        ...request,
        images: request.images ? JSON.parse(request.images) : [],
      }));

      return {
        success: true,
        requests,
      };
    } catch (error) {
      console.error("Error fetching pending pet approvals:", error);
      throw new Error("فشل في جلب طلبات الموافقة");
    }
  }
);

// Approve or reject pet approval request
export const reviewPetApprovalProcedure = protectedProcedure
  .input(
    z.object({
      requestId: z.number(),
      action: z.enum(["approve", "reject"]),
      rejectionReason: z.string().optional(),
      adminNotes: z.string().optional(),
      reviewerId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Get the approval request
      const [approvalRequest] = await db
        .select()
        .from(petApprovalRequests)
        .where(eq(petApprovalRequests.id, input.requestId));

      if (!approvalRequest) {
        throw new Error("طلب الموافقة غير موجود");
      }

      // Update approval request status
      await db
        .update(petApprovalRequests)
        .set({
          status: input.action === "approve" ? "approved" : "rejected",
          reviewedBy: input.reviewerId,
          reviewedAt: new Date(),
          rejectionReason: input.rejectionReason,
          adminNotes: input.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(petApprovalRequests.id, input.requestId));

      // Send notification to user
      const notificationTitle =
        input.action === "approve" ? "تمت الموافقة على طلبك" : "تم رفض طلبك";
      const notificationContent =
        input.action === "approve"
          ? `تمت الموافقة على طلبك بنجاح. يمكنك الآن رؤية إعلانك في التطبيق.`
          : `تم رفض طلبك. ${
              input.rejectionReason ? `السبب: ${input.rejectionReason}` : ""
            }`;

      await db.insert(notifications).values({
        userId: approvalRequest.ownerId,
        title: notificationTitle,
        message: notificationContent,
        type: "pet_approval_result",
        data: JSON.stringify({
          petId: approvalRequest.petId,
          requestType: approvalRequest.requestType,
          action: input.action,
          rejectionReason: input.rejectionReason,
        }),
      });

      return {
        success: true,
        message:
          input.action === "approve"
            ? "تمت الموافقة على الطلب بنجاح"
            : "تم رفض الطلب",
      };
    } catch (error) {
      console.error("Error reviewing pet approval:", error);
      throw new Error("فشل في مراجعة الطلب");
    }
  });

// Get user's pet approval requests
export const getUserPetApprovalsProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const userRequests = await db
        .select({
          id: petApprovalRequests.id,
          petId: petApprovalRequests.petId,
          requestType: petApprovalRequests.requestType,
          title: petApprovalRequests.title,
          description: petApprovalRequests.description,
          status: petApprovalRequests.status,
          rejectionReason: petApprovalRequests.rejectionReason,
          createdAt: petApprovalRequests.createdAt,
          reviewedAt: petApprovalRequests.reviewedAt,
          // Pet details
          petName: pets.name,
          petType: pets.type,
          petImage: pets.image,
        })
        .from(petApprovalRequests)
        .leftJoin(pets, eq(petApprovalRequests.petId, pets.id))
        .where(eq(petApprovalRequests.ownerId, input.userId))
        .orderBy(desc(petApprovalRequests.createdAt));

      return {
        success: true,
        requests: userRequests,
      };
    } catch (error) {
      console.error("Error fetching user pet approvals:", error);
      throw new Error("فشل في جلب طلبات المستخدم");
    }
  });

// Get approval request statistics
export const getPetApprovalStatsProcedure = protectedProcedure.query(
  async () => {
    try {
      const stats = await db
        .select({
          status: petApprovalRequests.status,
          count: petApprovalRequests.id,
        })
        .from(petApprovalRequests);

      const statsMap = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0,
      };

      stats.forEach((stat) => {
        if (stat.status === "pending") statsMap.pending++;
        else if (stat.status === "approved") statsMap.approved++;
        else if (stat.status === "rejected") statsMap.rejected++;
        statsMap.total++;
      });

      return {
        success: true,
        stats: statsMap,
      };
    } catch (error) {
      console.error("Error fetching pet approval stats:", error);
      throw new Error("فشل في جلب إحصائيات الطلبات");
    }
  }
);

// Get approved pets for public display
export const getApprovedPetsProcedure = publicProcedure
  .input(
    z.object({
      requestType: z.enum(["adoption", "breeding", "lost_pet"]).optional(),
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      console.log("getApprovedPets called with input:", input);

      // Build where conditions
      const whereConditions = [eq(petApprovalRequests.status, "approved")];

      if (input.requestType) {
        whereConditions.push(
          eq(petApprovalRequests.requestType, input.requestType)
        );
      }

      console.log("Where conditions:", whereConditions.length);

      let baseQuery = db
        .select({
          id: petApprovalRequests.id,
          petId: petApprovalRequests.petId,
          ownerId: petApprovalRequests.ownerId,
          requestType: petApprovalRequests.requestType,
          title: petApprovalRequests.title,
          description: petApprovalRequests.description,
          images: petApprovalRequests.images,
          contactInfo: petApprovalRequests.contactInfo,
          location: petApprovalRequests.location,
          price: petApprovalRequests.price,
          specialRequirements: petApprovalRequests.specialRequirements,
          createdAt: petApprovalRequests.createdAt,
          // Pet details
          petName: pets.name,
          petType: pets.type,
          petBreed: pets.breed,
          petAge: pets.age,
          petColor: pets.color,
          petGender: pets.gender,
          petImage: pets.image,
          // Owner details
          ownerName: users.name,
          ownerPhone: users.phone,
        })
        .from(petApprovalRequests)
        .leftJoin(pets, eq(petApprovalRequests.petId, pets.id))
        .leftJoin(users, eq(petApprovalRequests.ownerId, users.id));

      // Apply where conditions and execute query
      let approvedPets;
      if (whereConditions.length > 1) {
        approvedPets = await baseQuery
          .where(and(...whereConditions))
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(petApprovalRequests.createdAt));
      } else if (whereConditions.length === 1) {
        approvedPets = await baseQuery
          .where(whereConditions[0])
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(petApprovalRequests.createdAt));
      } else {
        approvedPets = await baseQuery
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(petApprovalRequests.createdAt));
      }

      console.log("Found approved pets:", approvedPets.length);

      // If no approved pets found, let's check if there are any pets at all
      if (approvedPets.length === 0) {
        return {
          success: true,
          pets: [],
        };
      }

      return {
        success: true,
        pets: approvedPets.map((pet) => ({
          ...pet,
          images: pet.images ? JSON.parse(pet.images) : [],
        })),
      };
    } catch (error) {
      console.error("Error fetching approved pets:", error);
      throw new Error("فشل في جلب الحيوانات المعتمدة");
    }
  });
