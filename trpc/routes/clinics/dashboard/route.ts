import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, clinics, clinicStats, pets, appointments } from "../../../../db";
import { eq, desc } from "drizzle-orm";

export const getClinicDashboardDataProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { clinicId } = input;

      // Get clinic details
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Get clinic stats
      const [stats] = await db.select().from(clinicStats).where(eq(clinicStats.clinicId, clinicId)).limit(1);

      // Get recent animals (last 5 appointments)
      const recentAppointments = await db
        .select({
          pet: pets,
          appointment: appointments,
        })
        .from(appointments)
        .where(eq(appointments.clinicId, clinicId))
        .orderBy(desc(appointments.appointmentDate))
        .limit(5)
        .leftJoin(pets, eq(appointments.petId, pets.id));

      const recentAnimals = recentAppointments.map(({ pet, appointment }) => ({
        id: pet.id,
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        age: pet.age,
        owner: "محمد أحمد", // Mock data, replace with actual owner name from users table
        lastVisit: appointment.appointmentDate,
        status: appointment.status,
        image: pet.image,
        petData: pet,
      }));

      return {
        success: true,
        clinic: {
          ...clinic,
          // workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null,
          // services: clinic.services ? JSON.parse(clinic.services) : [],
          // images: clinic.images ? JSON.parse(clinic.images) : [],
        },
        stats: {
          totalAnimals: stats?.totalAnimals || 0,
          activePatients: stats?.activePatients || 0,
          completedTreatments: stats?.completedTreatments || 0,
        },
        recentAnimals,
      };
    } catch (error) {
      console.error("Error getting clinic dashboard data:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب بيانات لوحة العيادة");
    }
  });
