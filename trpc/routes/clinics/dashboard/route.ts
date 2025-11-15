import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { publicProcedure } from "../../../create-context";
import {
  db,
  clinics,
  clinicStats,
  appointments,
  pets,
  users,
  veterinarians,
  clinicStaff,
  vetPermissions,
  approvalRequests,
} from "../../../../db";

export const getClinicDashboardDataProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
      userId: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { clinicId, userId } = input;

      // Get clinic details
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Initialize permission variables
      let isOwner = false;
      let isStaff = false;
      let permissions = null;
      let staffInfo = null;

      // Check permissions if userId is provided
      if (userId) {
        // Check if user is the owner
        const [ownerRequest] = await db
          .select()
          .from(approvalRequests)
          .where(
            and(
              eq(approvalRequests.resourceId, clinicId),
              eq(approvalRequests.requesterId, userId),
              eq(approvalRequests.requestType, "clinic_activation"),
              eq(approvalRequests.status, "approved")
            )
          )
          .limit(1);

        isOwner = !!ownerRequest;

        // If not owner, check if user is staff
        if (!isOwner) {
          // Get veterinarian record
          const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, userId)).limit(1);

          if (vet) {
            // Check staff assignment
            const [staffRecord] = await db
              .select({
                staffId: clinicStaff.id,
                role: clinicStaff.role,
                status: clinicStaff.status,
                assignedAt: clinicStaff.assignedAt,
                notes: clinicStaff.notes,
                // Permissions
                permissionId: vetPermissions.id,
                permissionRole: vetPermissions.role,
                canViewPets: vetPermissions.canViewPets,
                canEditPets: vetPermissions.canEditPets,
                canAddMedicalRecords: vetPermissions.canAddMedicalRecords,
                canAddVaccinations: vetPermissions.canAddVaccinations,
                canManageAppointments: vetPermissions.canManageAppointments,
                canViewReports: vetPermissions.canViewReports,
                canManageStaff: vetPermissions.canManageStaff,
                canManageSettings: vetPermissions.canManageSettings,
                permissionIsActive: vetPermissions.isActive,
              })
              .from(clinicStaff)
              .leftJoin(
                vetPermissions,
                and(eq(vetPermissions.veterinarianId, vet.id), eq(vetPermissions.clinicId, clinicId))
              )
              .where(
                and(
                  eq(clinicStaff.clinicId, clinicId),
                  eq(clinicStaff.veterinarianId, vet.id),
                  eq(clinicStaff.isActive, true)
                )
              )
              .limit(1);

            if (staffRecord) {
              isStaff = true;

              // Build staff info
              staffInfo = {
                staffId: staffRecord.staffId,
                role: staffRecord.role,
                status: staffRecord.status,
                assignedAt: staffRecord.assignedAt,
                notes: staffRecord.notes,
              };

              // Build permissions object
              // If owner, give full permissions
              if (isOwner) {
                permissions = {
                  role: "all",
                  canViewPets: true,
                  canEditPets: true,
                  canAddMedicalRecords: true,
                  canAddVaccinations: true,
                  canManageAppointments: true,
                  canViewReports: true,
                  canManageStaff: true,
                  canManageSettings: true,
                };
              } else {
                // Use stored permissions or defaults based on role
                const role = staffRecord.permissionRole || staffRecord.role || "view_edit_pets";

                permissions = {
                  role: role,
                  canViewPets: staffRecord.canViewPets ?? true,
                  canEditPets: staffRecord.canEditPets ?? (role === "all" || role === "view_edit_pets"),
                  canAddMedicalRecords:
                    staffRecord.canAddMedicalRecords ?? (role === "all" || role === "view_edit_pets"),
                  canAddVaccinations: staffRecord.canAddVaccinations ?? (role === "all" || role === "view_edit_pets"),
                  canManageAppointments: staffRecord.canManageAppointments ?? role !== "view_only",
                  canViewReports: staffRecord.canViewReports ?? role === "all",
                  canManageStaff: staffRecord.canManageStaff ?? role === "all",
                  canManageSettings: staffRecord.canManageSettings ?? role === "all",
                };
              }
            }
          }
        } else {
          // Owner has full permissions
          permissions = {
            role: "all",
            canViewPets: true,
            canEditPets: true,
            canAddMedicalRecords: true,
            canAddVaccinations: true,
            canManageAppointments: true,
            canViewReports: true,
            canManageStaff: true,
            canManageSettings: true,
          };
        }
      }

      // Get clinic stats
      const [stats] = await db.select().from(clinicStats).where(eq(clinicStats.clinicId, clinicId)).limit(1);

      // Get recent animals (last 5 appointments) with owner info
      const recentAppointments = await db
        .select({
          pet: pets,
          appointment: appointments,
          owner: users,
        })
        .from(appointments)
        .where(eq(appointments.clinicId, clinicId))
        .orderBy(desc(appointments.appointmentDate))
        .limit(5)
        .leftJoin(pets, eq(appointments.petId, pets.id))
        .leftJoin(users, eq(pets.ownerId, users.id));

      const recentAnimals = recentAppointments.map(({ pet, appointment, owner }) => ({
        id: pet?.id,
        name: pet?.name,
        type: pet?.type,
        breed: pet?.breed,
        age: pet?.age,
        owner: owner?.name || "غير معروف",
        ownerId: owner?.id,
        ownerPhone: owner?.phone,
        ownerEmail: owner?.email,
        lastVisit: appointment.appointmentDate,
        status: appointment.status,
        image: pet?.image,
        appointmentId: appointment.id,
        appointmentType: appointment.type,
        petData: pet,
      }));

      return {
        success: true,
        clinic: {
          ...clinic,
          workingHours: clinic.workingHours,
          services: clinic.services,
          images: clinic.images,
        },
        stats: {
          totalAnimals: stats?.totalAnimals || 0,
          activePatients: stats?.activePatients || 0,
          completedTreatments: stats?.completedTreatments || 0,
        },
        recentAnimals,
        // User access information
        access: {
          isOwner,
          isStaff,
          hasAccess: isOwner || isStaff,
        },
        // Detailed permissions
        permissions,
        // Staff information (if applicable)
        staffInfo,
      };
    } catch (error) {
      console.error("Error getting clinic dashboard data:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب بيانات لوحة العيادة");
    }
  });
