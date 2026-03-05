
import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, clinicFollowers } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const followClinicProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      const { clinicId } = input;

      const existingFollow = await db
        .select()
        .from(clinicFollowers)
        .where(
          and(
            eq(clinicFollowers.clinicId, clinicId),
            eq(clinicFollowers.userId, userId)
          )
        );

      if (existingFollow.length > 0) {
        return {
          success: false,
          message: "You are already following this clinic.",
        };
      }

      await db.insert(clinicFollowers).values({
        clinicId,
        userId,
      });

      return {
        success: true,
        message: "Successfully followed the clinic.",
      };
    } catch (error) {
      console.error("Error following clinic:", error);
      throw new Error("حدث خطأ أثناء متابعة العيادة");
    }
  });
