
import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, storeFollowers } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const unfollowStoreProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      const { storeId } = input;

      await db
        .delete(storeFollowers)
        .where(
          and(
            eq(storeFollowers.storeId, storeId),
            eq(storeFollowers.userId, userId)
          )
        );

      return {
        success: true,
        message: "Successfully unfollowed the store.",
      };
    } catch (error) {
      console.error("Error unfollowing store:", error);
      throw new Error("حدث خطأ أثناء إلغاء متابعة المذخر");
    }
  });
