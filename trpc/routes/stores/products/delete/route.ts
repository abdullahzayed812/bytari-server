import { z } from "zod";
import { publicProcedure } from "../../../../../trpc/create-context";
import { db, products } from "../../../../../db";
import { eq } from "drizzle-orm";

export const deleteStoreProductProcedure = publicProcedure
  .input(
    z.object({
      productId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db.delete(products).where(eq(products.id, input.productId));

      return {
        success: true,
        message: "تم حذف المنتج بنجاح",
      };
    } catch (error) {
      console.error("Error deleting product:", error);
      throw new Error("حدث خطأ أثناء حذف المنتج");
    }
  });
