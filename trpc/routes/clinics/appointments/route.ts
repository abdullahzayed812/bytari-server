import { z } from "zod";
import { eq, and, desc, gte, lte, count, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../../../create-context";
import { db, clinicAppointments, pets, users, clinics, notifications } from "../../../../db";

// List appointments for a clinic, with pet + owner info and today's counts
export const getClinicAppointmentsProcedure = publicProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    const rows = await db
      .select({
        appointment: clinicAppointments,
        pet: { id: pets.id, name: pets.name, type: pets.type, breed: pets.breed, image: pets.image },
        owner: { id: users.id, name: users.name, phone: users.phone },
      })
      .from(clinicAppointments)
      .leftJoin(pets, eq(clinicAppointments.petId, pets.id))
      .leftJoin(users, eq(clinicAppointments.ownerId, users.id))
      .where(eq(clinicAppointments.clinicId, input.clinicId))
      .orderBy(desc(clinicAppointments.appointmentDate));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayCountRow] = await db
      .select({ count: count() })
      .from(clinicAppointments)
      .where(
        and(
          eq(clinicAppointments.clinicId, input.clinicId),
          gte(clinicAppointments.appointmentDate, todayStart),
          lte(clinicAppointments.appointmentDate, todayEnd)
        )
      );

    const [pendingCountRow] = await db
      .select({ count: count() })
      .from(clinicAppointments)
      .where(
        and(eq(clinicAppointments.clinicId, input.clinicId), eq(clinicAppointments.status, "pending"))
      );

    return {
      appointments: rows.map((r) => ({
        ...r.appointment,
        pet: r.pet,
        owner: r.owner,
      })),
      todayCount: todayCountRow?.count ?? 0,
      pendingCount: pendingCountRow?.count ?? 0,
    };
  });

// Clinic creates an appointment (confirmed immediately)
export const createClinicAppointmentProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
      petId: z.string(),
      ownerId: z.number(),
      appointmentDate: z.string(), // ISO string
      type: z.string().default("مراجعة"),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const [row] = await db
      .insert(clinicAppointments)
      .values({
        clinicId: input.clinicId,
        petId: input.petId,
        ownerId: input.ownerId,
        requestedByClinic: true,
        appointmentDate: new Date(input.appointmentDate),
        type: input.type,
        notes: input.notes,
        status: "confirmed",
      })
      .returning();

    const [clinic] = await db.select({ name: clinics.name }).from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);
    const dateStr = new Date(input.appointmentDate).toLocaleString("ar-EG", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    await db.insert(notifications).values({
      userId: input.ownerId,
      title: "موعد جديد من العيادة",
      message: `قامت عيادة ${clinic?.name ?? ""} بإنشاء موعد لك بتاريخ ${dateStr}`,
      type: "appointment_confirmed",
      data: { appointmentId: row.id, clinicId: input.clinicId },
      isRead: false,
    });

    return { success: true, appointment: row };
  });

// Owner requests an appointment (status = pending, clinic must respond)
export const requestClinicAppointmentProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
      petId: z.string(),
      ownerId: z.number(),
      appointmentDate: z.string(),
      type: z.string().default("مراجعة"),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const [row] = await db
      .insert(clinicAppointments)
      .values({
        clinicId: input.clinicId,
        petId: input.petId,
        ownerId: input.ownerId,
        requestedByClinic: false,
        appointmentDate: new Date(input.appointmentDate),
        type: input.type,
        notes: input.notes,
        status: "pending",
      })
      .returning();
    return { success: true, appointment: row };
  });

// Clinic responds: accept / reject / counter-propose
export const respondToClinicAppointmentProcedure = publicProcedure
  .input(
    z.object({
      appointmentId: z.number(),
      action: z.enum(["confirm", "cancel", "counter_propose"]),
      counterProposedDate: z.string().optional(),
      counterProposedNotes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const [existing] = await db
      .select()
      .from(clinicAppointments)
      .where(eq(clinicAppointments.id, input.appointmentId))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "الموعد غير موجود" });
    }

    const updates: Partial<typeof clinicAppointments.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.action === "confirm") {
      updates.status = "confirmed";
    } else if (input.action === "cancel") {
      updates.status = "cancelled";
    } else if (input.action === "counter_propose") {
      if (!input.counterProposedDate) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "يجب تحديد تاريخ مقترح" });
      }
      updates.status = "counter_proposed";
      updates.counterProposedDate = new Date(input.counterProposedDate);
      updates.counterProposedNotes = input.counterProposedNotes;
    }

    const [updated] = await db
      .update(clinicAppointments)
      .set(updates)
      .where(eq(clinicAppointments.id, input.appointmentId))
      .returning();

    const [clinic] = await db.select({ name: clinics.name }).from(clinics).where(eq(clinics.id, existing.clinicId)).limit(1);
    const clinicName = clinic?.name ?? "";

    if (input.action === "confirm") {
      const dateStr = new Date(existing.appointmentDate).toLocaleString("ar-EG", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      await db.insert(notifications).values({
        userId: existing.ownerId,
        title: "تم تأكيد موعدك",
        message: `قامت عيادة ${clinicName} بتأكيد موعدك بتاريخ ${dateStr}`,
        type: "appointment_confirmed",
        data: { appointmentId: input.appointmentId, clinicId: existing.clinicId },
        isRead: false,
      });
    } else if (input.action === "counter_propose" && input.counterProposedDate) {
      const dateStr = new Date(input.counterProposedDate).toLocaleString("ar-EG", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      await db.insert(notifications).values({
        userId: existing.ownerId,
        title: "اقتراح موعد بديل",
        message: `اقترحت عيادة ${clinicName} موعدًا بديلًا بتاريخ ${dateStr}${input.counterProposedNotes ? " · " + input.counterProposedNotes : ""}`,
        type: "appointment_counter_proposed",
        data: { appointmentId: input.appointmentId, clinicId: existing.clinicId },
        isRead: false,
      });
    }

    return { success: true, appointment: updated };
  });

// Owner responds to a counter-proposal: accept or reject
export const respondToCounterProposalProcedure = publicProcedure
  .input(
    z.object({
      appointmentId: z.number(),
      accept: z.boolean(),
    })
  )
  .mutation(async ({ input }) => {
    const [existing] = await db
      .select()
      .from(clinicAppointments)
      .where(eq(clinicAppointments.id, input.appointmentId))
      .limit(1);

    if (!existing || existing.status !== "counter_proposed") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "لا يوجد اقتراح بديل لهذا الموعد" });
    }

    const [updated] = await db
      .update(clinicAppointments)
      .set({
        status: input.accept ? "confirmed" : "cancelled",
        // If accepted, replace the main date with the counter-proposed date
        ...(input.accept && existing.counterProposedDate
          ? { appointmentDate: existing.counterProposedDate }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(clinicAppointments.id, input.appointmentId))
      .returning();

    return { success: true, appointment: updated };
  });

// Mark all unseen owner-requested appointments as seen by the clinic
export const markAppointmentsAsReadProcedure = publicProcedure
  .input(z.object({ clinicId: z.number() }))
  .mutation(async ({ input }) => {
    await db
      .update(clinicAppointments)
      .set({ seenByClinic: true, updatedAt: new Date() })
      .where(and(eq(clinicAppointments.clinicId, input.clinicId), eq(clinicAppointments.requestedByClinic, false), eq(clinicAppointments.seenByClinic, false)));
    return { success: true };
  });

// Count unseen owner-requested appointments for the badge
export const getUnreadAppointmentsCountProcedure = publicProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    const [row] = await db
      .select({ count: count() })
      .from(clinicAppointments)
      .where(and(eq(clinicAppointments.clinicId, input.clinicId), eq(clinicAppointments.requestedByClinic, false), eq(clinicAppointments.seenByClinic, false)));
    return { count: row?.count ?? 0 };
  });

// Fetch all clinic appointments for a pet owner
export const getOwnerAppointmentsProcedure = publicProcedure
  .input(z.object({ ownerId: z.number() }))
  .query(async ({ input }) => {
    const rows = await db
      .select({
        appointment: clinicAppointments,
        pet: { id: pets.id, name: pets.name, type: pets.type, image: pets.image },
        clinic: { id: clinics.id, name: clinics.name, phone: clinics.phone, address: clinics.address },
      })
      .from(clinicAppointments)
      .leftJoin(pets, eq(clinicAppointments.petId, pets.id))
      .leftJoin(clinics, eq(clinicAppointments.clinicId, clinics.id))
      .where(eq(clinicAppointments.ownerId, input.ownerId))
      .orderBy(desc(clinicAppointments.appointmentDate));

    return {
      appointments: rows.map((r) => ({
        ...r.appointment,
        pet: r.pet,
        clinic: r.clinic,
      })),
    };
  });

// Send notification to a specific appointment's owner
export const sendAppointmentNotificationProcedure = publicProcedure
  .input(z.object({ appointmentId: z.number() }))
  .mutation(async ({ input }) => {
    const [row] = await db
      .select({
        appointment: clinicAppointments,
        petName: pets.name,
        clinicName: clinics.name,
      })
      .from(clinicAppointments)
      .innerJoin(pets, eq(clinicAppointments.petId, pets.id))
      .innerJoin(clinics, eq(clinicAppointments.clinicId, clinics.id))
      .where(eq(clinicAppointments.id, input.appointmentId))
      .limit(1);

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "الموعد غير موجود" });

    const dateStr = new Date(row.appointment.appointmentDate).toLocaleString("ar-EG", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    await db.insert(notifications).values({
      userId: row.appointment.ownerId,
      title: `تذكير بموعد: ${row.petName}`,
      message: `تذكير من ${row.clinicName}: لديك موعد بتاريخ ${dateStr}`,
      type: "appointment_reminder",
      data: { appointmentId: input.appointmentId, clinicId: row.appointment.clinicId },
      isRead: false,
    });

    return { success: true };
  });

// Send notifications to all owners with appointments today
export const sendTodayAppointmentsNotificationProcedure = publicProcedure
  .input(z.object({ clinicId: z.number() }))
  .mutation(async ({ input }) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const rows = await db
      .select({
        appointment: clinicAppointments,
        petName: pets.name,
        clinicName: clinics.name,
      })
      .from(clinicAppointments)
      .innerJoin(pets, eq(clinicAppointments.petId, pets.id))
      .innerJoin(clinics, eq(clinicAppointments.clinicId, clinics.id))
      .where(
        and(
          eq(clinicAppointments.clinicId, input.clinicId),
          ne(clinicAppointments.status, "cancelled"),
          ne(clinicAppointments.status, "completed"),
          gte(clinicAppointments.appointmentDate, todayStart),
          lte(clinicAppointments.appointmentDate, todayEnd),
        )
      );

    if (rows.length === 0) return { success: true, count: 0 };

    const clinicName = rows[0].clinicName ?? "العيادة";

    await db.insert(notifications).values(
      rows.map((r) => {
        const dateStr = new Date(r.appointment.appointmentDate).toLocaleString("ar-EG", { hour: "2-digit", minute: "2-digit" });
        return {
          userId: r.appointment.ownerId,
          title: `تذكير بموعد اليوم: ${r.petName}`,
          message: `تذكير من ${clinicName}: لديك موعد اليوم الساعة ${dateStr}`,
          type: "appointment_reminder",
          data: { appointmentId: r.appointment.id, clinicId: input.clinicId },
          isRead: false as const,
        };
      })
    );

    return { success: true, count: rows.length };
  });

// Mark appointment as completed
export const completeClinicAppointmentProcedure = publicProcedure
  .input(z.object({ appointmentId: z.number() }))
  .mutation(async ({ input }) => {
    const [updated] = await db
      .update(clinicAppointments)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(clinicAppointments.id, input.appointmentId))
      .returning();
    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "الموعد غير موجود" });
    }
    return { success: true, appointment: updated };
  });
