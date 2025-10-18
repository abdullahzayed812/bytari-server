import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, appointments } from "../../../../db";

export const listAppointmentsProcedure = publicProcedure
  .input(
    z
      .object({
        userId: z.number().optional(),
        vetId: z.number().optional(),
        clinicId: z.number().optional(),
      })
      .optional()
  )
  .query(async ({ input }) => {
    try {
      let query = db.select().from(appointments);

      if (input?.userId) {
        query = query.where((row) => row.userId.eq(input.userId));
      }

      if (input?.vetId) {
        query = query.where((row) => row.vetId.eq(input.vetId));
      }

      if (input?.clinicId) {
        query = query.where((row) => row.clinicId.eq(input.clinicId));
      }

      const results = await query.orderBy(appointments);

      return results;
    } catch (error) {
      console.error("Error fetching appointments:", error);
      throw new Error("Failed to fetch appointments");
    }
  });
