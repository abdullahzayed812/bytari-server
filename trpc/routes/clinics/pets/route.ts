import { z } from "zod";
import { eq, desc, and, max, sql } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, pets, users, approvedClinicAccess, medicalRecords, vaccinations, petReminders } from "../../../../db";

export const getClinicLatestPetsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      limit: z.number().optional().default(10),
    })
  )
  .query(async ({ input }) => {
    try {
      const latestMedical = db
        .select({ petId: medicalRecords.petId, latestDate: max(medicalRecords.date).as("latestDate") })
        .from(medicalRecords)
        .where(eq(medicalRecords.clinicId, input.clinicId))
        .groupBy(medicalRecords.petId)
        .as("latestMedical");

      const latestVaccination = db
        .select({ petId: vaccinations.petId, latestDate: max(vaccinations.date).as("latestDate") })
        .from(vaccinations)
        .where(eq(vaccinations.clinicId, input.clinicId))
        .groupBy(vaccinations.petId)
        .as("latestVaccination");

      const latestReminder = db
        .select({ petId: petReminders.petId, latestDate: max(petReminders.reminderDate).as("latestDate") })
        .from(petReminders)
        .where(eq(petReminders.clinicId, input.clinicId))
        .groupBy(petReminders.petId)
        .as("latestReminder");

      const lastActionAt = sql<string>`GREATEST(
        COALESCE(${latestMedical.latestDate}, '1970-01-01'::timestamptz),
        COALESCE(${latestVaccination.latestDate}, '1970-01-01'::timestamptz),
        COALESCE(${latestReminder.latestDate}, '1970-01-01'::timestamptz)
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
          createdAt: pets.createdAt,
          hasMedical: sql<boolean>`${latestMedical.latestDate} IS NOT NULL`,
          hasVaccination: sql<boolean>`${latestVaccination.latestDate} IS NOT NULL`,
          hasReminder: sql<boolean>`${latestReminder.latestDate} IS NOT NULL`,
          latestMedicalDate: latestMedical.latestDate,
          latestVaccinationDate: latestVaccination.latestDate,
          latestReminderDate: latestReminder.latestDate,
          lastActionAt,
        })
        .from(pets)
        .leftJoin(users, eq(users.id, pets.ownerId))
        .innerJoin(
          approvedClinicAccess,
          and(
            eq(approvedClinicAccess.petId, pets.id),
            eq(approvedClinicAccess.clinicId, input.clinicId),
            eq(approvedClinicAccess.isActive, true)
          )
        )
        .leftJoin(latestMedical, eq(latestMedical.petId, pets.id))
        .leftJoin(latestVaccination, eq(latestVaccination.petId, pets.id))
        .leftJoin(latestReminder, eq(latestReminder.petId, pets.id))
        .orderBy(desc(lastActionAt))
        .limit(input.limit);

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
