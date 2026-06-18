import { z } from "zod";
import { eq, and, desc, countDistinct, count, gte, lte } from "drizzle-orm";
import { publicProcedure } from "../../../create-context";
import {
  db,
  clinics,
  clinicAppointments,
  pets,
  users,
  veterinarians,
  clinicStaff,
  vetPermissions,
  approvalRequests,
  medicalRecords,
  vaccinations,
  petReminders,
  approvedClinicAccess,
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

      // Compute clinic stats dynamically
      const [totalAnimalsRow] = await db
        .select({ count: countDistinct(medicalRecords.petId) })
        .from(medicalRecords)
        .where(eq(medicalRecords.clinicId, clinicId));

      const [totalVaccinationsRow] = await db
        .select({ count: countDistinct(vaccinations.petId) })
        .from(vaccinations)
        .where(eq(vaccinations.clinicId, clinicId));

      const [totalRemindersRow] = await db
        .select({ count: countDistinct(petReminders.petId) })
        .from(petReminders)
        .where(eq(petReminders.clinicId, clinicId));

      // Distinct pets across all three sources
      const totalAnimals =
        (totalAnimalsRow?.count ?? 0) +
        (totalVaccinationsRow?.count ?? 0) +
        (totalRemindersRow?.count ?? 0);

      const [activePatientsRow] = await db
        .select({ count: count() })
        .from(approvedClinicAccess)
        .where(and(eq(approvedClinicAccess.clinicId, clinicId), eq(approvedClinicAccess.isActive, true)));

      const [completedTreatmentsRow] = await db
        .select({ count: count() })
        .from(vaccinations)
        .where(eq(vaccinations.clinicId, clinicId));

      // Today's stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [todayRemindersRow] = await db
        .select({ count: count() })
        .from(petReminders)
        .where(and(eq(petReminders.clinicId, clinicId), gte(petReminders.reminderDate, todayStart), lte(petReminders.reminderDate, todayEnd)));

      const [todayVaccinationsRow] = await db
        .select({ count: count() })
        .from(vaccinations)
        .where(and(eq(vaccinations.clinicId, clinicId), gte(vaccinations.nextDate, todayStart), lte(vaccinations.nextDate, todayEnd)));

      const [todayAppointmentsRow] = await db
        .select({ count: count() })
        .from(clinicAppointments)
        .where(and(eq(clinicAppointments.clinicId, clinicId), gte(clinicAppointments.appointmentDate, todayStart), lte(clinicAppointments.appointmentDate, todayEnd)));

      // Distinct animals/owners that visited today (any record created today)
      const todayMedicalPets = await db
        .selectDistinct({ petId: medicalRecords.petId })
        .from(medicalRecords)
        .where(and(eq(medicalRecords.clinicId, clinicId), gte(medicalRecords.createdAt, todayStart), lte(medicalRecords.createdAt, todayEnd)));
      const todayVaccinationPets = await db
        .selectDistinct({ petId: vaccinations.petId })
        .from(vaccinations)
        .where(and(eq(vaccinations.clinicId, clinicId), gte(vaccinations.createdAt, todayStart), lte(vaccinations.createdAt, todayEnd)));
      const todayReminderPets = await db
        .selectDistinct({ petId: petReminders.petId })
        .from(petReminders)
        .where(and(eq(petReminders.clinicId, clinicId), gte(petReminders.createdAt, todayStart), lte(petReminders.createdAt, todayEnd)));
      const todayVisitorPetIds = new Set([
        ...todayMedicalPets.map((r) => r.petId),
        ...todayVaccinationPets.map((r) => r.petId),
        ...todayReminderPets.map((r) => r.petId),
      ]);
      const todayVisitors = todayVisitorPetIds.size;

      // Total distinct animals (union of petId across all clinic records)
      const distinctPetsFromRecords = await db
        .selectDistinct({ petId: medicalRecords.petId })
        .from(medicalRecords)
        .where(eq(medicalRecords.clinicId, clinicId));
      const distinctPetsFromVaccinations = await db
        .selectDistinct({ petId: vaccinations.petId })
        .from(vaccinations)
        .where(eq(vaccinations.clinicId, clinicId));
      const distinctPetsFromReminders = await db
        .selectDistinct({ petId: petReminders.petId })
        .from(petReminders)
        .where(eq(petReminders.clinicId, clinicId));
      const allPetIds = new Set([
        ...distinctPetsFromRecords.map((r) => r.petId),
        ...distinctPetsFromVaccinations.map((r) => r.petId),
        ...distinctPetsFromReminders.map((r) => r.petId),
      ]);

      const stats = {
        totalAnimals,
        activePatients: activePatientsRow?.count ?? 0,
        completedTreatments: completedTreatmentsRow?.count ?? 0,
        todayReminders: todayRemindersRow?.count ?? 0,
        todayVaccinations: todayVaccinationsRow?.count ?? 0,
        todayAppointments: todayAppointmentsRow?.count ?? 0,
        todayVisitors,
        totalDistinctAnimals: allPetIds.size,
      };

      // Get recent animals (last 5 clinic appointments) with pet + owner info
      const recentAppointments = await db
        .select({
          pet: pets,
          appointment: clinicAppointments,
          owner: users,
        })
        .from(clinicAppointments)
        .leftJoin(pets, eq(clinicAppointments.petId, pets.id))
        .leftJoin(users, eq(clinicAppointments.ownerId, users.id))
        .where(eq(clinicAppointments.clinicId, clinicId))
        .orderBy(desc(clinicAppointments.appointmentDate))
        .limit(5);

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
        stats,
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
