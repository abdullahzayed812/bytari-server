import { z } from "zod";
import { publicProcedure } from "../../../../../trpc/create-context";
import { db, products } from "../../../../../db";
import { eq } from "drizzle-orm";

export const getStoreProductProcedure = publicProcedure
  .input(
    z.object({
      productId: z.number().int().min(1, "معرف المنتج غير صالح"),
    })
  )
  .query(async ({ input }) => {
    try {
      const product = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);

      if (!product || product.length === 0) {
        throw new Error("لم يتم العثور على المنتج المطلوب");
      }

      return {
        success: true,
        product: product[0],
      };
    } catch (error) {
      console.error("Error fetching product:", error);
      throw new Error("حدث خطأ أثناء جلب بيانات المنتج");
    }
  });
