
import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, storeFollowers } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const followStoreProcedure = protectedProcedure
  .input(
    z.object({
      storeId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      const { storeId } = input;

      const existingFollow = await db
        .select()
        .from(storeFollowers)
        .where(
          and(
            eq(storeFollowers.storeId, storeId),
            eq(storeFollowers.userId, userId)
          )
        );

      if (existingFollow.length > 0) {
        return {
          success: false,
          message: "You are already following this store.",
        };
      }

      await db.insert(storeFollowers).values({
        storeId,
        userId,
      });

      return {
        success: true,
        message: "Successfully followed the store.",
      };
    } catch (error) {
      console.error("Error following store:", error);
      throw new Error("حدث خطأ أثناء متابعة المذخر");
    }
  });
