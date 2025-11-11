import { z } from "zod";
import { publicProcedure } from "../../../../create-context";
import { db, products } from "../../../../../db";
import { eq } from "drizzle-orm";

export const listProductsProcedure = publicProcedure
  .input(
    z.object({
      storeId: z.number().optional(),
    })
  )
  .query(async ({ input }: { input: { storeId?: number } }) => {
    try {
      let query = db.select().from(products);

      if (input.storeId !== undefined) {
        query = query.where(eq(products.storeId, input.storeId));
      }

      const allProducts = await query;

      return {
        success: true,
        products: allProducts,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error("حدث خطأ أثناء جلب المنتجات");
    }
  });
