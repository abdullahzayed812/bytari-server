import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, poultryFarms, users } from "../../../../db";
import { eq } from "drizzle-orm";

export const getUserFarmsAssignmentProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    try {
      const userFarms = await db
        .select()
        .from(poultryFarms)
        .where(eq(poultryFarms.ownerId, ctx.user.id));

      return userFarms;
    } catch (error) {
      console.error("Error fetching user farms:", error);
      throw new Error("Failed to fetch farms");
    }
  }
);

export const getAllFieldsForAdminAssignmentProcedure = protectedProcedure
  .input(z.object({ adminId: z.number() }))
  .query(async ({ input, ctx }) => {
    try {
      // In real app, check admin permissions here

      const fields = await db
        .select({
          id: poultryFarms.id,
          name: poultryFarms.name,
          location: poultryFarms.location,
          ownerName: users.name,
          ownerEmail: users.email,
          ownerPhone: users.phone,
          assignedVetId: poultryFarms.vetId,
          assignedSupervisorId: poultryFarms.supervisorId,
          status: poultryFarms.status,
          createdAt: poultryFarms.createdAt,
        })
        .from(poultryFarms)
        .leftJoin(users, eq(poultryFarms.ownerId, users.id));

      return fields;
    } catch (error) {
      console.error("Error fetching all fields for admin:", error);
      throw new Error("Failed to fetch fields");
    }
  });
