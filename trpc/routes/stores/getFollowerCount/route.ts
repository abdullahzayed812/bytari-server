
import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, storeFollowers } from "../../../../db";
import { eq, count } from "drizzle-orm";

export const getStoreFollowerCountProcedure = publicProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { storeId } = input;

      const result = await db
        .select({
          count: count(storeFollowers.id),
        })
        .from(storeFollowers)
        .where(eq(storeFollowers.storeId, storeId));

      return {
        success: true,
        count: result[0].count,
      };
    } catch (error) {
      console.error("Error getting store follower count:", error);
      throw new Error("حدث خطأ أثناء جلب عدد متابعي المذخر");
    }
  });
