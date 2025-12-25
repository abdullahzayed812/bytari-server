import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { fieldAssignments, poultryFarms, users, veterinarians } from "../../../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const fieldAssignmentsRouter = {
  getAll: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const assignmentList = await db
          .select({
            id: fieldAssignments.id,
            farmName: poultryFarms.name,
            vetName: users.name,
            supervisorName: users.name,
            assignedDate: fieldAssignments.assignedDate,
            status: fieldAssignments.status,
          })
          .from(fieldAssignments)
          .leftJoin(poultryFarms, eq(fieldAssignments.farmId, poultryFarms.id))
          .leftJoin(veterinarians, eq(fieldAssignments.veterinarianId, veterinarians.id))
          .leftJoin(users, eq(veterinarians.userId, users.id))
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(fieldAssignments.assignedDate));

        return {
          success: true,
          assignments: assignmentList,
          total: assignmentList.length,
          message: "تم جلب التعيينات الميدانية بنجاح",
        };
      } catch (error) {
        console.error("Error getting field assignments:", error);
        return {
          success: false,
          assignments: [],
          total: 0,
          message: "حدث خطأ في جلب التعيينات الميدانية",
        };
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        farmId: z.number(),
        veterinarianId: z.number(),
        supervisorId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [newAssignment] = await db
          .insert(fieldAssignments)
          .values({
            farmId: input.farmId,
            veterinarianId: input.veterinarianId,
            supervisorId: input.supervisorId,
            notes: input.notes,
            status: "active",
          })
          .returning();
        return {
          success: true,
          assignmentId: newAssignment.id,
          message: "تم إنشاء التعيين بنجاح",
        };
      } catch (error) {
        console.error("Error creating field assignment:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء إنشاء التعيين",
        };
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        assignmentId: z.string(),
        farmId: z.number().optional(),
        veterinarianId: z.number().optional(),
        supervisorId: z.number().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "completed", "cancelled"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db
          .update(fieldAssignments)
          .set(input)
          .where(eq(fieldAssignments.id, parseInt(input.assignmentId)));
        return {
          success: true,
          message: "تم تحديث التعيين بنجاح",
        };
      } catch (error) {
        console.error("Error updating field assignment:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء تحديث التعيين",
        };
      }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        assignmentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db.delete(fieldAssignments).where(eq(fieldAssignments.id, parseInt(input.assignmentId)));
        return {
          success: true,
          message: "تم حذف التعيين بنجاح",
        };
      } catch (error) {
        console.error("Error deleting field assignment:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء حذف التعيين",
        };
      }
    }),
};

export const getAvailableVets = publicProcedure.query(async () => {
  const vets = await db
    .select({
      id: veterinarians.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      specialization: veterinarians.specialization,
    })
    .from(veterinarians)
    .innerJoin(users, eq(veterinarians.userId, users.id))
    .where(eq(users.userType, "veterinarian"));
  return vets;
});

export const getAvailableSupervisors = publicProcedure.query(async () => {
  const supervisors = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.userType, "admin"));
  return supervisors;
});
