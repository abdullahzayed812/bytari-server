import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, clinics, approvalRequests, users } from "../../../../db";
import { eq } from "drizzle-orm";

export const createClinicProcedure = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1, "اسم العيادة مطلوب"),
      address: z.string().min(1, "عنوان العيادة مطلوب"),
      phone: z.string().min(1, "رقم الهاتف مطلوب"),
      email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      workingHours: z.string().optional(),
      services: z.array(z.string()).optional(),
      images: z.array(z.string()).optional(),
      licenseNumber: z.string().min(1, "رقم الترخيص مطلوب"),
      licenseImages: z.array(z.string()).min(1, "صور الترخيص مطلوبة"),
      identityImages: z.array(z.string()).min(1, "صور الهوية مطلوبة"),
      officialDocuments: z.array(z.string()).optional(),
      description: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      console.log(userId, "--------------------------------------------------------------------------");

      // Ensure user exists
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) throw new Error("المستخدم غير موجود");

      // 1️⃣ Create clinic record (inactive until approved)
      const [clinic] = await db
        .insert(clinics)
        .values({
          name: input.name,
          address: input.address,
          phone: input.phone,
          email: input.email,
          latitude: input.latitude,
          longitude: input.longitude,
          workingHours: input.workingHours ? JSON.stringify(input.workingHours) : null,
          services: input.services ? JSON.stringify(input.services) : null,
          images: input.images ? JSON.stringify(input.images) : null,
          description: input.description,
          isActive: false,
        })
        .returning();

      // 2️⃣ Create approval request (generic structure)
      const [approvalRequest] = await db
        .insert(approvalRequests)
        .values({
          userId,
          type: "clinic_activation",
          entityId: clinic.id,
          data: {
            clinicName: input.name,
            address: input.address,
            licenseNumber: input.licenseNumber,
            licenseImages: input.licenseImages,
            identityImages: input.identityImages,
            officialDocuments: input.officialDocuments,
            contact: {
              phone: input.phone,
              email: input.email,
            },
          },
        })
        .returning();

      return {
        success: true,
        message: "تم إرسال طلب تسجيل العيادة بنجاح. سيتم مراجعته من قبل الإدارة.",
        clinicId: clinic.id,
        requestId: approvalRequest.id,
      };
    } catch (error) {
      console.error("Error creating clinic registration:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل العيادة");
    }
  });

export const updateClinicActivationProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      activationStartDate: z.date(),
      activationEndDate: z.date(),
      isActive: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const now = new Date();
    const needsRenewal = input.activationEndDate <= now;

    const updatedClinic = await db
      .update(clinics)
      .set({
        activationStartDate: input.activationStartDate,
        activationEndDate: input.activationEndDate,
        isActive: input.isActive ?? input.activationEndDate > now,
        needsRenewal,
        updatedAt: now,
      })
      .where(eq(clinics.id, input.clinicId))
      .returning();

    return updatedClinic[0];
  });

export const renewClinicActivationProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      newEndDate: z.date(),
    })
  )
  .mutation(async ({ input }) => {
    const now = new Date();

    const updatedClinic = await db
      .update(clinics)
      .set({
        activationEndDate: input.newEndDate,
        isActive: true,
        needsRenewal: false,
        updatedAt: now,
      })
      .where(eq(clinics.id, input.clinicId))
      .returning();

    return updatedClinic[0];
  });
