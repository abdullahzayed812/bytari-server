import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { eq, desc, sql } from "drizzle-orm";
import { db, pets, poultryFarms, users, lostPets, adoptionPets, breedingPets } from "../../../../db";

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

      // 1. Get Owned Pets
      const ownedPets = await db
        .select({
          id: pets.id,
          name: pets.name,
          type: pets.type,
          breed: pets.breed,
          age: pets.age,
          gender: pets.gender,
          image: pets.image,
          status: sql<string>`'active'`, // Default status for owned pets
          createdAt: pets.createdAt,
          ownerName: users.name,
          ownerEmail: users.email,
          category: sql<string>`'owned'`,
          isLost: pets.isLost,
          isForBreeding: sql<boolean>`false`,
          reportCount: sql<number>`0`, // Placeholder
        })
        .from(pets)
        .leftJoin(users, eq(users.id, pets.ownerId));

      // 2. Get Lost Pets
      const lostPetsList = await db
        .select({
          id: lostPets.id,
          name: lostPets.name,
          type: lostPets.type,
          breed: lostPets.breed,
          age: lostPets.age,
          gender: lostPets.gender,
          image: lostPets.image,
          status: lostPets.status,
          createdAt: lostPets.createdAt,
          ownerName: users.name,
          ownerEmail: users.email,
          category: sql<string>`'lost'`,
          isLost: sql<boolean>`true`,
          isForBreeding: sql<boolean>`false`,
          reportCount: sql<number>`0`,
        })
        .from(lostPets)
        .leftJoin(users, eq(users.id, lostPets.ownerId));

      // 3. Get Adoption Pets
      const adoptionPetsList = await db
        .select({
          id: adoptionPets.id,
          name: adoptionPets.name,
          type: adoptionPets.type,
          breed: adoptionPets.breed,
          age: adoptionPets.age,
          gender: adoptionPets.gender,
          image: adoptionPets.image,
          status: sql<string>`CASE WHEN ${adoptionPets.isAvailable} THEN 'active' ELSE 'inactive' END`,
          createdAt: adoptionPets.createdAt,
          ownerName: users.name,
          ownerEmail: users.email,
          category: sql<string>`'adoption'`,
          isLost: sql<boolean>`false`,
          isForBreeding: sql<boolean>`false`,
          reportCount: sql<number>`0`,
        })
        .from(adoptionPets)
        .leftJoin(users, eq(users.id, adoptionPets.ownerId));

      // 4. Get Breeding Pets
      const breedingPetsList = await db
        .select({
          id: breedingPets.id,
          name: breedingPets.name,
          type: breedingPets.type,
          breed: breedingPets.breed,
          age: breedingPets.age,
          gender: breedingPets.gender,
          image: breedingPets.image,
          status: sql<string>`CASE WHEN ${breedingPets.isAvailable} THEN 'active' ELSE 'inactive' END`,
          createdAt: breedingPets.createdAt,
          ownerName: users.name,
          ownerEmail: users.email,
          category: sql<string>`'breeding'`,
          isLost: sql<boolean>`false`,
          isForBreeding: sql<boolean>`true`,
          reportCount: sql<number>`0`,
        })
        .from(breedingPets)
        .leftJoin(users, eq(users.id, breedingPets.ownerId));

      // Combine all results
      const allPets = [
        ...ownedPets,
        ...lostPetsList,
        ...adoptionPetsList,
        ...breedingPetsList
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
