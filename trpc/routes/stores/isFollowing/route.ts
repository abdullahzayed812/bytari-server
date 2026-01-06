import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, storeFollowers } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const isFollowingStoreProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
      userId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const { storeId, userId } = input;

      const existingFollow = await db
        .select()
        .from(storeFollowers)
        .where(and(eq(storeFollowers.storeId, storeId), eq(storeFollowers.userId, userId)));

      return {
        success: true,
        isFollowing: existingFollow.length > 0,
      };
    } catch (error) {
      console.error("Error checking if following store:", error);
      throw new Error("حدث خطأ أثناء التحقق من متابعة المذخر");
    }
  });
