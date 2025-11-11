import { z } from "zod";
import { publicProcedure } from "../../../../../trpc/create-context";
import { db, products } from "../../../../../db";
import { eq } from "drizzle-orm";

// Toggle product visibility
export const toggleStoreProductVisibilityProcedure = publicProcedure
  .input(
    z.object({
      productId: z.number(),
      inStock: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [updatedProduct] = await db
        .update(products)
        .set({
          inStock: input.inStock,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.productId))
        .returning();

      return {
        success: true,
        product: updatedProduct,
      };
    } catch (error) {
      console.error("Error toggling product visibility:", error);
      throw new Error("حدث خطأ أثناء تحديث حالة المنتج");
    }
  });
