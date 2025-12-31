import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { petApprovalRequests, notifications, users, adoptionPets, breedingPets, lostPets } from "../../../../db/schema";
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
      // Lost pet specific fields
      lastSeenLocation: z.string().optional(),
      lastSeenDate: z.date().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      reward: z.number().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      let specificRecord;
      let petId: number;

      // 1️⃣ Insert directly into the specific table based on request type
      if (input.requestType === "adoption") {
        [specificRecord] = await db
          .insert(adoptionPets)
          .values({
            ownerId: input.ownerId,
            name: input.name,
            type: input.type,
            breed: input.breed,
            age: input.age,
            weight: input.weight,
            color: input.color,
            gender: input.gender,
            image: input.image,
            description: input.description,
            images: input.images,
            contactInfo: input.contactInfo,
            location: input.location,
            price: input.price,
            specialRequirements: input.specialRequirements,
            ownershipProof: input.ownershipProof,
            veterinaryCertificate: input.veterinaryCertificate,
            // Set as not available until approved
            isAvailable: false,
          })
          .returning();
        petId = specificRecord.id;
      } else if (input.requestType === "breeding") {
        [specificRecord] = await db
          .insert(breedingPets)
          .values({
            ownerId: input.ownerId,
            name: input.name,
            type: input.type,
            breed: input.breed,
            age: input.age,
            weight: input.weight,
            color: input.color,
            gender: input.gender,
            image: input.image,
            description: input.description,
            images: input.images,
            contactInfo: input.contactInfo,
            location: input.location,
            price: input.price,
            specialRequirements: input.specialRequirements,
            ownershipProof: input.ownershipProof,
            veterinaryCertificate: input.veterinaryCertificate,
            // Set as not available until approved
            isAvailable: false,
          })
          .returning();
        petId = specificRecord.id;
      } else if (input.requestType === "lost_pet") {
        console.log({ input });
        if (!input.lastSeenLocation || !input.lastSeenDate) {
          throw new Error("Last seen location and date are required for lost pets");
        }

        [specificRecord] = await db
          .insert(lostPets)
          .values({
            ownerId: input.ownerId,
            name: input.name,
            type: input.type,
            breed: input.breed,
            age: input.age,
            weight: input.weight,
            color: input.color,
            gender: input.gender,
            image: input.image,
            description: input.description,
            images: input.images,
            contactInfo: input.contactInfo,
            location: input.location,
            lastSeenLocation: input.lastSeenLocation,
            lastSeenDate: input.lastSeenDate,
            latitude: input.latitude,
            longitude: input.longitude,
            reward: input.reward,
            specialRequirements: input.specialRequirements,
            ownershipProof: input.ownershipProof,
            veterinaryCertificate: input.veterinaryCertificate,
            // Set status as pending (will be 'lost' after approval)
            status: "pending",
          })
          .returning();
        petId = specificRecord.id;
      } else {
        throw new Error("Invalid request type");
      }

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
          petId: petId,
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
        message: "تم إرسال طلبك بنجاح وهو الآن في انتظار موافقة الإدارة. سيتم إشعارك عند اتخاذ قرار بشأن الطلب.",
        type: "pet_approval",
        data: JSON.stringify({
          petId: petId,
          requestType: input.requestType,
          approvalRequestId: approvalRequest.id,
        }),
      });

      return {
        success: true,
        pet: specificRecord,
        approvalRequest,
        message: "تم إرسال الطلب بنجاح وهو في انتظار موافقة الإدارة",
      };
    } catch (error) {
      console.error("Error creating pet approval request:", error);
      throw new Error("فشل في إرسال الطلب");
    }
  });

// Get all pending pet approval requests (for admin)
export const getPendingPetApprovalsProcedure = protectedProcedure.query(async () => {
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
        // Owner details
        ownerName: users.name,
        ownerEmail: users.email,
        ownerPhone: users.phone,
      })
      .from(petApprovalRequests)
      .leftJoin(users, eq(petApprovalRequests.ownerId, users.id))
      .where(eq(petApprovalRequests.status, "pending"))
      .orderBy(desc(petApprovalRequests.createdAt));

    // Fetch pet details from the specific table based on request type
    const requestsWithPetDetails = await Promise.all(
      pendingRequests.map(async (request) => {
        let petDetails = null;

        if (request.requestType === "adoption") {
          [petDetails] = await db.select().from(adoptionPets).where(eq(adoptionPets.id, request.petId));
        } else if (request.requestType === "breeding") {
          [petDetails] = await db.select().from(breedingPets).where(eq(breedingPets.id, request.petId));
        } else if (request.requestType === "lost_pet") {
          [petDetails] = await db.select().from(lostPets).where(eq(lostPets.id, request.petId));
        }

        return {
          ...request,
          images: request.images ? JSON.parse(request.images) : [],
          petDetails,
        };
      })
    );

    return {
      success: true,
      requests: requestsWithPetDetails,
    };
  } catch (error) {
    console.error("Error fetching pending pet approvals:", error);
    throw new Error("فشل في جلب طلبات الموافقة");
  }
});

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
          // adminNotes: input.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(petApprovalRequests.id, input.requestId));

      // Update the specific pet table based on request type
      if (input.action === "approve") {
        if (approvalRequest.requestType === "adoption") {
          await db
            .update(adoptionPets)
            .set({
              isAvailable: true,
              updatedAt: new Date(),
            })
            .where(eq(adoptionPets.id, approvalRequest.petId));
        } else if (approvalRequest.requestType === "breeding") {
          await db
            .update(breedingPets)
            .set({
              isAvailable: true,
              updatedAt: new Date(),
            })
            .where(eq(breedingPets.id, approvalRequest.petId));
        } else if (approvalRequest.requestType === "lost_pet") {
          await db
            .update(lostPets)
            .set({
              status: "lost", // Change from 'pending' to 'lost'
              updatedAt: new Date(),
            })
            .where(eq(lostPets.id, approvalRequest.petId));
        }
      } else {
        // If rejected, mark as unavailable or delete (based on your business logic)
        if (approvalRequest.requestType === "adoption") {
          await db
            .update(adoptionPets)
            .set({
              isAvailable: false,
              updatedAt: new Date(),
            })
            .where(eq(adoptionPets.id, approvalRequest.petId));
        } else if (approvalRequest.requestType === "breeding") {
          await db
            .update(breedingPets)
            .set({
              isAvailable: false,
              updatedAt: new Date(),
            })
            .where(eq(breedingPets.id, approvalRequest.petId));
        } else if (approvalRequest.requestType === "lost_pet") {
          await db
            .update(lostPets)
            .set({
              status: "closed", // Mark as closed if rejected
              updatedAt: new Date(),
            })
            .where(eq(lostPets.id, approvalRequest.petId));
        }
      }

      // Send notification to user
      const notificationTitle = input.action === "approve" ? "تمت الموافقة على طلبك" : "تم رفض طلبك";
      const notificationContent =
        input.action === "approve"
          ? `تمت الموافقة على طلبك بنجاح. يمكنك الآن رؤية إعلانك في التطبيق.`
          : `تم رفض طلبك. ${input.rejectionReason ? `السبب: ${input.rejectionReason}` : ""}`;

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
        message: input.action === "approve" ? "تمت الموافقة على الطلب بنجاح" : "تم رفض الطلب",
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
        })
        .from(petApprovalRequests)
        .where(eq(petApprovalRequests.ownerId, input.userId))
        .orderBy(desc(petApprovalRequests.createdAt));

      // Fetch pet details from the specific table based on request type
      const requestsWithPetDetails = await Promise.all(
        userRequests.map(async (request) => {
          let petDetails = null;

          if (request.requestType === "adoption") {
            [petDetails] = await db
              .select({
                name: adoptionPets.name,
                type: adoptionPets.type,
                image: adoptionPets.image,
              })
              .from(adoptionPets)
              .where(eq(adoptionPets.id, request.petId));
          } else if (request.requestType === "breeding") {
            [petDetails] = await db
              .select({
                name: breedingPets.name,
                type: breedingPets.type,
                image: breedingPets.image,
              })
              .from(breedingPets)
              .where(eq(breedingPets.id, request.petId));
          } else if (request.requestType === "lost_pet") {
            [petDetails] = await db
              .select({
                name: lostPets.name,
                type: lostPets.type,
                image: lostPets.image,
              })
              .from(lostPets)
              .where(eq(lostPets.id, request.petId));
          }

          return {
            ...request,
            petName: petDetails?.name,
            petType: petDetails?.type,
            petImage: petDetails?.image,
          };
        })
      );

      return {
        success: true,
        requests: requestsWithPetDetails,
      };
    } catch (error) {
      console.error("Error fetching user pet approvals:", error);
      throw new Error("فشل في جلب طلبات المستخدم");
    }
  });

// Get approval request statistics
export const getPetApprovalStatsProcedure = protectedProcedure.query(async () => {
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
});

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
      let approvedPets: any[] = [];

      if (input.requestType === "lost_pet") {
        // Only lost pets - with proper filtering
        const lostPetsData = await db
          .select({
            id: lostPets.id,
            ownerId: lostPets.ownerId,
            requestType: petApprovalRequests.requestType,
            name: lostPets.name,
            type: lostPets.type,
            breed: lostPets.breed,
            age: lostPets.age,
            weight: lostPets.weight,
            color: lostPets.color,
            gender: lostPets.gender,
            image: lostPets.image,
            description: lostPets.description,
            images: lostPets.images,
            contactInfo: lostPets.contactInfo,
            location: lostPets.location,
            lastSeenLocation: lostPets.lastSeenLocation,
            lastSeenDate: lostPets.lastSeenDate,
            latitude: lostPets.latitude,
            longitude: lostPets.longitude,
            reward: lostPets.reward,
            specialRequirements: lostPets.specialRequirements,
            status: lostPets.status,
            ownerName: users.name,
            ownerPhone: users.phone,
            createdAt: lostPets.createdAt,
          })
          .from(lostPets)
          .leftJoin(petApprovalRequests, eq(lostPets.id, petApprovalRequests.petId))
          .leftJoin(users, eq(lostPets.ownerId, users.id))
          .where(
            and(
              eq(petApprovalRequests.status, "approved"),
              // eq(lostPets.status, "lost"),
              eq(petApprovalRequests.requestType, "lost_pet") // CRITICAL: Add this filter
            )
          )
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(lostPets.createdAt));

        approvedPets = lostPetsData;
      } else {
        // For adoption OR breeding OR both (when no type specified)
        const adoptionQuery = db
          .select({
            id: adoptionPets.id,
            ownerId: adoptionPets.ownerId,
            requestType: petApprovalRequests.requestType,
            name: adoptionPets.name,
            type: adoptionPets.type,
            breed: adoptionPets.breed,
            age: adoptionPets.age,
            image: adoptionPets.image,
            isClosedByOwner: adoptionPets.isClosedByOwner,
            description: adoptionPets.description,
            location: adoptionPets.location,
            price: adoptionPets.price,
            ownerName: users.name,
            ownerPhone: users.phone,
            createdAt: adoptionPets.createdAt,
            isAvailable: adoptionPets.isAvailable,
          })
          .from(adoptionPets)
          .leftJoin(petApprovalRequests, eq(adoptionPets.id, petApprovalRequests.petId))
          .leftJoin(users, eq(adoptionPets.ownerId, users.id))
          .where(
            and(
              eq(petApprovalRequests.status, "approved"),
              eq(adoptionPets.isAvailable, true),
              eq(petApprovalRequests.requestType, "adoption") // CRITICAL: Add this filter
            )
          );

        const breedingQuery = db
          .select({
            id: breedingPets.id,
            ownerId: breedingPets.ownerId,
            requestType: petApprovalRequests.requestType,
            name: breedingPets.name,
            type: breedingPets.type,
            breed: breedingPets.breed,
            age: breedingPets.age,
            image: breedingPets.image,
            isClosedByOwner: breedingPets.isClosedByOwner,
            description: breedingPets.description,
            location: breedingPets.location,
            price: breedingPets.price,
            ownerName: users.name,
            ownerPhone: users.phone,
            createdAt: breedingPets.createdAt,
            isAvailable: breedingPets.isAvailable,
          })
          .from(breedingPets)
          .leftJoin(petApprovalRequests, eq(breedingPets.id, petApprovalRequests.petId))
          .leftJoin(users, eq(breedingPets.ownerId, users.id))
          .where(
            and(
              eq(petApprovalRequests.status, "approved"),
              eq(breedingPets.isAvailable, true),
              eq(petApprovalRequests.requestType, "breeding") // CRITICAL: Add this filter
            )
          );

        // If specific type is requested, filter accordingly
        if (input.requestType === "adoption") {
          approvedPets = await adoptionQuery
            .limit(input.limit)
            .offset(input.offset)
            .orderBy(desc(adoptionPets.createdAt));
        } else if (input.requestType === "breeding") {
          approvedPets = await breedingQuery
            .limit(input.limit)
            .offset(input.offset)
            .orderBy(desc(breedingPets.createdAt));
        } else {
          // No specific type - get both adoption and breeding together
          const [adoptions, breedings] = await Promise.all([adoptionQuery, breedingQuery]);

          approvedPets = [...adoptions, ...breedings]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(input.offset, input.offset + input.limit);
        }
      }

      const pets = approvedPets.map((pet) => ({
        ...pet,
        images: pet.images ? (typeof pet.images === "string" ? JSON.parse(pet.images) : pet.images) : [],
      }));

      return {
        success: true,
        pets,
      };
    } catch (error) {
      console.error("Error fetching approved pets:", error);
      throw new Error("فشل في جلب الحيوانات المعتمدة");
    }
  });
