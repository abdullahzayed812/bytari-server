import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../create-context";
import { db } from "../../../db";
import { courses, courseRegistrations } from "../../../db/schema";
import { eq, and, or, like, desc, sql, inArray } from "drizzle-orm";

// Schema for course data
const CourseSchema = z.object({
  title: z.string().min(1, "عنوان الدورة مطلوب"),
  organizer: z.string().min(1, "اسم المنظم مطلوب"),
  date: z.string().min(1, "تاريخ الدورة مطلوب"),
  location: z.string().min(1, "مكان الدورة مطلوب"),
  type: z.enum(["course", "seminar"]),
  duration: z.string().min(1, "مدة الدورة مطلوبة"),
  capacity: z.number().min(1, "عدد المقاعد يجب أن يكون أكبر من صفر"),
  price: z.string().min(1, "سعر الدورة مطلوب"),
  description: z.string().min(1, "وصف الدورة مطلوب"),
  category: z.string().min(1, "التصنيف مطلوب"),
  courseUrl: z.string().optional().or(z.literal("")),
  registrationType: z.enum(["link", "internal"]),
  status: z.enum(["active", "inactive", "completed"]).default("active"),
  thumbnailImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.registrationType === "link") {
    if (!data.courseUrl || data.courseUrl.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "رابط التسجيل مطلوب",
        path: ["courseUrl"],
      });
    } else {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(data.courseUrl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "رابط غير صحيح",
          path: ["courseUrl"],
        });
      }
    }
  }
});

const CourseRegistrationSchema = z.object({
  userId: z.number(),
  courseId: z.number().min(1, "معرف الدورة مطلوب"),
  courseName: z.string().min(1, "اسم الدورة مطلوب"),
  participantName: z.string().min(1, "اسم المشارك مطلوب"),
  participantEmail: z.string().email("البريد الإلكتروني غير صحيح"),
  participantPhone: z.string().min(1, "رقم الهاتف مطلوب"),
});

// Get all courses
export const getCoursesListProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number().optional(), // <-- current logged-in user
      type: z.enum(["all", "course", "seminar"]).optional().default("all"),
      status: z.enum(["all", "active", "inactive", "completed"]).optional().default("all"),
      search: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const conditions = [];

      if (input.type !== "all") conditions.push(eq(courses.type, input.type));
      if (input.status !== "all") conditions.push(eq(courses.status, input.status));

      if (input.search) {
        const searchLower = `%${input.search.toLowerCase()}%`;
        conditions.push(
          or(like(sql`LOWER(${courses.title})`, searchLower), like(sql`LOWER(${courses.organizer})`, searchLower))
        );
      }

      conditions.push(eq(courses.isPublished, true));

      // Fetch courses
      const result = await db
        .select()
        .from(courses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(courses.createdAt));

      // If userId is provided, fetch registration status
      if (input.userId) {
        const courseIds = result.map((c) => c.id);
        const registrations = await db
          .select()
          .from(courseRegistrations)
          .where(and(eq(courseRegistrations.userId, input.userId), inArray(courseRegistrations.courseId, courseIds)));

        // Map registration status to each course
        result.forEach((course) => {
          const registration = registrations.find((r) => r.courseId === course.id);
          course.userRegistrationStatus = registration ? registration.status : null;
        });
      }

      return { success: true, courses: result, total: result.length };
    } catch (error) {
      console.error("Error fetching courses:", error);
      return { success: false, error: "حدث خطأ أثناء جلب الدورات", details: String(error) };
    }
  });

// Get course by ID
export const getCourseProcedure = publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
  try {
    const [course] = await db.select().from(courses).where(eq(courses.id, input.id)).limit(1);

    if (!course) {
      return { success: false, error: "الدورة غير موجودة" };
    }

    await db
      .update(courses)
      .set({ viewCount: sql`${courses.viewCount} + 1` })
      .where(eq(courses.id, input.id));

    return { success: true, course };
  } catch (error) {
    console.error("Error fetching course:", error);
    return { success: false, error: "حدث خطأ أثناء جلب بيانات الدورة", details: String(error) };
  }
});

// Create new course (Admin only)
export const createCourseProcedure = protectedProcedure.input(CourseSchema).mutation(async ({ input, ctx }) => {
  try {
    const [newCourse] = await db
      .insert(courses)
      .values({
        ...input,
        instructorId: ctx?.user?.id,
        registered: 0,
        viewCount: 0,
        isPublished: true,
        images: input.images || [],
        tags: input.tags || [],
      })
      .returning();

    return { success: true, courseId: newCourse.id, message: "تم إنشاء الدورة بنجاح" };
  } catch (error) {
    console.error("Error creating course:", error);
    return { success: false, error: "حدث خطأ أثناء إنشاء الدورة", details: String(error) };
  }
});

// Update course (Admin only)
export const updateCourseProcedure = protectedProcedure
  .input(z.object({ id: z.number(), data: CourseSchema }))
  .mutation(async ({ input }) => {
    try {
      const [course] = await db.select().from(courses).where(eq(courses.id, input.id)).limit(1);

      if (!course) {
        return { success: false, error: "الدورة غير موجودة" };
      }

      await db
        .update(courses)
        .set({
          ...input.data,
          images: input.data.images || [],
          tags: input.data.tags || [],
          updatedAt: new Date(),
        })
        .where(eq(courses.id, input.id));

      return { success: true, message: "تم تحديث الدورة بنجاح" };
    } catch (error) {
      console.error("Error updating course:", error);
      return { success: false, error: "حدث خطأ أثناء تحديث الدورة", details: String(error) };
    }
  });

// Delete course (Admin only)
export const deleteCourseProcedure = protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ input }) => {
    try {
      const [course] = await db.select().from(courses).where(eq(courses.id, input.id)).limit(1);

      if (!course) {
        return { success: false, error: "الدورة غير موجودة" };
      }

      await db.delete(courses).where(eq(courses.id, input.id));

      return { success: true, message: "تم حذف الدورة بنجاح" };
    } catch (error) {
      console.error("Error deleting course:", error);
      return { success: false, error: "حدث خطأ أثناء حذف الدورة", details: String(error) };
    }
  });

// Register for course
export const registerForCourseProcedure = publicProcedure
  .input(CourseRegistrationSchema)
  .mutation(async ({ input }) => {
    try {
      const [course] = await db.select().from(courses).where(eq(courses.id, input.courseId)).limit(1);

      if (!course) return { success: false, error: "الدورة غير موجودة" };
      if (course.registered >= course.capacity) return { success: false, error: "الدورة مكتملة العدد" };
      if (course.status !== "active") return { success: false, error: "الدورة غير متاحة للتسجيل حالياً" };

      const existing = await db
        .select()
        .from(courseRegistrations)
        .where(
          and(
            eq(courseRegistrations.courseId, input.courseId),
            eq(courseRegistrations.participantEmail, input.participantEmail)
          )
        )
        .limit(1);

      if (existing.length > 0) return { success: false, error: "لقد قمت بالتسجيل في هذه الدورة من قبل" };

      const [newRegistration] = await db
        .insert(courseRegistrations)
        .values({ ...input, status: "pending" })
        .returning();

      return {
        success: true,
        registrationId: newRegistration.id,
        message: "تم تسجيل طلبك بنجاح. سيتم مراجعته من قبل الإدارة.",
      };
    } catch (error) {
      console.error("Error registering for course:", error);
      return { success: false, error: "حدث خطأ أثناء التسجيل", details: String(error) };
    }
  });

// Get course registrations (Admin only)
export const getCourseRegistrationsProcedure = protectedProcedure
  .input(
    z.object({
      courseId: z.number().optional(),
      status: z.enum(["all", "pending", "approved", "rejected"]).optional().default("all"),
      search: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const conditions = [];

      if (input.courseId) conditions.push(eq(courseRegistrations.courseId, input.courseId));
      if (input.status !== "all") conditions.push(eq(courseRegistrations.status, input.status));

      if (input.search) {
        const searchLower = `%${input.search.toLowerCase()}%`;
        conditions.push(
          or(
            like(sql`LOWER(${courseRegistrations.participantName})`, searchLower),
            like(sql`LOWER(${courseRegistrations.courseName})`, searchLower),
            like(sql`LOWER(${courseRegistrations.participantEmail})`, searchLower)
          )
        );
      }

      const result = await db
        .select()
        .from(courseRegistrations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(courseRegistrations.createdAt));

      return { success: true, registrations: result, total: result.length };
    } catch (error) {
      console.error("Error fetching registrations:", error);
      return { success: false, error: "حدث خطأ أثناء جلب التسجيلات", details: String(error) };
    }
  });

export const getAllCoursesRegistrationsProcedure = protectedProcedure
  .input(
    z.object({
      status: z.enum(["all", "pending", "approved", "rejected"]).optional().default("all"),
      search: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    try {
      const conditions = [];

      if (input.status !== "all") conditions.push(eq(courseRegistrations.status, input.status));

      if (input.search) {
        const searchLower = `%${input.search.toLowerCase()}%`;
        conditions.push(
          or(
            like(sql`LOWER(${courseRegistrations.participantName})`, searchLower),
            like(sql`LOWER(${courseRegistrations.courseName})`, searchLower),
            like(sql`LOWER(${courseRegistrations.participantEmail})`, searchLower)
          )
        );
      }

      const result = await db
        .select()
        .from(courseRegistrations)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(courseRegistrations.createdAt));

      return { success: true, registrations: result, total: result.length };
    } catch (error) {
      console.error("Error fetching registrations:", error);
      return { success: false, error: "حدث خطأ أثناء جلب التسجيلات", details: String(error) };
    }
  });

// Update registration status (Admin only)
export const updateRegistrationStatusProcedure = protectedProcedure
  .input(
    z.object({
      registrationId: z.number(),
      status: z.enum(["approved", "rejected"]),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const [registration] = await db
        .select()
        .from(courseRegistrations)
        .where(eq(courseRegistrations.id, input.registrationId))
        .limit(1);

      if (!registration) return { success: false, error: "التسجيل غير موجود" };

      await db
        .update(courseRegistrations)
        .set({
          status: input.status,
          notes: input.notes,
          reviewedBy: ctx?.user?.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(courseRegistrations.id, input.registrationId));

      if (input.status === "approved") {
        await db
          .update(courses)
          .set({
            registered: sql`${courses.registered} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(courses.id, registration.courseId));
      }

      return {
        success: true,
        message: `تم ${input.status === "approved" ? "قبول" : "رفض"} التسجيل بنجاح`,
      };
    } catch (error) {
      console.error("Error updating registration status:", error);
      return { success: false, error: "حدث خطأ أثناء تحديث حالة التسجيل", details: String(error) };
    }
  });
