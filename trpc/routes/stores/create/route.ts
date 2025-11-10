import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, stores, approvalRequests, users } from "../../../../db";
import { eq } from "drizzle-orm";

const createStoreSchema = z.object({
  name: z.string().min(1, "اسم المذخر مطلوب"),
  description: z.string().optional(),
  address: z.string().min(1, "العنوان مطلوب"),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
  category: z.string().min(1, "الفئة مطلوبة"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  workingHours: z.string().optional(),
  licenseNumber: z.string().min(1, "رقم الترخيص مطلوب"),
  licenseImage: z.string().min(1, "صورة الترخيص مطلوبة"),
  images: z.array(z.string()).optional(),
  adminId: z.number().optional(),
});

export const createStoreProcedure = protectedProcedure.input(createStoreSchema).mutation(async ({ input, ctx }) => {
  try {
    const userId = ctx.user.id;

    // Ensure user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) throw new Error("المستخدم غير موجود");

    // 1️⃣ Create the store record (inactive until approved)
    const [store] = await db
      .insert(stores)
      .values({
        ownerId: userId,
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
        isActive: input.adminId ? true : false,
        isVerified: input.adminId ? true : false,
      })
      .returning();

    if (!input.adminId) {
      // 2️⃣ Create approval request
      const [approvalRequest] = await db
        .insert(approvalRequests)
        .values({
          requestType: "store_activation",
          requesterId: userId,
          resourceId: store.id,
          title: `طلب تفعيل مذخر ${input.name}`,
          description: `طلب تفعيل مذخر ${input.name} في ${input.address}`,
          documents: JSON.stringify(["store_registration_form.pdf"]),
          licenseImages: JSON.stringify([input.licenseImage]),
          identityImages: null,
          officialDocuments: null,

          paymentStatus: "pending", // Store requires payment
          paymentAmount: 25, // $25 monthly subscription
          paymentMethod: null,
          paymentTransactionId: null,
          paymentCompletedAt: null,
          paymentReceipt: null,

          status: "pending",
          priority: "normal",
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .returning();

      return {
        success: true,
        message: "تم إرسال طلب تسجيل المذخر بنجاح. سيتم مراجعته من قبل الإدارة ويتطلب دفع اشتراك شهري 25 دولار.",
        storeId: store.id,
        requestId: approvalRequest.id,
      };
    }

    return {
      success: true,
      message: "تم إرسال طلب تسجيل المذخر بنجاح. سيتم مراجعته من قبل الإدارة ويتطلب دفع اشتراك شهري 25 دولار.",
      storeId: store.id,
    };
  } catch (error) {
    console.error("❌ Error creating store registration:", error);
    throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل المذخر");
  }
});
