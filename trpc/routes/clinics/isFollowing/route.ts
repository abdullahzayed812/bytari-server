import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, clinicFollowers } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const isFollowingClinicProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      userId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const { clinicId, userId } = input;

      const existingFollow = await db
        .select()
        .from(clinicFollowers)
        .where(and(eq(clinicFollowers.clinicId, clinicId), eq(clinicFollowers.userId, userId)));

      return {
        success: true,
        isFollowing: existingFollow.length > 0,
      };
    } catch (error) {
      console.error("Error checking if following clinic:", error);
      throw new Error("حدث خطأ أثناء التحقق من متابعة العيادة");
    }
  });
