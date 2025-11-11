import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, pets, users, approvedClinicAccess, medicalRecords } from "../../../../db";

export const getClinicLatestPetsProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      limit: z.number().optional().default(10),
    })
  )
  .query(async ({ input }) => {
    try {
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
        .orderBy(desc(approvedClinicAccess.grantedAt)) // Order by when access was granted
        .limit(input.limit);

      // Add status based on whether pet has medical records
      const petsWithStatus = await Promise.all(
        clinicPets.map(async (pet) => {
          const rawMedicalRecords = await db
            .select({ id: medicalRecords.id })
            .from(medicalRecords)
            .where(and(eq(medicalRecords.petId, pet.id), eq(medicalRecords.clinicId, input.clinicId)))
            .limit(1);

          return {
            ...pet,
            owner: pet.ownerName,
            status: rawMedicalRecords.length > 0 ? "تحت العلاج" : "فحص دوري",
            lastVisit: rawMedicalRecords.length > 0 ? "مؤخراً" : "لا توجد زيارات",
          };
        })
      );

      return {
        success: true,
        pets: petsWithStatus,
      };
    } catch (error) {
      console.error("Error fetching clinic latest pets:", error);
      throw new Error("فشل في جلب بيانات الحيوانات");
    }
  });
