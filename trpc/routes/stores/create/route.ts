import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, stores } from "../../../../db";

const createStoreSchema = z.object({
  userId: z.number(),
  name: z.string().min(1, "اسم المذخر مطلوب"),
  description: z.string().optional(),
  address: z.string().min(1, "العنوان مطلوب"),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
  category: z.string().min(1, "الفئة مطلوبة"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  workingHours: z.string().optional(),
  licenseImage: z.string().min(1, "صورة الترخيص مطلوبة"),
  licenseNumber: z.string().min(1, "رقم الترخيص مطلوب"),
  images: z.array(z.string()).optional(),
});

export const createStoreProcedure = publicProcedure
  .input(createStoreSchema)
  .mutation(async ({ input }: { input: z.infer<typeof createStoreSchema> }) => {
    try {
      const [store] = await db
        .insert(stores)
        .values({
          ownerId: input.userId,
          name: input.name,
          description: input.description,
          address: input.address,
          phone: input.phone,
          email: input.email,
          category: input.category,
          latitude: input.latitude,
          longitude: input.longitude,
          workingHours: input.workingHours,
          licenseImage: input.licenseImage,
          licenseNumber: input.licenseNumber,
          images: input.images ? JSON.stringify(input.images) : null,
          subscriptionStatus: "pending",
          isActive: false,
          isVerified: false,
        })
        .returning();

      return {
        success: true,
        store,
        message: "تم إرسال طلب إضافة المذخر بنجاح. سيتم مراجعته من قبل الإدارة.",
      };
    } catch (error) {
      console.error("Error creating store:", error);
      throw new Error("حدث خطأ أثناء إنشاء المذخر");
    }
  });
