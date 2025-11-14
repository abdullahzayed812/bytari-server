import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, users, veterinarians, vetPermissions } from "../../../../db";

export const updateStaffPermissionsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      permissions: z.array(
        z.object({
          veterinarianId: z.number(),
          permission: z.enum(["all", "view_edit_pets", "view_only", "appointments_only"]),
        })
      ),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const updatePromises = input.permissions.map(async ({ veterinarianId, permission }) => {
        // Verify veterinarian belongs to this clinic
        const [vet] = await db
          .select()
          .from(veterinarians)
          .where(and(eq(veterinarians.id, veterinarianId), eq(veterinarians.clinicId, input.clinicId)))
          .limit(1);

        if (!vet) {
          throw new Error(`الطبيب ذو المعرف ${veterinarianId} غير موجود في هذه العيادة`);
        }

        // Map permission to granular permissions
        const permissionMap = {
          all: {
            canViewPets: true,
            canEditPets: true,
            canAddMedicalRecords: true,
            canAddVaccinations: true,
            canManageAppointments: true,
            canViewReports: true,
            canManageStaff: true,
            canManageSettings: true,
          },
          view_edit_pets: {
            canViewPets: true,
            canEditPets: true,
            canAddMedicalRecords: true,
            canAddVaccinations: true,
            canManageAppointments: true,
            canViewReports: false,
            canManageStaff: false,
            canManageSettings: false,
          },
          view_only: {
            canViewPets: true,
            canEditPets: false,
            canAddMedicalRecords: false,
            canAddVaccinations: false,
            canManageAppointments: false,
            canViewReports: false,
            canManageStaff: false,
            canManageSettings: false,
          },
          appointments_only: {
            canViewPets: false,
            canEditPets: false,
            canAddMedicalRecords: false,
            canAddVaccinations: false,
            canManageAppointments: true,
            canViewReports: false,
            canManageStaff: false,
            canManageSettings: false,
          },
        };

        // Check if permission record exists
        const [existingPermission] = await db
          .select()
          .from(vetPermissions)
          .where(and(eq(vetPermissions.veterinarianId, veterinarianId), eq(vetPermissions.clinicId, input.clinicId)))
          .limit(1);

        if (existingPermission) {
          // Update existing permission
          await db
            .update(vetPermissions)
            .set({
              role: permission,
              ...permissionMap[permission],
              updatedAt: new Date(),
            })
            .where(eq(vetPermissions.id, existingPermission.id));
        } else {
          // Create new permission
          await db.insert(vetPermissions).values({
            veterinarianId,
            clinicId: input.clinicId,
            role: permission,
            ...permissionMap[permission],
          });
        }

        return { veterinarianId, permission, updated: true };
      });

      const results = await Promise.all(updatePromises);

      return {
        success: true,
        message: "تم تحديث الصلاحيات بنجاح",
        results,
      };
    } catch (error) {
      console.error("❌ Error updating permissions:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الصلاحيات");
    }
  });

// Get staff with permissions procedure
export const getClinicStaffWithPermissionsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      // Get all veterinarians with their permissions
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
          // Permission details
          permissionRole: vetPermissions.role,
          canViewPets: vetPermissions.canViewPets,
          canEditPets: vetPermissions.canEditPets,
          canAddMedicalRecords: vetPermissions.canAddMedicalRecords,
          canAddVaccinations: vetPermissions.canAddVaccinations,
          canManageAppointments: vetPermissions.canManageAppointments,
          canViewReports: vetPermissions.canViewReports,
          canManageStaff: vetPermissions.canManageStaff,
          canManageSettings: vetPermissions.canManageSettings,
        })
        .from(veterinarians)
        .innerJoin(users, eq(veterinarians.userId, users.id))
        .leftJoin(
          vetPermissions,
          and(eq(vetPermissions.veterinarianId, veterinarians.id), eq(vetPermissions.clinicId, input.clinicId))
        )
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
          permissions: {
            role: s.permissionRole || "view_edit_pets",
            canViewPets: s.canViewPets ?? true,
            canEditPets: s.canEditPets ?? true,
            canAddMedicalRecords: s.canAddMedicalRecords ?? true,
            canAddVaccinations: s.canAddVaccinations ?? true,
            canManageAppointments: s.canManageAppointments ?? true,
            canViewReports: s.canViewReports ?? false,
            canManageStaff: s.canManageStaff ?? false,
            canManageSettings: s.canManageSettings ?? false,
          },
        })),
      };
    } catch (error) {
      console.error("❌ Error getting clinic staff with permissions:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب موظفي العيادة");
    }
  });
