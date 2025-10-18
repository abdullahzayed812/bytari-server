import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { db, consultations } from "../../../db";
import { eq } from "drizzle-orm";

const listForUserInputSchema = z.object({
  userId: z.number(),
});

export const listForUserProcedure = publicProcedure.input(listForUserInputSchema).query(async ({ input }) => {
  try {
    const userConsultations = await db.select().from(consultations).where(eq(consultations.userId, input.userId));

    return {
      success: true,
      consultations: userConsultations,
    };
  } catch (error) {
    console.error("Error fetching consultations for user:", error);
    throw new Error("Unable to fetch consultations for the user.");
  }
});
