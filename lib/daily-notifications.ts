import { and, eq, gte, lt, isNotNull } from "drizzle-orm";
import { db, vaccinations, petReminders, pets, notifications, clinics } from "../db";

export async function sendDailyScheduledNotifications() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  await Promise.all([sendVaccinationDueNotifications(todayStart, todayEnd), sendReminderDueNotifications(todayStart, todayEnd)]);
}

async function sendVaccinationDueNotifications(todayStart: Date, todayEnd: Date) {
  // Find vaccinations whose nextDate falls today
  const dueVaccinations = await db
    .select({
      id: vaccinations.id,
      petId: vaccinations.petId,
      petName: pets.name,
      ownerId: pets.ownerId,
      vaccineName: vaccinations.name,
      clinicId: vaccinations.clinicId,
    })
    .from(vaccinations)
    .innerJoin(pets, eq(pets.id, vaccinations.petId))
    .where(
      and(
        isNotNull(vaccinations.nextDate),
        gte(vaccinations.nextDate, todayStart),
        lt(vaccinations.nextDate, todayEnd),
        eq(vaccinations.status, "completed")
      )
    );

  if (dueVaccinations.length === 0) return;

  // Fetch clinic names for context
  const clinicIds = [...new Set(dueVaccinations.map((v) => v.clinicId).filter(Boolean))] as number[];
  const clinicNames: Record<number, string> = {};
  if (clinicIds.length > 0) {
    const clinicRows = await db.select({ id: clinics.id, name: clinics.name }).from(clinics);
    clinicRows.forEach((c) => (clinicNames[c.id] = c.name));
  }

  await db.insert(notifications).values(
    dueVaccinations.map((v) => ({
      userId: v.ownerId,
      title: "موعد تطعيم اليوم",
      message: `حيوانك ${v.petName} لديه موعد تطعيم ${v.vaccineName} اليوم${v.clinicId && clinicNames[v.clinicId] ? ` في ${clinicNames[v.clinicId]}` : ""}`,
      type: "vaccination_due",
      data: { petId: v.petId, vaccinationId: v.id, clinicId: v.clinicId },
      isRead: false,
    }))
  );
}

async function sendReminderDueNotifications(todayStart: Date, todayEnd: Date) {
  const dueReminders = await db
    .select({
      id: petReminders.id,
      petId: petReminders.petId,
      petName: pets.name,
      ownerId: pets.ownerId,
      title: petReminders.title,
      clinicId: petReminders.clinicId,
    })
    .from(petReminders)
    .innerJoin(pets, eq(pets.id, petReminders.petId))
    .where(
      and(
        gte(petReminders.reminderDate, todayStart),
        lt(petReminders.reminderDate, todayEnd),
        eq(petReminders.isCompleted, false)
      )
    );

  if (dueReminders.length === 0) return;

  await db.insert(notifications).values(
    dueReminders.map((r) => ({
      userId: r.ownerId,
      title: "تذكير اليوم",
      message: `لديك تذكير لحيوانك ${r.petName}: ${r.title}`,
      type: "reminder_due",
      data: { petId: r.petId, reminderId: r.id, clinicId: r.clinicId },
      isRead: false,
    }))
  );
}
