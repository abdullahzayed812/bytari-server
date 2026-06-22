import { z } from "zod";
import { eq, desc, and, lt, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure } from "../../../create-context";
import { db, petReminders, pets, users, notifications, clinicStaff, approvalRequests, clinics } from "../../../../db";

// Get all reminders for a clinic
export const getClinicRemindersProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      status: z.enum(["all", "pending", "overdue", "completed"]).optional().default("all"),
    })
  )
  .query(async ({ input }) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build where conditions based on status filter
      let whereConditions = eq(petReminders.clinicId, input.clinicId);

      if (input.status !== "all") {
        if (input.status === "overdue") {
          // Overdue: pending reminders with reminder date in the past
          whereConditions = and(
            eq(petReminders.clinicId, input.clinicId),
            eq(petReminders.isCompleted, false),
            lt(petReminders.reminderDate, today)
          );
        } else if (input.status === "completed") {
          whereConditions = and(eq(petReminders.clinicId, input.clinicId), eq(petReminders.isCompleted, true));
        } else if (input.status === "pending") {
          whereConditions = and(eq(petReminders.clinicId, input.clinicId), eq(petReminders.isCompleted, false));
        }
      }

      const remindersQuery = db
        .select({
          id: petReminders.id,
          petId: petReminders.petId,
          petName: pets.name,
          petType: pets.type,
          ownerName: users.name,
          reminderType: petReminders.reminderType,
          title: petReminders.title,
          description: petReminders.description,
          reminderDate: petReminders.reminderDate,
          isCompleted: petReminders.isCompleted,
          createdAt: petReminders.createdAt,
        })
        .from(petReminders)
        .innerJoin(pets, eq(pets.id, petReminders.petId))
        .innerJoin(users, eq(users.id, pets.ownerId))
        .where(whereConditions)
        .orderBy(desc(petReminders.reminderDate));

      const allReminders = await remindersQuery;

      // Process reminders to add computed fields
      const processedReminders = allReminders.map((reminder) => {
        const reminderDate = new Date(reminder.reminderDate);
        const isOverdue = !reminder.isCompleted && reminderDate < today;

        // Determine status based on isCompleted and overdue status
        let status = reminder.isCompleted ? "completed" : "pending";
        if (isOverdue) {
          status = "overdue";
        }

        // Format date and time
        const formattedDate = reminderDate.toISOString().split("T")[0];
        const formattedTime = reminderDate.toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        return {
          id: reminder.id.toString(),
          petId: reminder.petId,
          petName: reminder.petName,
          petType: reminder.petType,
          ownerName: reminder.ownerName,
          reminderType: reminder.reminderType,
          title: reminder.title,
          description: reminder.description || "لا يوجد وصف",
          reminderDate: formattedDate,
          reminderTime: formattedTime,
          status: status,
          isCompleted: reminder.isCompleted,
          createdDate: reminder.createdAt.toISOString().split("T")[0],
        };
      });

      return {
        success: true,
        reminders: processedReminders,
      };
    } catch (error) {
      console.error("Error fetching clinic reminders:", error);
      throw new Error("فشل في جلب بيانات التذكيرات");
    }
  });

// Update reminder completion status
export const updateReminderStatusProcedure = protectedProcedure
  .input(
    z.object({
      reminderId: z.number(),
      isCompleted: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db
        .update(petReminders)
        .set({
          isCompleted: input.isCompleted,
          updatedAt: new Date(),
        })
        .where(eq(petReminders.id, input.reminderId));

      return {
        success: true,
        message: input.isCompleted ? "تم تحديد التذكير كمكتمل" : "تم إعادة فتح التذكير",
      };
    } catch (error) {
      console.error("Error updating reminder status:", error);
      throw new Error("فشل في تحديث حالة التذكير");
    }
  });

// Reschedule reminder
export const rescheduleReminderProcedure = protectedProcedure
  .input(
    z.object({
      reminderId: z.number(),
      newDate: z.date(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await db
        .update(petReminders)
        .set({
          reminderDate: input.newDate,
          updatedAt: new Date(),
        })
        .where(eq(petReminders.id, input.reminderId));

      return {
        success: true,
        message: "تم تأجيل التذكير بنجاح",
      };
    } catch (error) {
      console.error("Error rescheduling reminder:", error);
      throw new Error("فشل في تأجيل التذكير");
    }
  });

// Create new reminder
export const createReminderProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.number(),
      clinicId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      reminderDate: z.date(),
      reminderType: z.enum(["vaccination", "medication", "checkup", "other"]).default("checkup"),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const [newReminder] = await db
        .insert(petReminders)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          title: input.title,
          description: input.description,
          reminderDate: input.reminderDate,
          reminderType: input.reminderType,
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Send notification to pet owner
      const pet = await db.query.pets.findFirst({
        where: eq(pets.id, input.petId),
      });
      if (pet) {
        await db.insert(notifications).values({
          userId: pet.ownerId,
          title: "تم إضافة تذكير جديد",
          message: `تم إضافة تذكير جديد لحيوانك ${pet.name}: ${input.title}`,
          type: "new_reminder",
          data: { reminderId: newReminder.id, petId: input.petId },
        });
      }

      return {
        success: true,
        message: "تم إنشاء التذكير بنجاح",
        reminder: newReminder,
      };
    } catch (error) {
      console.error("Error creating reminder:", error);
      throw new Error("فشل في إنشاء التذكير");
    }
  });

// Delete reminder
export const deleteReminderProcedure = protectedProcedure
  .input(
    z.object({
      reminderId: z.number(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const [rem] = await db
      .select({ petOwnerId: pets.ownerId, clinicId: petReminders.clinicId })
      .from(petReminders)
      .innerJoin(pets, eq(pets.id, petReminders.petId))
      .where(eq(petReminders.id, input.reminderId));

    if (!rem) throw new TRPCError({ code: "NOT_FOUND", message: "التذكير غير موجود" });

    const isPetOwner = rem.petOwnerId === ctx.user.id;
    if (!isPetOwner && rem.clinicId) {
      const [staff] = await db
        .select({ id: clinicStaff.id })
        .from(clinicStaff)
        .where(and(eq(clinicStaff.clinicId, rem.clinicId), eq(clinicStaff.userId, ctx.user.id), eq(clinicStaff.isActive, true)))
        .limit(1);
      if (!staff) {
        const [owner] = await db
          .select({ id: approvalRequests.id })
          .from(approvalRequests)
          .where(and(eq(approvalRequests.requesterId, ctx.user.id), eq(approvalRequests.resourceId, rem.clinicId), eq(approvalRequests.requestType, "clinic_activation"), eq(approvalRequests.status, "approved")))
          .limit(1);
        if (!owner) throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بحذف هذا التذكير" });
      }
    } else if (!isPetOwner) {
      throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح لك بحذف هذا التذكير" });
    }

    await db.delete(petReminders).where(eq(petReminders.id, input.reminderId));
    return { success: true, message: "تم حذف التذكير بنجاح" };
  });

// Get reminder statistics
export const getReminderStatsProcedure = protectedProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    try {
      const clinicReminders = await db
        .select({
          isCompleted: petReminders.isCompleted,
          reminderDate: petReminders.reminderDate,
          reminderType: petReminders.reminderType,
        })
        .from(petReminders)
        .where(eq(petReminders.clinicId, input.clinicId));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        total: clinicReminders.length,
        pending: clinicReminders.filter((r) => !r.isCompleted && new Date(r.reminderDate) >= today).length,
        completed: clinicReminders.filter((r) => r.isCompleted).length,
        overdue: clinicReminders.filter((r) => !r.isCompleted && new Date(r.reminderDate) < today).length,
        vaccination: clinicReminders.filter((r) => r.reminderType === "vaccination" && !r.isCompleted).length,
        medication: clinicReminders.filter((r) => r.reminderType === "medication" && !r.isCompleted).length,
        checkup: clinicReminders.filter((r) => r.reminderType === "checkup" && !r.isCompleted).length,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("Error fetching reminder stats:", error);
      throw new Error("فشل في جلب إحصائيات التذكيرات");
    }
  });

export const sendReminderNotificationProcedure = publicProcedure
  .input(z.object({ reminderId: z.number(), clinicId: z.number() }))
  .mutation(async ({ input }) => {
    const [row] = await db
      .select({
        reminder: petReminders,
        petName: pets.name,
        petType: pets.type,
        ownerId: users.id,
      })
      .from(petReminders)
      .innerJoin(pets, eq(pets.id, petReminders.petId))
      .innerJoin(users, eq(users.id, pets.ownerId))
      .where(eq(petReminders.id, input.reminderId))
      .limit(1);

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "التذكير غير موجود" });

    const [clinic] = await db.select({ name: clinics.name }).from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);
    const clinicName = clinic?.name ?? "العيادة";

    const typeLabel: Record<string, string> = { vaccination: "تطعيم", medication: "دواء", checkup: "فحص" };
    const dateStr = new Date(row.reminder.reminderDate).toLocaleDateString("ar-EG", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

    await db.insert(notifications).values({
      userId: row.ownerId,
      title: `تذكير: ${row.reminder.title}`,
      message: `تذكير من ${clinicName}: حيوانك ${row.petName} لديه ${typeLabel[row.reminder.reminderType] ?? "تذكير"} بتاريخ ${dateStr}`,
      type: "reminder",
      data: { reminderId: input.reminderId, petId: row.reminder.petId, clinicId: input.clinicId },
      isRead: false,
    });

    return { success: true };
  });

export const sendTodayRemindersNotificationProcedure = publicProcedure
  .input(z.object({ clinicId: z.number() }))
  .mutation(async ({ input }) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const rows = await db
      .select({
        reminder: petReminders,
        petName: pets.name,
        ownerId: users.id,
      })
      .from(petReminders)
      .innerJoin(pets, eq(pets.id, petReminders.petId))
      .innerJoin(users, eq(users.id, pets.ownerId))
      .where(
        and(
          eq(petReminders.clinicId, input.clinicId),
          eq(petReminders.isCompleted, false),
          gte(petReminders.reminderDate, todayStart),
          lte(petReminders.reminderDate, todayEnd),
        )
      );

    if (rows.length === 0) return { success: true, count: 0 };

    const [clinic] = await db.select({ name: clinics.name }).from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);
    const clinicName = clinic?.name ?? "العيادة";

    await db.insert(notifications).values(
      rows.map((r) => ({
        userId: r.ownerId,
        title: `تذكير اليوم: ${r.reminder.title}`,
        message: `تذكير من ${clinicName}: حيوانك ${r.petName} لديه موعد اليوم`,
        type: "reminder",
        data: { reminderId: r.reminder.id, petId: r.reminder.petId, clinicId: input.clinicId },
        isRead: false as const,
      }))
    );

    return { success: true, count: rows.length };
  });
