import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { courses, courseRegistrations } from "../../../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const coursesRouter = {
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
        const courseList = await db
          .select()
          .from(courses)
          .limit(input.limit)
          .offset(input.offset)
          .orderBy(desc(courses.createdAt));

        const coursesWithCounts = await Promise.all(
          courseList.map(async (course) => {
            const [{ count }] = await db
              .select({ count: sql<number>`count(*)` })
              .from(courseRegistrations)
              .where(eq(courseRegistrations.courseId, course.id));
            return {
              ...course,
              registrations: Number(count) || 0,
            };
          })
        );

        return {
          success: true,
          courses: coursesWithCounts,
          total: coursesWithCounts.length,
          message: "تم جلب الدورات بنجاح",
        };
      } catch (error) {
        console.error("Error getting courses:", error);
        return {
          success: false,
          courses: [],
          total: 0,
          message: "حدث خطأ في جلب الدورات",
        };
      }
    }),

  create: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        title: z.string(),
        instructor: z.string(),
        date: z.string(),
        description: z.string(),
        content: z.string(),
        type: z.enum(["course", "seminar"]),
        category: z.string(),
        location: z.string(),
        duration: z.string(),
        capacity: z.number(),
        price: z.string(),
        registrationType: z.enum(["link", "internal"]),
        courseUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [newCourse] = await db
          .insert(courses)
          .values({
            ...input,
            status: "active",
          })
          .returning();
        return {
          success: true,
          courseId: newCourse.id,
          message: "تم إنشاء الدورة بنجاح",
        };
      } catch (error) {
        console.error("Error creating course:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء إنشاء الدورة",
        };
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        courseId: z.string(),
        title: z.string().optional(),
        instructor: z.string().optional(),
        date: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        type: z.enum(["course", "seminar"]).optional(),
        category: z.string().optional(),
        location: z.string().optional(),
        duration: z.string().optional(),
        capacity: z.number().optional(),
        price: z.string().optional(),
        registrationType: z.enum(["link", "internal"]).optional(),
        courseUrl: z.string().optional(),
        status: z.enum(["active", "inactive", "completed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db
          .update(courses)
          .set(input)
          .where(eq(courses.id, parseInt(input.courseId)));
        return {
          success: true,
          message: "تم تحديث الدورة بنجاح",
        };
      } catch (error) {
        console.error("Error updating course:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء تحديث الدورة",
        };
      }
    }),

  delete: protectedProcedure
    .input(
      z.object({
        adminId: z.number(),
        courseId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await db.delete(courses).where(eq(courses.id, parseInt(input.courseId)));
        return {
          success: true,
          message: "تم حذف الدورة بنجاح",
        };
      } catch (error) {
        console.error("Error deleting course:", error);
        return {
          success: false,
          message: "حدث خطأ أثناء حذف الدورة",
        };
      }
    }),
};
