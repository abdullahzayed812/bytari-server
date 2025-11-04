import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, appointments, pets, users } from "../../../../db";
import { and, eq, desc, inArray, gte } from "drizzle-orm";

export const getClinicAnimalsProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { clinicId } = input;

      const clinicAppointments = await db
        .selectDistinct({ petId: appointments.petId })
        .from(appointments)
        .where(eq(appointments.clinicId, clinicId));

      const petIds = clinicAppointments.map((a) => a.petId);

      if (petIds.length === 0) {
        return {
          success: true,
          animals: [],
        };
      }

      const clinicPets = await db
        .select({
          pet: pets,
          owner: users,
        })
        .from(pets)
        .where(inArray(pets.id, petIds))
        .leftJoin(users, eq(pets.ownerId, users.id));

      const animals = await Promise.all(
        clinicPets.map(async ({ pet, owner }) => {
          const [lastAppointment] = await db
            .select()
            .from(appointments)
            .where(and(eq(appointments.petId, pet.id), eq(appointments.clinicId, clinicId)))
            .orderBy(desc(appointments.appointmentDate))
            .limit(1);

          const [nextAppointment] = await db
            .select()
            .from(appointments)
            .where(
              and(
                eq(appointments.petId, pet.id),
                eq(appointments.clinicId, clinicId),
                gte(appointments.appointmentDate, new Date())
              )
            )
            .orderBy(appointments.appointmentDate)
            .limit(1);

          return {
            id: pet.id,
            name: pet.name,
            type: pet.type,
            breed: pet.breed,
            age: pet.age,
            owner: owner.name,
            ownerPhone: owner.phone,
            lastVisit: lastAppointment?.appointmentDate.toISOString(),
            nextAppointment: nextAppointment?.appointmentDate.toISOString(),
            status: lastAppointment?.status || "unknown",
            image: pet.image,
            petData: pet,
            medicalHistory: [], // This can be fetched from a dedicated medical_records table
          };
        })
      );

      return {
        success: true,
        animals,
      };
    } catch (error) {
      console.error("Error getting clinic animals:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب حيوانات العيادة");
    }
  });
