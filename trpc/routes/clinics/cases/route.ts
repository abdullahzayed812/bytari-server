
import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, appointments, pets, users } from "../../../../db";
import { and, eq, gte, lte, lt } from "drizzle-orm";

export const getTodayCasesProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { clinicId } = input;

      const today = new Date();
      const startOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const endOfToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1
      );

      const todayAppointments = await db
        .select({
          appointment: appointments,
          pet: pets,
          owner: users,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinicId),
            gte(appointments.appointmentDate, startOfToday),
            lt(appointments.appointmentDate, endOfToday)
          )
        )
        .leftJoin(pets, eq(appointments.petId, pets.id))
        .leftJoin(users, eq(appointments.userId, users.id));

      const todayCases = todayAppointments.map(
        ({ appointment, pet, owner }) => ({
          id: appointment.id,
          petName: pet.name,
          petType: pet.type,
          ownerName: owner.name,
          appointmentTime: appointment.appointmentDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: appointment.status,
          priority: "normal", // You might want to add a priority field to the appointments table
          reason: appointment.type,
          notes: appointment.notes,
        })
      );

      return {
        success: true,
        todayCases,
      };
    } catch (error) {
      console.error("Error getting today's cases:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء جلب حالات اليوم"
      );
    }
  });
