import { z } from "zod";
import { publicProcedure } from "../../../../create-context";
import { db, products } from "../../../../../db";
import { eq, and } from "drizzle-orm";

export const listVetStoreProductsProcedure = publicProcedure
    .input(
        z.object({
            storeId: z.number(),
            limit: z.number().default(20),
            offset: z.number().default(0),
            category: z.string().optional(),
        })
    )
    .query(async ({ input }) => {
        try {
            let query = db
                .select()
                .from(products)
                .where(and(eq(products.vetStoreId, input.storeId), eq(products.isActive, true)))
                .limit(input.limit)
                .offset(input.offset);

            // TODO: Add category filtering logic if needed

            const storeProducts = await query;

            return {
                success: true,
                products: storeProducts,
            };
        } catch (error) {
            console.error("Error fetching vet store products:", error);
            throw new Error("فشل في جلب منتجات المذخر");
        }
    });
