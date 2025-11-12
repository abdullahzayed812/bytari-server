import { z } from "zod";
import { eq, desc, and, lt } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, vaccinations, pets, users } from "../../../../db";

// Status enum for validation
const VaccinationStatus = z.enum(["scheduled", "completed", "cancelled", "overdue"]);

// Get all vaccinations for a clinic
export const getClinicVaccinationsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      status: z.enum(["all", "scheduled", "completed", "cancelled", "overdue"]).optional().default("all"),
    })
  )
  .query(async ({ input }) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build where conditions based on status filter
      let whereConditions = eq(vaccinations.clinicId, input.clinicId);

      if (input.status !== "all") {
        if (input.status === "overdue") {
          // Overdue: scheduled vaccinations with date in the past
          whereConditions = and(
            eq(vaccinations.clinicId, input.clinicId),
            eq(vaccinations.status, "scheduled"),
            lt(vaccinations.date, today)
          );
        } else {
          whereConditions = and(eq(vaccinations.clinicId, input.clinicId), eq(vaccinations.status, input.status));
        }
      }

      const vaccinationsQuery = db
        .select({
          id: vaccinations.id,
          petName: pets.name,
          petType: pets.type,
          ownerName: users.name,
          vaccineName: vaccinations.name,
          scheduledDate: vaccinations.date,
          nextDate: vaccinations.nextDate,
          status: vaccinations.status, // Include status from database
          notes: vaccinations.notes,
          createdAt: vaccinations.createdAt,
        })
        .from(vaccinations)
        .innerJoin(pets, eq(pets.id, vaccinations.petId))
        .innerJoin(users, eq(users.id, pets.ownerId))
        .where(whereConditions)
        .orderBy(desc(vaccinations.date));

      const allVaccinations = await vaccinationsQuery;

      // Process vaccinations to add computed fields
      const processedVaccinations = allVaccinations.map((vaccination) => {
        const scheduledDate = new Date(vaccination.scheduledDate);
        const isOverdue = vaccination.status === "scheduled" && scheduledDate < today;

        // Use database status, but override to "overdue" if applicable
        let finalStatus = vaccination.status;
        if (isOverdue && vaccination.status === "scheduled") {
          finalStatus = "overdue";
        }

        // Format date and time
        const formattedDate = scheduledDate.toISOString().split("T")[0];
        const formattedTime = scheduledDate.toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        // Extract vaccine type from name (simplified)
        const vaccineType = vaccination.vaccineName.includes("ثلاثي")
          ? "FVRCP"
          : vaccination.vaccineName.includes("شامل")
          ? "DHPP"
          : vaccination.vaccineName.includes("أرانب")
          ? "RHD"
          : vaccination.vaccineName.includes("طيور")
          ? "Avian Pox"
          : vaccination.vaccineName.includes("كلب")
          ? "Rabies"
          : "General";

        return {
          id: vaccination.id.toString(),
          petName: vaccination.petName,
          petType: vaccination.petType,
          ownerName: vaccination.ownerName,
          vaccineName: vaccination.vaccineName,
          vaccineType: vaccineType,
          scheduledDate: formattedDate,
          scheduledTime: formattedTime,
          status: finalStatus,
          doseNumber: 1, // This should be tracked in a separate field
          totalDoses: 3, // This should be tracked in a separate field
          nextDueDate: vaccination.nextDate
            ? new Date(vaccination.nextDate).toISOString().split("T")[0]
            : formattedDate,
          notes: vaccination.notes || "لا توجد ملاحظات",
          veterinarian: "د. محمد أحمد", // This should come from veterinarians table
          createdDate: vaccination.createdAt.toISOString().split("T")[0],
        };
      });

      return {
        success: true,
        vaccinations: processedVaccinations,
      };
    } catch (error) {
      console.error("Error fetching clinic vaccinations:", error);
      throw new Error("فشل في جلب بيانات التطعيمات");
    }
  });

// Update vaccination status
export const updateVaccinationStatusProcedure = protectedProcedure
  .input(
    z.object({
      vaccinationId: z.number(),
      status: z.enum(["scheduled", "completed", "cancelled"]),
      nextDate: z.date().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const updateData: any = {
        status: input.status,
        updatedAt: new Date(),
      };

      // Add notes if provided
      if (input.notes) {
        updateData.notes = input.notes;
      }

      // Set nextDate for completed vaccinations
      if (input.status === "completed" && input.nextDate) {
        updateData.nextDate = input.nextDate;
      }

      // If cancelling, clear nextDate
      if (input.status === "cancelled") {
        updateData.nextDate = null;
      }

      await db.update(vaccinations).set(updateData).where(eq(vaccinations.id, input.vaccinationId));

      return {
        success: true,
        message: "تم تحديث حالة التطعيم بنجاح",
      };
    } catch (error) {
      console.error("Error updating vaccination status:", error);
      throw new Error("فشل في تحديث حالة التطعيم");
    }
  });

// Create new vaccination
export const createVaccinationProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      name: z.string(),
      date: z.date(),
      status: z.enum(["scheduled", "completed"]).default("scheduled"),
      notes: z.string().optional(),
      nextDate: z.date().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [newVaccination] = await db
        .insert(vaccinations)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          name: input.name,
          date: input.date,
          status: input.status,
          notes: input.notes,
          nextDate: input.status === "completed" ? input.nextDate : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        success: true,
        message: "تم إنشاء التطعيم بنجاح",
        vaccination: newVaccination,
      };
    } catch (error) {
      console.error("Error creating vaccination:", error);
      throw new Error("فشل في إنشاء التطعيم");
    }
  });

// Reschedule vaccination
export const rescheduleVaccinationProcedure = protectedProcedure
  .input(
    z.object({
      vaccinationId: z.number(),
      newDate: z.date(),
      status: z.enum(["scheduled", "completed"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const updateData: any = {
        date: input.newDate,
        updatedAt: new Date(),
      };

      // Update status if provided
      if (input.status) {
        updateData.status = input.status;
      }

      await db.update(vaccinations).set(updateData).where(eq(vaccinations.id, input.vaccinationId));

      return {
        success: true,
        message: "تم تأجيل موعد التطعيم بنجاح",
      };
    } catch (error) {
      console.error("Error rescheduling vaccination:", error);
      throw new Error("فشل في تأجيل موعد التطعيم");
    }
  });

// Get vaccination statistics
export const getVaccinationStatsProcedure = protectedProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    try {
      const clinicVaccinations = await db
        .select({
          status: vaccinations.status,
          date: vaccinations.date,
        })
        .from(vaccinations)
        .where(eq(vaccinations.clinicId, input.clinicId));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        total: clinicVaccinations.length,
        scheduled: clinicVaccinations.filter((v) => v.status === "scheduled" && new Date(v.date) >= today).length,
        completed: clinicVaccinations.filter((v) => v.status === "completed").length,
        cancelled: clinicVaccinations.filter((v) => v.status === "cancelled").length,
        overdue: clinicVaccinations.filter((v) => v.status === "scheduled" && new Date(v.date) < today).length,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error fetching vaccination stats:", error);
      throw new Error("فشل في جلب إحصائيات التطعيمات");
    }
  });
