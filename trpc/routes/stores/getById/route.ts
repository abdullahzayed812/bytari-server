import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, stores, vetStores } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const getStoreByIdProcedure = publicProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const rawStores = await db.select().from(stores).where(eq(stores.id, input.storeId));

      return {
        success: true,
        store: rawStores[0],
      };
    } catch (error) {
      console.error("Error fetching stores:", error);
      throw new Error("حدث خطأ أثناء جلب المذخر");
    }
  });
