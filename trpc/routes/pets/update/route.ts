import { protectedProcedure } from "../../../create-context";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, pets } from "../../../../db";

export const updatePetProcedure = protectedProcedure
  .input(
    z.object({
      id: z.number(),
      name: z.string().min(1),
      type: z.enum(["dog", "cat", "rabbit", "bird", "other"]),
      breed: z.string().optional(),
      age: z.number().optional(),
      gender: z.enum(["male", "female"]),
      weight: z.number().optional(),
      color: z.string().optional(),
      image: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id, name, type, breed, age, gender, weight, color, image } = input;
    const userId = ctx.user.id;

    const pet = await db.query.pets.findFirst({
      where: and(eq(pets.id, id), eq(pets.ownerId, userId)),
    });

    if (!pet) {
      throw new Error("Pet not found or you do not have permission to edit it.");
    }

    await db
      .update(pets)
      .set({
        name,
        type,
        breed,
        age,
        gender,
        weight,
        color,
        image,
        updatedAt: new Date(),
      })
      .where(eq(pets.id, id));

    return { message: "Pet updated successfully" };
  });
