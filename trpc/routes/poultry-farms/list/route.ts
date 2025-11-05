import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryFarms, veterinarians, users, poultryBatches, poultryDailyData } from "../../../../db/schema";
import { eq, and, desc } from "drizzle-orm";

export const listPoultryFarmsProcedure = publicProcedure
  .input(
    z.object({
      ownerId: z.number().int().positive().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .query(async ({ input }) => {
    console.log("Listing poultry farms:", input);

    try {
      const conditions = [];
      if (input.ownerId) {
        conditions.push(eq(poultryFarms.ownerId, input.ownerId));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(poultryFarms.isActive, input.isActive));
      }

      // Query farms with owner information
      const farms = await db
        .select({
          // Farm fields
          id: poultryFarms.id,
          name: poultryFarms.name,
          location: poultryFarms.location,
          address: poultryFarms.address,
          description: poultryFarms.description,
          farmType: poultryFarms.farmType,
          capacity: poultryFarms.capacity,
          currentPopulation: poultryFarms.currentPopulation,
          totalArea: poultryFarms.totalArea,
          establishedDate: poultryFarms.establishedDate,
          licenseNumber: poultryFarms.licenseNumber,
          contactPerson: poultryFarms.contactPerson,
          phone: poultryFarms.phone,
          email: poultryFarms.email,
          facilities: poultryFarms.facilities,
          healthStatus: poultryFarms.healthStatus,
          lastInspection: poultryFarms.lastInspection,
          images: poultryFarms.images,
          status: poultryFarms.status,
          assignedVetId: poultryFarms.assignedVetId,
          assignedSupervisorId: poultryFarms.assignedSupervisorId,
          isActive: poultryFarms.isActive,
          isVerified: poultryFarms.isVerified,
          createdAt: poultryFarms.createdAt,
          updatedAt: poultryFarms.updatedAt,

          // Owner fields
          ownerId: users.id,
          ownerName: users.name,
          ownerEmail: users.email,
        })
        .from(poultryFarms)
        .leftJoin(users, eq(poultryFarms.ownerId, users.id))
        .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined);

      console.log("Poultry farms retrieved successfully:", farms.length);

      return {
        success: true,
        farms: farms.map((farm) => ({
          id: farm.id,
          name: farm.name,
          location: farm.location,
          address: farm.address,
          description: farm.description,
          farmType: farm.farmType,
          capacity: farm.capacity,
          currentPopulation: farm.currentPopulation,
          totalArea: farm.totalArea,
          establishedDate: farm.establishedDate,
          licenseNumber: farm.licenseNumber,
          contactPerson: farm.contactPerson,
          phone: farm.phone,
          email: farm.email,
          facilities: farm.facilities || [],
          healthStatus: farm.healthStatus,
          lastInspection: farm.lastInspection,
          images: farm.images ? JSON.parse(farm.images) : [],
          status: farm.status,
          assignedVetId: farm.assignedVetId,
          assignedSupervisorId: farm.assignedSupervisorId,
          isActive: farm.isActive,
          isVerified: farm.isVerified,
          createdAt: farm.createdAt,
          updatedAt: farm.updatedAt,
          owner: {
            id: farm.ownerId,
            name: farm.ownerName,
            email: farm.ownerEmail,
          },
        })),
      };
    } catch (error) {
      console.error("Error listing poultry farms:", error);
      throw new Error("فشل في جلب قائمة حقول الدواجن");
    }
  });

// ============== GET POULTRY FARM DETAILS ==============
export const getPoultryFarmDetailsProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
    })
  )
  .query(async ({ input }) => {
    console.log("Getting poultry farm details:", input);

    try {
      // Get farm basic info
      const [farm] = await db
        .select({
          id: poultryFarms.id,
          ownerId: poultryFarms.ownerId,
          name: poultryFarms.name,
          location: poultryFarms.location,
          address: poultryFarms.address,
          description: poultryFarms.description,
          totalArea: poultryFarms.totalArea,
          capacity: poultryFarms.capacity,
          status: poultryFarms.status,
          assignedVetId: poultryFarms.assignedVetId,
          assignedSupervisorId: poultryFarms.assignedSupervisorId,
          createdAt: poultryFarms.createdAt,
          updatedAt: poultryFarms.updatedAt,
        })
        .from(poultryFarms)
        .where(eq(poultryFarms.id, input.farmId));

      if (!farm) {
        throw new Error("حقل الدواجن غير موجود");
      }

      // Get assigned vet details
      let assignedVet = null;
      let assignedVetName = null;
      let assignedVetPhone = null;

      if (farm.assignedVetId) {
        const [vet] = await db
          .select({
            id: veterinarians.id,
            userId: veterinarians.userId,
            licenseNumber: veterinarians.licenseNumber,
            specialization: veterinarians.specialization,
            userName: users.name,
            userPhone: users.phone,
            userEmail: users.email,
          })
          .from(veterinarians)
          .leftJoin(users, eq(veterinarians.userId, users.id))
          .where(eq(veterinarians.id, farm.assignedVetId));

        if (vet) {
          assignedVet = vet;
          assignedVetName = vet.userName;
          assignedVetPhone = vet.userPhone;
        }
      }

      // Get assigned supervisor details
      let assignedSupervisor = null;
      let assignedSupervisorName = null;
      let assignedSupervisorPhone = null;

      if (farm.assignedSupervisorId) {
        const [supervisor] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
          })
          .from(users)
          .where(eq(users.id, farm.assignedSupervisorId));

        if (supervisor) {
          assignedSupervisor = supervisor;
          assignedSupervisorName = supervisor.name;
          assignedSupervisorPhone = supervisor.phone;
        }
      }

      // Get current active batch
      const [currentBatch] = await db
        .select()
        .from(poultryBatches)
        .where(and(eq(poultryBatches.farmId, input.farmId), eq(poultryBatches.status, "active")))
        .orderBy(desc(poultryBatches.createdAt))
        .limit(1);

      // Get current batch daily data if exists
      let currentBatchDailyData = [];
      if (currentBatch) {
        currentBatchDailyData = await db
          .select()
          .from(poultryDailyData)
          .where(eq(poultryDailyData.batchId, currentBatch.id))
          .orderBy(poultryDailyData.dayNumber);
      }

      // Get completed/sold batches
      const completedBatches = await db
        .select()
        .from(poultryBatches)
        .where(and(eq(poultryBatches.farmId, input.farmId), eq(poultryBatches.status, "sold")))
        .orderBy(desc(poultryBatches.endDate));

      // Get daily data for each completed batch
      const completedBatchesWithData = await Promise.all(
        completedBatches.map(async (batch) => {
          const dailyData = await db
            .select()
            .from(poultryDailyData)
            .where(eq(poultryDailyData.batchId, batch.id))
            .orderBy(poultryDailyData.dayNumber);

          return {
            ...batch,
            days: dailyData,
          };
        })
      );

      console.log("Poultry farm details retrieved successfully");

      return {
        success: true,
        farm: {
          ...farm,
          assignedVetId: farm.assignedVetId,
          assignedVetName,
          assignedVetPhone,
          assignedSupervisorId: farm.assignedSupervisorId,
          assignedSupervisorName,
          assignedSupervisorPhone,
        },
        currentBatch: currentBatch
          ? {
              ...currentBatch,
              days: currentBatchDailyData,
            }
          : null,
        completedBatches: completedBatchesWithData,
      };
    } catch (error) {
      console.error("Error getting poultry farm details:", error);
      throw new Error("فشل في جلب تفاصيل حقل الدواجن");
    }
  });
