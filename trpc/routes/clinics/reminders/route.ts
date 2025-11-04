
import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, reminders, pets, users } from "../../../../db";
import { and, eq, desc } from "drizzle-orm";

export const getClinicRemindersProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { clinicId } = input;

      const clinicReminders = await db
        .select({
          reminder: reminders,
          pet: pets,
          owner: users,
        })
        .from(reminders)
        .where(eq(reminders.clinicId, clinicId))
        .leftJoin(pets, eq(reminders.petId, pets.id))
        .leftJoin(users, eq(reminders.userId, users.id))
        .orderBy(desc(reminders.dueDate));

      const formattedReminders = clinicReminders.map(
        ({ reminder, pet, owner }) => ({
          id: reminder.id,
          petName: pet.name,
          petType: pet.type,
          ownerName: owner.name,
          reminderType: reminder.reminderType,
          title: reminder.title,
          description: reminder.description,
          dueDate: reminder.dueDate.toISOString().split("T")[0],
          dueTime: reminder.dueDate.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: reminder.status,
          priority: reminder.priority,
          createdDate: reminder.createdAt.toISOString().split("T")[0],
        })
      );

      return {
        success: true,
        reminders: formattedReminders,
      };
    } catch (error) {
      console.error("Error getting clinic reminders:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء جلب تذكيرات العيادة"
      );
    }
  });
