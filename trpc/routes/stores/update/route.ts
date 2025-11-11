import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, stores, vetStores } from "../../../../db";
import { eq } from "drizzle-orm";

// Update store details
export const updateStoreProcedure = publicProcedure
  .input(
    z.object({
      storeId: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      images: z.array(z.string()).optional(),
      workingHours: z.any().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const { storeId, images, workingHours, ...updateData } = input;

      const [updatedStore] = await db
        .update(stores)
        .set({
          ...updateData,
          ...(images && { images: JSON.stringify(images) }),
          ...(workingHours && { workingHours: JSON.stringify(workingHours) }),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(stores.id, storeId))
        .returning();

      return {
        success: true,
        store: {
          ...updatedStore,
          images: updatedStore.images ? JSON.parse(updatedStore.images) : [],
          workingHours: updatedStore.workingHours ? JSON.parse(updatedStore.workingHours) : null,
        },
      };
    } catch (error) {
      console.error("Error updating store:", error);
      throw new Error("حدث خطأ أثناء تحديث المتجر");
    }
  });
