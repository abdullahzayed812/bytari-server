import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db, vetStores } from "../../../../db";
import { eq, and, desc } from "drizzle-orm";

// Get user's vet stores
export const getUserVetStoresProcedure = protectedProcedure.query(async ({ ctx }) => {
    try {
        const userId = ctx.user.id;
        const stores = await db
            .select()
            .from(vetStores)
            .where(eq(vetStores.ownerId, userId))
            .orderBy(desc(vetStores.createdAt));

        return {
            success: true,
            stores,
        };
    } catch (error) {
        console.error("Error fetching user vet stores:", error);
        throw new Error("فشل في جلب المذاخر");
    }
});

// List active vet stores (public)
export const listActiveVetStoresProcedure = publicProcedure
    .input(
        z.object({
            limit: z.number().default(20),
            offset: z.number().default(0),
            category: z.string().optional(),
        })
    )
    .query(async ({ input }) => {
        try {
            let query = db
                .select()
                .from(vetStores)
                .where(and(eq(vetStores.isActive, true)))
                .limit(input.limit)
                .offset(input.offset)
                .orderBy(desc(vetStores.createdAt));

            // TODO: Add category filtering if needed (requires dynamic query building or separate logic)

            const stores = await query;

            return {
                success: true,
                stores,
            };
        } catch (error) {
            console.error("Error fetching active vet stores:", error);
            throw new Error("فشل في جلب المذاخر");
        }
    });
