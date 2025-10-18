import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, pets, users } from '../../../../db';
import { eq, like, or } from 'drizzle-orm';

// Get pet profile for admin editing
export const getPetProfileProcedure = publicProcedure
  .input(z.object({
    petId: z.number(),
    adminId: z.number(),
  }))
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const pet = await db
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

      if (pet.length === 0) {
        throw new Error('الحيوان غير موجود');
      }

      return pet[0];
    } catch (error) {
      console.error('Error getting pet profile:', error);
      throw new Error('فشل في جلب بيانات الحيوان');
    }
  });

// Update pet profile by admin
export const updatePetProfileProcedure = publicProcedure
  .input(z.object({
    petId: z.number(),
    adminId: z.number(),
    name: z.string().min(1),
    type: z.string(),
    breed: z.string().optional(),
    age: z.number().optional(),
    weight: z.number().optional(),
    color: z.string().optional(),
    gender: z.enum(['male', 'female']).optional(),
    image: z.string().optional(),
    medicalHistory: z.string().optional(),
    vaccinations: z.string().optional(),
    isLost: z.boolean(),
  }))
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const updatedPet = await db
        .update(pets)
        .set({
          name: input.name,
          type: input.type,
          breed: input.breed,
          age: input.age,
          weight: input.weight,
          color: input.color,
          gender: input.gender,
          image: input.image,
          medicalHistory: input.medicalHistory,
          vaccinations: input.vaccinations,
          isLost: input.isLost,
          updatedAt: new Date(),
        })
        .where(eq(pets.id, input.petId))
        .returning();

      if (updatedPet.length === 0) {
        throw new Error('فشل في تحديث بيانات الحيوان');
      }

      return updatedPet[0];
    } catch (error) {
      console.error('Error updating pet profile:', error);
      throw new Error('فشل في تحديث بيانات الحيوان');
    }
  });

// Delete pet
export const deletePetProcedure = publicProcedure
  .input(z.object({
    petId: z.number(),
    adminId: z.number(),
    reason: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const deletedPet = await db
        .delete(pets)
        .where(eq(pets.id, input.petId))
        .returning();

      if (deletedPet.length === 0) {
        throw new Error('فشل في حذف الحيوان');
      }

      // TODO: Log admin activity
      
      return {
        success: true,
        message: 'تم حذف الحيوان بنجاح',
      };
    } catch (error) {
      console.error('Error deleting pet:', error);
      throw new Error('فشل في حذف الحيوان');
    }
  });

// Search pets for admin
export const searchPetsProcedure = publicProcedure
  .input(z.object({
    query: z.string(),
    adminId: z.number(),
    limit: z.number().default(20),
    offset: z.number().default(0),
  }))
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const searchResults = await db
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
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(pets.createdAt);

      return searchResults;
    } catch (error) {
      console.error('Error searching pets:', error);
      throw new Error('فشل في البحث عن الحيوانات');
    }
  });