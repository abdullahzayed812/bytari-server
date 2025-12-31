import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, adoptionPets, breedingPets } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const closeAdoptionListing = publicProcedure
  .input(
    z.object({
      petId: z.number(),
      ownerId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const [pet] = await db
      .select()
      .from(adoptionPets)
      .where(eq(adoptionPets.id, input.petId));

    if (!pet || pet.ownerId !== input.ownerId) {
      throw new Error("Unauthorized");
    }

    await db
      .update(adoptionPets)
      .set({ isClosedByOwner: true })
      .where(eq(adoptionPets.id, input.petId));

    return { success: true };
  });

export const closeBreedingListing = publicProcedure
  .input(
    z.object({
      petId: z.number(),
      ownerId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const [pet] = await db
      .select()
      .from(breedingPets)
      .where(eq(breedingPets.id, input.petId));

    if (!pet || pet.ownerId !== input.ownerId) {
      throw new Error("Unauthorized");
    }

    await db
      .update(breedingPets)
      .set({ isClosedByOwner: true })
      .where(eq(breedingPets.id, input.petId));

    return { success: true };
  });
