import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, clinics, veterinarians, users, vetPermissions, notifications, clinicStaff } from "../../../../db";

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
          doctors: clinic.doctors,
          facebook: clinic.facebook,
          instagram: clinic.instagram,
          whatsapp: clinic.whatsapp,
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

// ============== GET CLINIC STAFF (UPDATED) ==============
export const getClinicStaffProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      // Get all active staff using clinic_staff table
      const staff = await db
        .select({
          staffId: clinicStaff.id,
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
          // Staff assignment info
          assignedAt: clinicStaff.assignedAt,
          role: clinicStaff.role,
          status: clinicStaff.status,
          notes: clinicStaff.notes,
        })
        .from(clinicStaff)
        .innerJoin(veterinarians, eq(clinicStaff.veterinarianId, veterinarians.id))
        .innerJoin(users, eq(veterinarians.userId, users.id))
        .where(and(eq(clinicStaff.clinicId, input.clinicId), eq(clinicStaff.isActive, true)));

      return {
        success: true,
        staff: staff.map((s) => ({
          staffId: s.staffId,
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
          assignedAt: s.assignedAt,
          role: s.role,
          status: s.status,
          notes: s.notes,
        })),
      };
    } catch (error) {
      console.error("❌ Error getting clinic staff:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب موظفي العيادة");
    }
  });

// ============== ADD STAFF MEMBER (UPDATED) ==============
export const addClinicStaffProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      email: z.string().email("البريد الإلكتروني غير صحيح"),
      licenseNumber: z.string().optional(),
      specialization: z.string().optional(),
      experience: z.number().optional(),
      consultationFee: z.number().optional(),
      role: z.enum(["all", "view_edit_pets", "view_only", "appointments_only"]).default("view_edit_pets"),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;

      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

      if (!user) {
        throw new Error("المستخدم غير موجود");
      }

      // Check if user already has a veterinarian record
      let [existingVet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, user.id)).limit(1);

      let veterinarianId: number;

      // If vet doesn't exist, create one
      if (!existingVet) {
        const [newVet] = await db
          .insert(veterinarians)
          .values({
            userId: user.id,
            licenseNumber: input.licenseNumber,
            specialization: input.specialization,
            experience: input.experience,
            consultationFee: input.consultationFee,
            isVerified: false,
          })
          .returning();
        veterinarianId = newVet.id;
      } else {
        veterinarianId = existingVet.id;

        // Update vet info if provided
        if (input.licenseNumber || input.specialization || input.experience || input.consultationFee) {
          await db
            .update(veterinarians)
            .set({
              licenseNumber: input.licenseNumber || existingVet.licenseNumber,
              specialization: input.specialization || existingVet.specialization,
              experience: input.experience || existingVet.experience,
              consultationFee: input.consultationFee || existingVet.consultationFee,
              updatedAt: new Date(),
            })
            .where(eq(veterinarians.id, veterinarianId));
        }
      }

      // Check if already assigned to this clinic
      const [existing] = await db
        .select()
        .from(clinicStaff)
        .where(
          and(
            eq(clinicStaff.clinicId, input.clinicId),
            eq(clinicStaff.veterinarianId, veterinarianId),
            eq(clinicStaff.isActive, true)
          )
        )
        .limit(1);

      if (existing) {
        throw new Error("هذا الطبيب موجود بالفعل في العيادة");
      }

      // Add to clinic staff
      const [staffAssignment] = await db
        .insert(clinicStaff)
        .values({
          clinicId: input.clinicId,
          veterinarianId: veterinarianId,
          userId: user.id,
          addedBy: userId,
          role: input.role,
          notes: input.notes,
          status: "active",
          isActive: true,
        })
        .returning();

      // Get clinic name for notification
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);

      // Send notification
      await db.insert(notifications).values({
        userId: user.id,
        title: "تمت إضافتك كطبيب في عيادة",
        message: `تمت إضافتك إلى عيادة ${clinic?.name || "عيادة جديدة"} كعضو في الفريق الطبي.`,
        type: "vet_added",
        data: {
          clinicId: input.clinicId,
          veterinarianId: veterinarianId,
          staffId: staffAssignment.id,
        },
      });

      return {
        success: true,
        message: "تم إضافة الطبيب بنجاح",
        staffAssignment,
      };
    } catch (error) {
      console.error("❌ Error adding staff:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الموظف");
    }
  });

// ============== REMOVE STAFF MEMBER (UPDATED) ==============
export const removeClinicStaffProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      veterinarianId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const now = new Date();

      // Verify staff assignment exists
      const [staffAssignment] = await db
        .select()
        .from(clinicStaff)
        .where(
          and(
            eq(clinicStaff.clinicId, input.clinicId),
            eq(clinicStaff.veterinarianId, input.veterinarianId),
            eq(clinicStaff.isActive, true)
          )
        )
        .limit(1);

      if (!staffAssignment) {
        throw new Error("الطبيب غير موجود في هذه العيادة");
      }

      // Mark as inactive in clinic staff
      await db
        .update(clinicStaff)
        .set({
          isActive: false,
          status: "removed",
          removedAt: now,
          updatedAt: now,
        })
        .where(eq(clinicStaff.id, staffAssignment.id));

      // Deactivate permissions
      await db
        .update(vetPermissions)
        .set({
          isActive: false,
          updatedAt: now,
        })
        .where(
          and(eq(vetPermissions.clinicId, input.clinicId), eq(vetPermissions.veterinarianId, input.veterinarianId))
        );

      // Send notification
      await db.insert(notifications).values({
        userId: staffAssignment.userId,
        title: "تم إزالتك من عيادة",
        message: "تم إزالتك من الفريق الطبي للعيادة.",
        type: "vet_removed",
        data: {
          clinicId: input.clinicId,
          veterinarianId: input.veterinarianId,
        },
      });

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
