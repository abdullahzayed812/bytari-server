import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, stores, products } from "../../../../db";
import { eq } from "drizzle-orm";

export const deleteStoreProcedure = publicProcedure
  .input(
    z.object({
      id: z.number(),
    })
  )
  .mutation(async ({ input }: { input: { id: number } }) => {
    try {
      // Delete the store (products will be deleted automatically via cascade)
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
