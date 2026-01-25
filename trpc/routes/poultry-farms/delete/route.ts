import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryFarms } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

const deletePoultryFarmSchema = z.object({
    farmId: z.number().int().positive(),
    ownerId: z.number().int().positive(),
});

export const deletePoultryFarmProcedure = publicProcedure
    .input(deletePoultryFarmSchema)
    .mutation(async ({ input }) => {
        console.log("Deleting poultry farm:", input);

        try {
            // Delete from database
            const result = await db
                .delete(poultryFarms)
                .where(
                    and(
                        eq(poultryFarms.id, input.farmId),
                        eq(poultryFarms.ownerId, input.ownerId)
                    )
                )
                .returning();

            if (result.length === 0) {
                throw new Error("الحقل غير موجود أو ليس لديك صلاحية حذفه");
            }

            console.log("Poultry farm deleted successfully:", input.farmId);

            return {
                success: true,
                message: "تم حذف حقل الدواجن بنجاح",
            };
        } catch (error) {
            console.error("Error deleting poultry farm:", error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error("فشل في حذف حقل الدواجن");
        }
    });
