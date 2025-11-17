import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context"; // adjust path as needed
import { db } from "../../../../db"; // adjust path as needed
import { clinics, users } from "../../../../db/schema"; // adjust path as needed

// ============== TOGGLE CLINIC VISIBILITY ==============
export const toggleClinicVisibilityProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number().int().positive("معرف العيادة غير صحيح"),
      isActive: z.boolean(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Check if user is super admin
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user || user.userType !== "admin") {
        throw new Error("غير مصرح لك بتنفيذ هذا الإجراء");
      }

      // Check if clinic exists
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Update clinic visibility
      const [updatedClinic] = await db
        .update(clinics)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(clinics.id, input.clinicId))
        .returning();

      return {
        success: true,
        message: input.isActive ? "تم إظهار العيادة بنجاح" : "تم إخفاء العيادة بنجاح",
        clinic: updatedClinic,
      };
    } catch (error) {
      console.error("❌ Error toggling clinic visibility:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تغيير حالة العيادة");
    }
  });

// ============== UPDATE CLINIC ==============
export const updateClinicProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number().int().positive("معرف العيادة غير صحيح"),
      name: z.string().min(1, "اسم العيادة مطلوب").optional(),
      address: z.string().min(1, "عنوان العيادة مطلوب").optional(),
      phone: z.string().min(1, "رقم الهاتف مطلوب").optional(),
      email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      workingHours: z.string().optional(),
      services: z.string().optional(),
      images: z.array(z.string()).optional(),
      description: z.string().optional(),
      doctors: z.string().optional(),
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      whatsapp: z.string().optional(),
      website: z.string().optional(),
      rating: z.number().min(0).max(5).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      const { clinicId, ...updateData } = input;

      // Check if user is super admin
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user || user.userType !== "admin") {
        throw new Error("غير مصرح لك بتنفيذ هذا الإجراء");
      }

      // Check if clinic exists
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Prepare update payload
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      // Only include fields that were provided
      if (updateData.name !== undefined) updatePayload.name = updateData.name;
      if (updateData.address !== undefined) updatePayload.address = updateData.address;
      if (updateData.phone !== undefined) updatePayload.phone = updateData.phone;
      if (updateData.email !== undefined) updatePayload.email = updateData.email;
      if (updateData.latitude !== undefined) updatePayload.latitude = updateData.latitude;
      if (updateData.longitude !== undefined) updatePayload.longitude = updateData.longitude;
      if (updateData.description !== undefined) updatePayload.description = updateData.description;
      if (updateData.doctors !== undefined) updatePayload.doctors = updateData.doctors;
      if (updateData.facebook !== undefined) updatePayload.facebook = updateData.facebook;
      if (updateData.instagram !== undefined) updatePayload.instagram = updateData.instagram;
      if (updateData.whatsapp !== undefined) updatePayload.whatsapp = updateData.whatsapp;
      if (updateData.website !== undefined) updatePayload.website = updateData.website;
      if (updateData.rating !== undefined) updatePayload.rating = updateData.rating;

      // Handle JSON fields
      if (updateData.workingHours !== undefined) {
        updatePayload.workingHours = updateData.workingHours;
      }
      if (updateData.services !== undefined) {
        updatePayload.services = updateData.services;
      }
      if (updateData.images !== undefined) {
        updatePayload.images = JSON.stringify(updateData.images);
      }

      // Update clinic
      const [updatedClinic] = await db.update(clinics).set(updatePayload).where(eq(clinics.id, clinicId)).returning();

      return {
        success: true,
        message: "تم تحديث بيانات العيادة بنجاح",
        clinic: updatedClinic,
      };
    } catch (error) {
      console.error("❌ Error updating clinic:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث بيانات العيادة");
    }
  });

// ============== DELETE CLINIC ==============
export const deleteClinicProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number().int().positive("معرف العيادة غير صحيح"),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Check if user is super admin
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user || user.userType !== "admin") {
        throw new Error("غير مصرح لك بتنفيذ هذا الإجراء");
      }

      // Check if clinic exists
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Delete clinic (this will cascade to related records like clinic_staff, vet_permissions, etc.)
      await db.delete(clinics).where(eq(clinics.id, input.clinicId));

      return {
        success: true,
        message: "تم حذف العيادة بنجاح",
        clinicId: input.clinicId,
      };
    } catch (error) {
      console.error("❌ Error deleting clinic:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء حذف العيادة");
    }
  });
