import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { db, inquiries } from "../../../db";
import { or, eq } from "drizzle-orm";

// Accept either userId or vetId (or both)
const listInquiriesInputSchema = z.object({
  userId: z.number().optional(),
  vetId: z.number().optional(),
});

export const listForUserProcedure = publicProcedure.input(listInquiriesInputSchema).query(async ({ input }) => {
  try {
    if (!input.userId) {
      throw new Error("Either userId or vetId must be provided.");
    }

    const conditions = [];

    if (input.userId) {
      conditions.push(eq(inquiries.userId, input.userId));
    }

    const userInquiries = await db
      .select()
      .from(inquiries)
      .where(conditions.length > 1 ? or(...conditions) : conditions[0]);

    return {
      success: true,
      inquiries: userInquiries,
    };
  } catch (error) {
    console.error("❌ Error fetching inquiries:", error);
    throw new Error("Unable to fetch inquiries.");
  }
});
