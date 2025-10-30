import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eq, desc } from "drizzle-orm";
import { db, pets, poultryFarms, users } from "../../../../db";

/* ------------------------ Input Schemas ------------------------ */
const getUserPetsSchema = z.object({
  userId: z.number(),
});

const getAllPetsForAdminSchema = z.object({
  adminId: z.number(),
});

const getAllFarmsForAdminSchema = z.object({
  adminId: z.number(),
});

/* ================================================================
   🐾 Get pets for specific user (owner only)
   ================================================================= */
export const getUserPetsProcedure = protectedProcedure
  .input(getUserPetsSchema)
  .query(async ({ input, ctx }) => {
    try {
      if (ctx.user?.id !== input.userId) {
        throw new Error("غير مصرح: يمكنك فقط عرض الحيوانات الخاصة بك");
      }

      const userPets = await db
        .select()
        .from(pets)
        .where(eq(pets.ownerId, input.userId))
        .orderBy(desc(pets.createdAt));

      return {
        success: true,
        pets: userPets,
      };
    } catch (error) {
      console.error("Error fetching user pets:", error);
      throw new Error("فشل في جلب الحيوانات الأليفة");
    }
  });

/* ================================================================
   🧑‍💼 Get all pets for admin
   ================================================================= */
export const getAllPetsForAdminProcedure = protectedProcedure
  .input(getAllPetsForAdminSchema)
  .query(async ({ input, ctx }) => {
    try {
      if (ctx.user?.id !== input.adminId) {
        throw new Error("غير مصرح: صلاحيات المدير مطلوبة");
      }

      const allPets = await db
        .select({
          id: pets.id,
          name: pets.name,
          type: pets.type,
          breed: pets.breed,
          age: pets.age,
          weight: pets.weight,
          color: pets.color,
          gender: pets.gender,
          image: pets.image,
          medicalHistory: pets.medicalHistory,
          vaccinations: pets.vaccinations,
          isLost: pets.isLost,
          createdAt: pets.createdAt,
          updatedAt: pets.updatedAt,
          ownerId: pets.ownerId,
          ownerName: users.name,
          ownerEmail: users.email,
        })
        .from(pets)
        .leftJoin(users, eq(users.id, pets.ownerId))
        .orderBy(desc(pets.createdAt));

      return {
        success: true,
        pets: allPets,
      };
    } catch (error) {
      console.error("Error fetching all pets for admin:", error);
      throw new Error("فشل في جلب الحيوانات الأليفة للمدير");
    }
  });

/* ================================================================
   🐓 Get user's own farms
   ================================================================= */
export const getUserFarmsProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    try {
      const userFarms = await db
        .select()
        .from(poultryFarms)
        .where(eq(poultryFarms.ownerId, ctx.user?.id))
        .orderBy(desc(poultryFarms.createdAt));

      return {
        success: true,
        farms: userFarms,
      };
    } catch (error) {
      console.error("Error fetching user farms:", error);
      throw new Error("فشل في جلب المزارع الخاصة بك");
    }
  }
);

/* ================================================================
   🧑‍💼 Get all farms for admin
   ================================================================= */
export const getAllFarmsForAdminProcedure = protectedProcedure
  .input(getAllFarmsForAdminSchema)
  .query(async ({ input, ctx }) => {
    try {
      if (!ctx.user?.isAdmin && ctx.userId !== input.adminId) {
        throw new Error("غير مصرح: صلاحيات المدير مطلوبة");
      }

      const allFarms = await db
        .select({
          id: poultryFarms.id,
          name: poultryFarms.name,
          location: poultryFarms.location,
          farmType: poultryFarms.farmType,
          capacity: poultryFarms.capacity,
          currentPopulation: poultryFarms.currentPopulation,
          establishedDate: poultryFarms.establishedDate,
          licenseNumber: poultryFarms.licenseNumber,
          contactPerson: poultryFarms.contactPerson,
          phone: poultryFarms.phone,
          email: poultryFarms.email,
          facilities: poultryFarms.facilities,
          healthStatus: poultryFarms.healthStatus,
          lastInspection: poultryFarms.lastInspection,
          isActive: poultryFarms.isActive,
          isVerified: poultryFarms.isVerified,
          createdAt: poultryFarms.createdAt,
          updatedAt: poultryFarms.updatedAt,
          ownerId: poultryFarms.ownerId,
          ownerName: users.name,
          ownerEmail: users.email,
        })
        .from(poultryFarms)
        .leftJoin(users, eq(users.id, poultryFarms.ownerId))
        .orderBy(desc(poultryFarms.createdAt));

      return {
        success: true,
        farms: allFarms,
      };
    } catch (error) {
      console.error("Error fetching all farms for admin:", error);
      throw new Error("فشل في جلب المزارع للمدير");
    }
  });
