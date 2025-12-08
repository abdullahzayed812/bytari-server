import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, vetStores, approvalRequests, users } from "../../../../db";
import { eq } from "drizzle-orm";

const createVetStoreSchema = z.object({
    name: z.string().min(1, "اسم المذخر مطلوب"),
    description: z.string().optional(),
    address: z.string().min(1, "العنوان مطلوب"),
    phone: z.string().optional(),
    email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
    category: z.string().min(1, "الفئة مطلوبة"),
    logo: z.string().optional(),
    bannerImage: z.string().optional(),
    workingHours: z.string().optional(), // JSON string
    images: z.array(z.string()).optional(), // JSON string
    services: z.array(z.string()).optional(), // JSON string
    website: z.string().optional(),
});

export const createVetStoreProcedure = protectedProcedure
    .input(createVetStoreSchema)
    .mutation(async ({ input, ctx }) => {
        try {
            const userId = ctx.user.id;

            // Ensure user exists
            const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

            if (!user) throw new Error("المستخدم غير موجود");

            // 1️⃣ Create the vet store record
            const [store] = await db
                .insert(vetStores)
                .values({
                    ownerId: userId,
                    name: input.name,
                    description: input.description,
                    address: input.address,
                    phone: input.phone,
                    email: input.email,
                    category: input.category,
                    logo: input.logo,
                    bannerImage: input.bannerImage,
                    workingHours: input.workingHours ? JSON.parse(input.workingHours) : null,
                    images: input.images || null,
                    services: input.services || null,
                    website: input.website,
                    subscriptionStatus: "active", // Vet stores might be active by default or pending
                    isActive: true, // Assuming active by default for vets, or change based on requirements
                    isVerified: false,
                })
                .returning();

            return {
                success: true,
                message: "تم إنشاء المذخر بنجاح",
                storeId: store.id,
            };
        } catch (error) {
            console.error("❌ Error creating vet store:", error);
            throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء المذخر");
        }
    });
