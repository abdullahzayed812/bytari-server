import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, clinics, veterinarians, users, vetPermissions } from "../../../../db";

// ============== GET CLINIC SETTINGS ==============
export const getClinicSettingsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Get clinic details
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // // Parse JSON fields
      // const workingHours = clinic.workingHours
      //   ? typeof clinic.workingHours === "string"
      //     ? JSON.parse(clinic.workingHours)
      //     : clinic.workingHours
      //   : null;

      // const services = clinic.services
      //   ? typeof clinic.services === "string"
      //     ? JSON.parse(clinic.services)
      //     : clinic.services
      //   : [];

      const images = clinic.images
        ? typeof clinic.images === "string"
          ? JSON.parse(clinic.images)
          : clinic.images
        : [];

      return {
        success: true,
        clinic: {
          id: clinic.id,
          name: clinic.name,
          address: clinic.address,
          phone: clinic.phone,
          email: clinic.email,
          latitude: clinic.latitude,
          longitude: clinic.longitude,
          workingHours: clinic.workingHours,
          services: clinic.services,
          images,
          rating: clinic.rating,
          isActive: clinic.isActive,
          activationStartDate: clinic.activationStartDate,
          activationEndDate: clinic.activationEndDate,
          needsRenewal: clinic.needsRenewal,
          createdAt: clinic.createdAt,
          updatedAt: clinic.updatedAt,
        },
      };
    } catch (error) {
      console.error("❌ Error getting clinic settings:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب إعدادات العيادة");
    }
  });

// ============== UPDATE BASIC CLINIC INFO ==============
export const updateClinicBasicInfoProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      name: z.string().min(1, "اسم العيادة مطلوب"),
      address: z.string().min(1, "العنوان مطلوب"),
      description: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedClinic] = await db
        .update(clinics)
        .set({
          name: input.name,
          address: input.address,
          latitude: input.latitude,
          longitude: input.longitude,
          updatedAt: now,
        })
        .where(eq(clinics.id, input.clinicId))
        .returning();

      return {
        success: true,
        message: "تم تحديث معلومات العيادة بنجاح",
        clinic: updatedClinic,
      };
    } catch (error) {
      console.error("❌ Error updating clinic basic info:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث معلومات العيادة");
    }
  });

// ============== UPDATE CONTACT INFO ==============
export const updateClinicContactInfoProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      phone: z.string().min(1, "رقم الهاتف مطلوب"),
      email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
      website: z.string().url("رابط الموقع غير صحيح").optional(),
      socialMedia: z
        .object({
          facebook: z.string().optional(),
          instagram: z.string().optional(),
          twitter: z.string().optional(),
        })
        .optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedClinic] = await db
        .update(clinics)
        .set({
          phone: input.phone,
          email: input.email,
          updatedAt: now,
        })
        .where(eq(clinics.id, input.clinicId))
        .returning();

      return {
        success: true,
        message: "تم تحديث معلومات الاتصال بنجاح",
        clinic: updatedClinic,
      };
    } catch (error) {
      console.error("❌ Error updating contact info:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث معلومات الاتصال");
    }
  });

// ============== UPDATE WORKING HOURS ==============
export const updateClinicWorkingHoursProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      workingHours: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedClinic] = await db
        .update(clinics)
        .set({
          workingHours: input.workingHours,
          updatedAt: now,
        })
        .where(eq(clinics.id, input.clinicId))
        .returning();

      return {
        success: true,
        message: "تم تحديث ساعات العمل بنجاح",
        clinic: updatedClinic,
      };
    } catch (error) {
      console.error("❌ Error updating working hours:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث ساعات العمل");
    }
  });

// ============== GET CLINIC STAFF ==============
export const getClinicStaffProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      // Get all veterinarians associated with this clinic
      const staff = await db
        .select({
          id: veterinarians.id,
          userId: veterinarians.userId,
          licenseNumber: veterinarians.licenseNumber,
          specialization: veterinarians.specialization,
          experience: veterinarians.experience,
          isVerified: veterinarians.isVerified,
          rating: veterinarians.rating,
          consultationFee: veterinarians.consultationFee,
          userName: users.name,
          userEmail: users.email,
          userPhone: users.phone,
          userAvatar: users.avatar,
        })
        .from(veterinarians)
        .innerJoin(users, eq(veterinarians.userId, users.id))
        .leftJoin(vetPermissions, eq(veterinarians.clinicId, vetPermissions.veterinarianId))
        .where(eq(veterinarians.clinicId, input.clinicId));

      return {
        success: true,
        staff: staff.map((s) => ({
          id: s.id,
          userId: s.userId,
          name: s.userName,
          email: s.userEmail,
          phone: s.userPhone,
          avatar: s.userAvatar,
          licenseNumber: s.licenseNumber,
          specialization: s.specialization,
          experience: s.experience,
          isVerified: s.isVerified,
          rating: s.rating,
          consultationFee: s.consultationFee,
        })),
      };
    } catch (error) {
      console.error("❌ Error getting clinic staff:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب موظفي العيادة");
    }
  });

// ============== ADD STAFF MEMBER ==============
export const addClinicStaffProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      email: z.string().email("البريد الإلكتروني غير صحيح"),
      licenseNumber: z.string().min(1, "رقم الترخيص مطلوب"),
      specialization: z.string().optional(),
      experience: z.number().optional(),
      consultationFee: z.number().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

      if (!user) {
        throw new Error("المستخدم غير موجود");
      }

      // Check if already a veterinarian at this clinic
      const [existing] = await db
        .select()
        .from(veterinarians)
        .where(and(eq(veterinarians.userId, user.id), eq(veterinarians.clinicId, input.clinicId)))
        .limit(1);

      if (existing) {
        throw new Error("هذا الطبيب موجود بالفعل في العيادة");
      }

      // Add veterinarian
      const [newVet] = await db
        .insert(veterinarians)
        .values({
          userId: user.id,
          clinicId: input.clinicId,
          licenseNumber: input.licenseNumber,
          specialization: input.specialization,
          experience: input.experience,
          consultationFee: input.consultationFee,
          isVerified: false,
        })
        .returning();

      return {
        success: true,
        message: "تم إضافة الطبيب بنجاح",
        veterinarian: newVet,
      };
    } catch (error) {
      console.error("❌ Error adding staff:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الموظف");
    }
  });

// ============== REMOVE STAFF MEMBER ==============
export const removeClinicStaffProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      veterinarianId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      // Verify veterinarian belongs to this clinic
      const [vet] = await db
        .select()
        .from(veterinarians)
        .where(and(eq(veterinarians.id, input.veterinarianId), eq(veterinarians.clinicId, input.clinicId)))
        .limit(1);

      if (!vet) {
        throw new Error("الطبيب غير موجود في هذه العيادة");
      }

      // Remove veterinarian (set clinicId to null instead of deleting)
      await db.update(veterinarians).set({ clinicId: null }).where(eq(veterinarians.id, input.veterinarianId));

      return {
        success: true,
        message: "تم إزالة الطبيب من العيادة بنجاح",
      };
    } catch (error) {
      console.error("❌ Error removing staff:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء إزالة الموظف");
    }
  });

// ============== UPDATE SERVICES ==============
export const updateClinicServicesProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      services: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedClinic] = await db
        .update(clinics)
        .set({
          services: input.services,
          updatedAt: now,
        })
        .where(eq(clinics.id, input.clinicId))
        .returning();

      return {
        success: true,
        message: "تم تحديث الخدمات بنجاح",
        clinic: updatedClinic,
      };
    } catch (error) {
      console.error("❌ Error updating services:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الخدمات");
    }
  });

// ============== UPDATE CLINIC IMAGES ==============
export const updateClinicImagesProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      images: z.array(z.string()),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      const [updatedClinic] = await db
        .update(clinics)
        .set({
          images: JSON.stringify(input.images),
          updatedAt: now,
        })
        .where(eq(clinics.id, input.clinicId))
        .returning();

      return {
        success: true,
        message: "تم تحديث الصور بنجاح",
        clinic: updatedClinic,
      };
    } catch (error) {
      console.error("❌ Error updating images:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الصور");
    }
  });

// ============== GET SUBSCRIPTION STATUS ==============
export const getClinicSubscriptionProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const [clinic] = await db
        .select({
          id: clinics.id,
          name: clinics.name,
          isActive: clinics.isActive,
          activationStartDate: clinics.activationStartDate,
          activationEndDate: clinics.activationEndDate,
          needsRenewal: clinics.needsRenewal,
        })
        .from(clinics)
        .where(eq(clinics.id, input.clinicId))
        .limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Calculate subscription status
      const now = new Date();
      const endDate = clinic.activationEndDate ? new Date(clinic.activationEndDate) : null;
      const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

      return {
        success: true,
        subscription: {
          isActive: clinic.isActive,
          startDate: clinic.activationStartDate,
          endDate: clinic.activationEndDate,
          needsRenewal: clinic.needsRenewal,
          daysRemaining,
          status: clinic.isActive ? (daysRemaining && daysRemaining < 30 ? "expiring_soon" : "active") : "inactive",
        },
      };
    } catch (error) {
      console.error("❌ Error getting subscription:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب حالة الاشتراك");
    }
  });
