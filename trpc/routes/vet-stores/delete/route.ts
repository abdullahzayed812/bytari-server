import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, vetStores } from "../../../../db";
import { eq, and } from "drizzle-orm";

export const deleteVetStoreProcedure = protectedProcedure
    .input(z.object({ storeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
        try {
            const userId = ctx.user.id;

            // Check if store exists and belongs to user
            const [store] = await db
                .select()
                .from(vetStores)
                .where(and(eq(vetStores.id, input.storeId), eq(vetStores.ownerId, userId)))
                .limit(1);

            if (!store) {
                throw new Error("المذخر غير موجود أو ليس لديك صلاحية حذفه");
            }

            // Delete the store (products will be deleted automatically via cascade)
            await db.delete(vetStores).where(eq(vetStores.id, input.storeId));

            return {
                success: true,
                message: "تم حذف المذخر بنجاح",
            };
        } catch (error) {
            console.error("❌ Error deleting vet store:", error);
            throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء حذف المذخر");
        }
    });
