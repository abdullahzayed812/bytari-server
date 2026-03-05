
import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, clinicFollowers } from "../../../../db";
import { eq, count } from "drizzle-orm";

export const getClinicFollowerCountProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { clinicId } = input;

      const result = await db
        .select({
          count: count(clinicFollowers.id),
        })
        .from(clinicFollowers)
        .where(eq(clinicFollowers.clinicId, clinicId));

      return {
        success: true,
        count: result[0].count,
      };
    } catch (error) {
      console.error("Error getting clinic follower count:", error);
      throw new Error("حدث خطأ أثناء جلب عدد متابعي العيادة");
    }
  });
