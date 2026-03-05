
import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, clinicFollowers } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const unfollowClinicProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      const { clinicId } = input;

      await db
        .delete(clinicFollowers)
        .where(
          and(
            eq(clinicFollowers.clinicId, clinicId),
            eq(clinicFollowers.userId, userId)
          )
        );

      return {
        success: true,
        message: "Successfully unfollowed the clinic.",
      };
    } catch (error) {
      console.error("Error unfollowing clinic:", error);
      throw new Error("حدث خطأ أثناء إلغاء متابعة العيادة");
    }
  });
