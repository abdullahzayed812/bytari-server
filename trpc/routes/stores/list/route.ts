import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, stores } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const listStoresProcedure = publicProcedure
  .input(
    z
      .object({
        forVetHome: z.boolean().optional().default(false),
      })
      .optional()
  )
  .query(async ({ input }) => {
    try {
      const rawStores = await db.select().from(stores);

      return {
        success: true,
        stores: rawStores.map((store: any) => ({
          ...store,
          images: store.images ? JSON.parse(store.images) : [],
          workingHours: store.workingHours ? JSON.parse(store.workingHours) : null,
        })),
      };
    } catch (error) {
      console.error("Error fetching stores:", error);
      throw new Error("حدث خطأ أثناء جلب المذاخر");
    }
  });

export const listActiveStoresProcedure = publicProcedure
  .input(
    z
      .object({
        forVetHome: z.boolean().optional().default(false),
      })
      .optional()
  )
  .query(async ({ input }) => {
    try {
      const { forVetHome = false } = input || {};

      // Build where conditions based on the request
      const whereConditions = forVetHome
        ? and(eq(stores.isActive, true), eq(stores.isVerified, true), eq(stores.showOnVetHome, true))
        : eq(stores.isActive, true);

      const rawStores = await db.select().from(stores).where(whereConditions);

      return {
        success: true,
        stores: rawStores.map((store: any) => ({
          ...store,
          images: store.images ? JSON.parse(store.images) : [],
          workingHours: store.workingHours ? JSON.parse(store.workingHours) : null,
        })),
      };
    } catch (error) {
      console.error("Error fetching stores:", error);
      throw new Error("حدث خطأ أثناء جلب المذاخر");
    }
  });
