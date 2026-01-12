import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../create-context";
import { db } from "../../../db";
import { userAddresses } from "../../../db/schema";
import { eq, and } from "drizzle-orm";

export const addressRouter = createTRPCRouter({
  getAddresses: protectedProcedure.query(async ({ ctx }) => {
    const addresses = await db.select().from(userAddresses).where(eq(userAddresses.userId, ctx.user.id));
    return addresses;
  }),

  addAddress: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        phone: z.string(),
        address: z.string(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newAddress] = await db
        .insert(userAddresses)
        .values({
          userId: ctx.user.id,
          name: input.name,
          phone: input.phone,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          isDefault: input.isDefault,
        })
        .returning();

      return newAddress;
    }),
});
