import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../../create-context";
import { db, pets, users, lostPets, adoptionPets, breedingPets } from "../../../../db";
import { eq, like, or, sql } from "drizzle-orm";

// Get pet profile for admin editing
export const getPetProfileProcedure = publicProcedure
  .input(
    z.object({
      petId: z.number(),
      type: z.enum(["owned", "lost", "adoption", "breeding"]).default("owned"),
      // adminId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      let pet;

      if (input.type === "owned") {
        pet = await db
          .select({
            id: pets.id,
            ownerId: pets.ownerId,
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
            ownerName: users.name,
            ownerEmail: users.email,
          })
          .from(pets)
          .innerJoin(users, eq(pets.ownerId, users.id))
          .where(eq(pets.id, input.petId))
          .limit(1);
      } else if (input.type === "lost") {
        pet = await db
          .select({
            id: lostPets.id,
            ownerId: lostPets.ownerId,
            name: lostPets.name,
            type: lostPets.type,
            breed: lostPets.breed,
            age: lostPets.age,
            weight: lostPets.weight,
            color: lostPets.color,
            gender: lostPets.gender,
            image: lostPets.image,
            status: lostPets.status,
            createdAt: lostPets.createdAt,
            updatedAt: lostPets.updatedAt,
            ownerName: users.name,
            ownerEmail: users.email,
            // Specific fields
            lastSeenLocation: lostPets.lastSeenLocation,
            reward: lostPets.reward,
          })
          .from(lostPets)
          .innerJoin(users, eq(lostPets.ownerId, users.id))
          .where(eq(lostPets.id, input.petId))
          .limit(1);
      } else if (input.type === "adoption") {
        pet = await db
          .select({
            id: adoptionPets.id,
            ownerId: adoptionPets.ownerId,
            name: adoptionPets.name,
            type: adoptionPets.type,
            breed: adoptionPets.breed,
            age: adoptionPets.age,
            weight: adoptionPets.weight,
            color: adoptionPets.color,
            gender: adoptionPets.gender,
            image: adoptionPets.image,
            status: sql<string>`CASE WHEN ${adoptionPets.isAvailable} THEN 'active' ELSE 'inactive' END`,
            createdAt: adoptionPets.createdAt,
            updatedAt: adoptionPets.updatedAt,
            ownerName: users.name,
            ownerEmail: users.email,
            // Specific fields
            price: adoptionPets.price,
          })
          .from(adoptionPets)
          .innerJoin(users, eq(adoptionPets.ownerId, users.id))
          .where(eq(adoptionPets.id, input.petId))
          .limit(1);
      } else if (input.type === "breeding") {
        pet = await db
          .select({
            id: breedingPets.id,
            ownerId: breedingPets.ownerId,
            name: breedingPets.name,
            type: breedingPets.type,
            breed: breedingPets.breed,
            age: breedingPets.age,
            weight: breedingPets.weight,
            color: breedingPets.color,
            gender: breedingPets.gender,
            image: breedingPets.image,
            status: sql<string>`CASE WHEN ${breedingPets.isAvailable} THEN 'active' ELSE 'inactive' END`,
            createdAt: breedingPets.createdAt,
            updatedAt: breedingPets.updatedAt,
            ownerName: users.name,
            ownerEmail: users.email,
            // Specific fields
            price: breedingPets.price,
          })
          .from(breedingPets)
          .innerJoin(users, eq(breedingPets.ownerId, users.id))
          .where(eq(breedingPets.id, input.petId))
          .limit(1);
      }

      if (!pet || pet.length === 0) {
        throw new Error("الحيوان غير موجود");
      }

      return pet[0];
    } catch (error) {
      console.error("Error getting pet profile:", error);
      throw new Error("فشل في جلب بيانات الحيوان");
    }
  });

// Update pet profile by admin
export const updatePetProfileProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      adminId: z.number(),
      type: z.enum(["owned", "lost", "adoption", "breeding"]).default("owned"),
      name: z.string().min(1),
      typeStr: z.string(), // Renamed from 'type' to avoid conflict
      breed: z.string().optional(),
      age: z.number().optional(),
      weight: z.number().optional(),
      color: z.string().optional(),
      gender: z.enum(["male", "female"]).optional(),
      image: z.string().optional(),
      medicalHistory: z.string().optional(),
      vaccinations: z.string().optional(),
      isLost: z.boolean().optional(),
      status: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      let updatedPet;

      if (input.type === "owned") {
        updatedPet = await db
          .update(pets)
          .set({
            name: input.name,
            type: input.typeStr,
            breed: input.breed,
            age: input.age,
            weight: input.weight,
            color: input.color,
            gender: input.gender,
            image: input.image,
            medicalHistory: input.medicalHistory,
            vaccinations: input.vaccinations ? JSON.parse(input.vaccinations) : undefined,
            isLost: input.isLost || false,
            updatedAt: new Date(),
          })
          .where(eq(pets.id, input.petId))
          .returning();
      } else if (input.type === "lost") {
        updatedPet = await db
          .update(lostPets)
          .set({
            name: input.name,
            type: input.typeStr,
            breed: input.breed,
            age: input.age,
            weight: input.weight,
            color: input.color,
            gender: input.gender,
            image: input.image,
            status: input.status,
            updatedAt: new Date(),
          })
          .where(eq(lostPets.id, input.petId))
          .returning();
      } else if (input.type === "adoption") {
        updatedPet = await db
          .update(adoptionPets)
          .set({
            name: input.name,
            type: input.typeStr,
            breed: input.breed,
            age: input.age,
            weight: input.weight,
            color: input.color,
            gender: input.gender,
            image: input.image,
            isAvailable: input.status === 'active',
            updatedAt: new Date(),
          })
          .where(eq(adoptionPets.id, input.petId))
          .returning();
      } else if (input.type === "breeding") {
        updatedPet = await db
          .update(breedingPets)
          .set({
            name: input.name,
            type: input.typeStr,
            breed: input.breed,
            age: input.age,
            weight: input.weight,
            color: input.color,
            gender: input.gender,
            image: input.image,
            isAvailable: input.status === 'active',
            updatedAt: new Date(),
          })
          .where(eq(breedingPets.id, input.petId))
          .returning();
      }

      if (!updatedPet || updatedPet.length === 0) {
        throw new Error("فشل في تحديث بيانات الحيوان");
      }

      return updatedPet[0];
    } catch (error) {
      console.error("Error updating pet profile:", error);
      throw new Error("فشل في تحديث بيانات الحيوان");
    }
  });

// Delete pet
export const deletePetProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      adminId: z.number(),
      type: z.enum(["owned", "lost", "adoption", "breeding"]).default("owned"),
      reason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      let deletedPet;

      if (input.type === "owned") {
        deletedPet = await db.delete(pets).where(eq(pets.id, input.petId)).returning();
      } else if (input.type === "lost") {
        deletedPet = await db.delete(lostPets).where(eq(lostPets.id, input.petId)).returning();
      } else if (input.type === "adoption") {
        deletedPet = await db.delete(adoptionPets).where(eq(adoptionPets.id, input.petId)).returning();
      } else if (input.type === "breeding") {
        deletedPet = await db.delete(breedingPets).where(eq(breedingPets.id, input.petId)).returning();
      }

      if (!deletedPet || deletedPet.length === 0) {
        throw new Error("فشل في حذف الحيوان");
      }

      // TODO: Log admin activity

      return {
        success: true,
        message: "تم حذف الحيوان بنجاح",
      };
    } catch (error) {
      console.error("Error deleting pet:", error);
      throw new Error("فشل في حذف الحيوان");
    }
  });

// Search pets for admin
export const searchPetsProcedure = publicProcedure
  .input(
    z.object({
      query: z.string(),
      // adminId: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here

      // 1. Search Owned Pets
      const ownedPets = await db
        .select({
          id: pets.id,
          name: pets.name,
          type: pets.type,
          breed: pets.breed,
          age: pets.age,
          gender: pets.gender,
          image: pets.image,
          isLost: pets.isLost,
          ownerName: users.name,
          ownerEmail: users.email,
          createdAt: pets.createdAt,
          category: sql<string>`'owned'`,
          status: sql<string>`'active'`,
        })
        .from(pets)
        .innerJoin(users, eq(pets.ownerId, users.id))
        .where(
          or(
            like(pets.name, `%${input.query}%`),
            like(pets.type, `%${input.query}%`),
            like(pets.breed, `%${input.query}%`),
            like(users.name, `%${input.query}%`)
          )
        )
        .limit(input.limit);

      // 2. Search Lost Pets
      const lostPetsList = await db
        .select({
          id: lostPets.id,
          name: lostPets.name,
          type: lostPets.type,
          breed: lostPets.breed,
          age: lostPets.age,
          gender: lostPets.gender,
          image: lostPets.image,
          isLost: sql<boolean>`true`,
          ownerName: users.name,
          ownerEmail: users.email,
          createdAt: lostPets.createdAt,
          category: sql<string>`'lost'`,
          status: lostPets.status,
        })
        .from(lostPets)
        .innerJoin(users, eq(lostPets.ownerId, users.id))
        .where(
          or(
            like(lostPets.name, `%${input.query}%`),
            like(lostPets.type, `%${input.query}%`),
            like(lostPets.breed, `%${input.query}%`),
            like(users.name, `%${input.query}%`)
          )
        )
        .limit(input.limit);

      // 3. Search Adoption Pets
      const adoptionPetsList = await db
        .select({
          id: adoptionPets.id,
          name: adoptionPets.name,
          type: adoptionPets.type,
          breed: adoptionPets.breed,
          age: adoptionPets.age,
          gender: adoptionPets.gender,
          image: adoptionPets.image,
          isLost: sql<boolean>`false`,
          ownerName: users.name,
          ownerEmail: users.email,
          createdAt: adoptionPets.createdAt,
          category: sql<string>`'adoption'`,
          status: sql<string>`CASE WHEN ${adoptionPets.isAvailable} THEN 'active' ELSE 'inactive' END`,
        })
        .from(adoptionPets)
        .innerJoin(users, eq(adoptionPets.ownerId, users.id))
        .where(
          or(
            like(adoptionPets.name, `%${input.query}%`),
            like(adoptionPets.type, `%${input.query}%`),
            like(adoptionPets.breed, `%${input.query}%`),
            like(users.name, `%${input.query}%`)
          )
        )
        .limit(input.limit);

      // 4. Search Breeding Pets
      const breedingPetsList = await db
        .select({
          id: breedingPets.id,
          name: breedingPets.name,
          type: breedingPets.type,
          breed: breedingPets.breed,
          age: breedingPets.age,
          gender: breedingPets.gender,
          image: breedingPets.image,
          isLost: sql<boolean>`false`,
          ownerName: users.name,
          ownerEmail: users.email,
          createdAt: breedingPets.createdAt,
          category: sql<string>`'breeding'`,
          status: sql<string>`CASE WHEN ${breedingPets.isAvailable} THEN 'active' ELSE 'inactive' END`,
        })
        .from(breedingPets)
        .innerJoin(users, eq(breedingPets.ownerId, users.id))
        .where(
          or(
            like(breedingPets.name, `%${input.query}%`),
            like(breedingPets.type, `%${input.query}%`),
            like(breedingPets.breed, `%${input.query}%`),
            like(users.name, `%${input.query}%`)
          )
        )
        .limit(input.limit);

      // Combine and sort
      const searchResults = [
        ...ownedPets,
        ...lostPetsList,
        ...adoptionPetsList,
        ...breedingPetsList
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply limit/offset after combination (not ideal for large datasets but works for now)
      return {
        pets: searchResults.slice(input.offset, input.offset + input.limit)
      };
    } catch (error) {
      console.error("Error searching pets:", error);
      throw new Error("فشل في البحث عن الحيوانات");
    }
  });
