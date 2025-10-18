import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, appointments } from "../../../../db";

const createAppointmentSchema = z.object({
  userId: z.number(),
  vetId: z.number(),
  petId: z.number(),
  clinicId: z.number().optional(),
  appointmentDate: z.date(),
  type: z.string().min(1),
  notes: z.string().optional(),
  fee: z.number().optional(),
});

export const createAppointmentProcedure = publicProcedure.input(createAppointmentSchema).mutation(async ({ input }) => {
  try {
    const [newAppointment] = await db
      .insert(appointments)
      .values({
        userId: input.userId,
        vetId: input.vetId,
        petId: input.petId,
        clinicId: input.clinicId,
        appointmentDate: Math.floor(input.appointmentDate.getTime() / 1000),
        type: input.type,
        notes: input.notes,
        fee: input.fee,
      })
      .returning();

    return {
      success: true,
      appointment: newAppointment,
    };
  } catch (error) {
    console.error("Error creating appointment:", error);
    throw new Error("Failed to create appointment");
  }
});
