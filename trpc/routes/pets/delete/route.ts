import { protectedProcedure } from "../../../create-context";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, pets } from "../../../../db";

export const deletePetProcedure = protectedProcedure
  .input(
    z.object({
      id: z.number(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { id } = input;
    const userId = ctx.user.id;

    const pet = await db.query.pets.findFirst({
      where: and(eq(pets.id, id), eq(pets.ownerId, userId)),
    });

    if (!pet) {
      throw new Error("Pet not found or you do not have permission to delete it.");
    }

    await db.delete(pets).where(eq(pets.id, id));

    return { message: "Pet deleted successfully" };
  });
