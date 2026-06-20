import { z } from "zod";
import { eq, desc, max, sql, or, isNotNull, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, pets, users, medicalRecords, vaccinations, petReminders, approvedClinicAccess } from "../../../../db";

export const getClinicLatestPetsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      const latestMedical = db
        .select({ petId: medicalRecords.petId, medicalDate: max(medicalRecords.date).as("medicalDate") })
        .from(medicalRecords)
        .where(eq(medicalRecords.clinicId, input.clinicId))
        .groupBy(medicalRecords.petId)
        .as("latestMedical");

      const latestVaccination = db
        .select({ petId: vaccinations.petId, vaccinationDate: max(vaccinations.date).as("vaccinationDate") })
        .from(vaccinations)
        .where(eq(vaccinations.clinicId, input.clinicId))
        .groupBy(vaccinations.petId)
        .as("latestVaccination");

      const latestReminder = db
        .select({ petId: petReminders.petId, reminderDate: max(petReminders.reminderDate).as("reminderDate") })
        .from(petReminders)
        .where(eq(petReminders.clinicId, input.clinicId))
        .groupBy(petReminders.petId)
        .as("latestReminder");

      const lastActionAt = sql<string>`GREATEST(
        COALESCE(${latestMedical.medicalDate}, '1970-01-01'::timestamptz),
        COALESCE(${latestVaccination.vaccinationDate}, '1970-01-01'::timestamptz),
        COALESCE(${latestReminder.reminderDate}, '1970-01-01'::timestamptz)
      )`;

      const clinicPets = await db
        .select({
          id: pets.id,
          name: pets.name,
          type: pets.type,
          breed: pets.breed,
          age: pets.age,
          weight: pets.weight,
          color: pets.color,
          gender: pets.gender,
          image: pets.image,
          ownerName: users.name,
          ownerPhone: users.phone,
          createdAt: pets.createdAt,
          hasMedical: sql<boolean>`${latestMedical.medicalDate} IS NOT NULL`,
          hasVaccination: sql<boolean>`${latestVaccination.vaccinationDate} IS NOT NULL`,
          hasReminder: sql<boolean>`${latestReminder.reminderDate} IS NOT NULL`,
          latestMedicalDate: latestMedical.medicalDate,
          latestVaccinationDate: latestVaccination.vaccinationDate,
          latestReminderDate: latestReminder.reminderDate,
          lastActionAt,
        })
        .from(pets)
        .leftJoin(users, eq(users.id, pets.ownerId))
        .leftJoin(latestMedical, eq(latestMedical.petId, pets.id))
        .leftJoin(latestVaccination, eq(latestVaccination.petId, pets.id))
        .leftJoin(latestReminder, eq(latestReminder.petId, pets.id))
        .where(
          or(
            isNotNull(latestMedical.medicalDate),
            isNotNull(latestVaccination.vaccinationDate),
            isNotNull(latestReminder.reminderDate)
          )
        )
        .orderBy(desc(lastActionAt))
        .limit(input.limit)
        .offset(input.offset);

      const petsWithStatus = clinicPets.map((pet) => {
        const latestDate =
          pet.latestMedicalDate || pet.latestVaccinationDate || pet.latestReminderDate
            ? new Date(
                Math.max(
                  pet.latestMedicalDate ? new Date(pet.latestMedicalDate).getTime() : 0,
                  pet.latestVaccinationDate ? new Date(pet.latestVaccinationDate).getTime() : 0,
                  pet.latestReminderDate ? new Date(pet.latestReminderDate).getTime() : 0
                )
              )
            : null;

        const status = pet.hasMedical ? "تحت العلاج" : pet.hasVaccination ? "متعافي" : "فحص دوري";
        const lastVisit = latestDate ? latestDate.toLocaleDateString("ar-SA") : "لا توجد زيارات";

        return {
          ...pet,
          owner: pet.ownerName,
          status,
          lastVisit,
        };
      });

      return {
        success: true,
        pets: petsWithStatus,
      };
    } catch (error) {
      console.error("Error fetching clinic latest pets:", error);
      throw new Error("فشل في جلب بيانات الحيوانات");
    }
  });

// Remove all clinic data for a specific pet (records, vaccinations, reminders, access)
export const removeClinicPetDataProcedure = protectedProcedure
  .input(z.object({ clinicId: z.number(), petId: z.string() }))
  .mutation(async ({ input }) => {
    const { clinicId, petId } = input;
    await Promise.all([
      db.delete(medicalRecords).where(and(eq(medicalRecords.clinicId, clinicId), eq(medicalRecords.petId, petId))),
      db.delete(vaccinations).where(and(eq(vaccinations.clinicId, clinicId), eq(vaccinations.petId, petId))),
      db.delete(petReminders).where(and(eq(petReminders.clinicId, clinicId), eq(petReminders.petId, petId))),
      db.delete(approvedClinicAccess).where(and(eq(approvedClinicAccess.clinicId, clinicId), eq(approvedClinicAccess.petId, petId))),
    ]);
    return { success: true };
  });
