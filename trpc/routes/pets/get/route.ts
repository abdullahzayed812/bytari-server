import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, pets, users } from "../../../../db";

export const getAllPetsProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ input }) => {
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
      .orderBy(desc(pets.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return {
      success: true,
      pets: allPets,
    };
  });
