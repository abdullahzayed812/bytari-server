import { z } from "zod";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../../../create-context";
import { db, clinicAppointments, pets, users, clinics } from "../../../../db";

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
