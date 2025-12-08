import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, vetStores } from "../../../../db";
import { eq, and } from "drizzle-orm";

const updateVetStoreSchema = z.object({
    storeId: z.number(),
    name: z.string().optional(),
    description: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    category: z.string().optional(),
    logo: z.string().optional(),
    bannerImage: z.string().optional(),
    workingHours: z.string().optional(), // JSON string
    images: z.array(z.string()).optional(), // JSON string
    services: z.array(z.string()).optional(), // JSON string
    website: z.string().optional(),
});

export const updateVetStoreProcedure = protectedProcedure
    .input(updateVetStoreSchema)
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
                throw new Error("المذخر غير موجود أو ليس لديك صلاحية التعديل عليه");
            }

            const updateData: any = {};
            if (input.name) updateData.name = input.name;
            if (input.description) updateData.description = input.description;
            if (input.address) updateData.address = input.address;
            if (input.phone) updateData.phone = input.phone;
            if (input.email) updateData.email = input.email;
            if (input.category) updateData.category = input.category;
            if (input.logo) updateData.logo = input.logo;
            if (input.bannerImage) updateData.bannerImage = input.bannerImage;
            if (input.workingHours) updateData.workingHours = JSON.parse(input.workingHours);
            if (input.images) updateData.images = input.images;
            if (input.services) updateData.services = input.services;
            if (input.website) updateData.website = input.website;

            updateData.updatedAt = new Date();

            const [updatedStore] = await db
                .update(vetStores)
                .set(updateData)
                .where(eq(vetStores.id, input.storeId))
                .returning();

            return {
                success: true,
                message: "تم تحديث بيانات المذخر بنجاح",
                store: updatedStore,
            };
        } catch (error) {
            console.error("❌ Error updating vet store:", error);
            throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث المذخر");
        }
    });
