
import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, storeFollowers, users } from "../../../../db";
import { eq } from "drizzle-orm";

export const getStoreFollowersProcedure = publicProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { storeId } = input;

      const followers = await db
        .select({
          user: users,
        })
        .from(storeFollowers)
        .where(eq(storeFollowers.storeId, storeId))
        .innerJoin(users, eq(storeFollowers.userId, users.id));

      return {
        success: true,
        followers: followers.map((f) => f.user),
      };
    } catch (error) {
      console.error("Error getting store followers:", error);
      throw new Error("حدث خطأ أثناء جلب متابعي المذخر");
    }
  });
