import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, vetStores, storeProducts, stores } from "../../../../db";
import { eq } from "drizzle-orm";

export const deleteStoreProcedure = publicProcedure
  .input(
    z.object({
      id: z.number(),
    })
  )
  .mutation(async ({ input }: { input: { id: number } }) => {
    try {
      // First delete all products associated with the store
      await db.delete(storeProducts).where(eq(storeProducts.storeId, input.id));

      // Then delete the store
      await db.delete(stores).where(eq(stores.id, input.id));

      return {
        success: true,
        message: "تم حذف المتجر وجميع منتجاته بنجاح",
      };
    } catch (error) {
      console.error("Error deleting store:", error);
      throw new Error("حدث خطأ أثناء حذف المتجر");
    }
  });
