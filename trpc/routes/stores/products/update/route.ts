import { z } from "zod";
import { publicProcedure } from "../../../../../trpc/create-context";
import { db, products } from "../../../../../db";
import { eq } from "drizzle-orm";

export const updateStoreProductProcedure = publicProcedure
  .input(
    z.object({
      productId: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
      stockQuantity: z.number().int().min(0).optional(),
      category: z.string().optional(),
      images: z.string().url().optional(),
      inStock: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const { productId, ...updateData } = input;

      const filteredData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));

      const [updatedProduct] = await db
        .update(products)
        .set({
          ...filteredData,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId))
        .returning();

      return {
        success: true,
        product: updatedProduct,
      };
    } catch (error) {
      console.error("Error updating product:", error);
      throw new Error("حدث خطأ أثناء تحديث المنتج");
    }
  });
