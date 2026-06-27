import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure } from "../../../create-context";
import { db, clinicQuickReviewTemplates, medicalRecords, vaccinations, petReminders, pets, users, veterinarians, clinicStaff, notifications } from "../../../../db";

// Resolve veterinarianId for the acting user in a clinic.
// Order: clinicStaff record → existing veterinarians entry → auto-create minimal entry.
async function resolveVetId(clinicId: number, userId: number): Promise<number | undefined> {
  const [staff] = await db
    .select({ veterinarianId: clinicStaff.veterinarianId })
    .from(clinicStaff)
    .where(and(eq(clinicStaff.clinicId, clinicId), eq(clinicStaff.userId, userId)))
    .limit(1);
  if (staff?.veterinarianId) return staff.veterinarianId;

  const [existing] = await db
    .select({ id: veterinarians.id })
    .from(veterinarians)
    .where(eq(veterinarians.userId, userId))
    .limit(1);
  if (existing?.id) return existing.id;

  // Clinic owner has no vet record — create a minimal one so doctorName resolves.
  const [created] = await db
    .insert(veterinarians)
    .values({ userId, isVerified: false })
    .returning({ id: veterinarians.id });
  return created?.id;
}

// ── Templates CRUD ──────────────────────────────────────────────────────────

export const getTemplatesProcedure = publicProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    const templates = await db
      .select()
      .from(clinicQuickReviewTemplates)
      .where(and(eq(clinicQuickReviewTemplates.clinicId, input.clinicId), eq(clinicQuickReviewTemplates.isActive, true)));
    return { templates };
  });

export const createTemplateProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
      name: z.string().min(1),
      templateType: z.enum(["vaccine", "treatment", "diagnosis", "general"]).optional().default("general"),
      defaultDiagnosis: z.string().optional(),
      defaultTreatment: z.string().optional(),
      defaultNotes: z.string().optional(),
      intervalDays: z.number().int().positive().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const [template] = await db
      .insert(clinicQuickReviewTemplates)
      .values({
        clinicId: input.clinicId,
        name: input.name,
        templateType: input.templateType ?? "general",
        defaultDiagnosis: input.defaultDiagnosis,
        defaultTreatment: input.defaultTreatment,
        defaultNotes: input.defaultNotes,
        intervalDays: input.intervalDays,
      })
      .returning();
    return { success: true, template };
  });

export const updateTemplateProcedure = publicProcedure
  .input(
    z.object({
      templateId: z.number(),
      name: z.string().min(1).optional(),
      templateType: z.enum(["vaccine", "treatment", "diagnosis", "general"]).optional(),
      defaultDiagnosis: z.string().optional(),
      defaultTreatment: z.string().optional(),
      defaultNotes: z.string().optional(),
      intervalDays: z.number().int().positive().nullable().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { templateId, ...updates } = input;
    const [template] = await db
      .update(clinicQuickReviewTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(clinicQuickReviewTemplates.id, templateId))
      .returning();
    if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "القالب غير موجود" });
    return { success: true, template };
  });

export const deleteTemplateProcedure = publicProcedure
  .input(z.object({ templateId: z.number() }))
  .mutation(async ({ input }) => {
    await db
      .update(clinicQuickReviewTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(clinicQuickReviewTemplates.id, input.templateId));
    return { success: true };
  });

// ── Create Quick Review (مراجعة سريعة) ──────────────────────────────────────
// Writes a medicalRecord scoped to this clinic. Private to the clinic per privacy rule.

export const createQuickReviewProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      petId: z.string(),
      veterinarianId: z.number().optional(),
      templateId: z.number().optional(),
      diagnosis: z.string().min(1),
      treatment: z.string().min(1),
      notes: z.string().optional(),
      date: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const vetId = input.veterinarianId ?? await resolveVetId(input.clinicId, ctx.user.id);

    const [record] = await db
      .insert(medicalRecords)
      .values({
        petId: input.petId,
        clinicId: input.clinicId,
        veterinarianId: vetId,
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        notes: input.notes,
        recordType: "مراجعة_سريعة",
        date: input.date ? new Date(input.date) : new Date(),
      })
      .returning();

    return { success: true, record };
  });

// ── Create Full Exam (فحص كامل) ─────────────────────────────────────────────
// Creates a medical record + optional vaccination + optional reminder

export const createFullExamProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      petId: z.string(),
      veterinarianId: z.number().optional(),
      // Exam details
      diagnosis: z.string().min(1),
      symptoms: z.string().optional(),
      severity: z.enum(["شديدة", "متوسطة", "خفيفة"]).optional(),
      treatment: z.string().min(1),
      notes: z.string().optional(),
      labNotes: z.string().optional(),
      fileUrls: z.array(z.string()).optional(),
      prescriptionImage: z.string().optional(),
      isDraft: z.boolean().optional().default(false),
      recordType: z.enum(["فحص_شامل", "تحليل", "ملف"]).optional(),
      date: z.string().optional(),
      // Optional vaccination
      vaccination: z
        .object({
          name: z.string(),
          nextDate: z.string().optional(),
          vaccinationNotes: z.string().optional(),
        })
        .optional(),
      // Optional reminder
      reminder: z
        .object({
          title: z.string(),
          reminderDate: z.string(),
          reminderNotes: z.string().optional(),
        })
        .optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const vetId = input.veterinarianId ?? await resolveVetId(input.clinicId, ctx.user.id);

    const [record] = await db
      .insert(medicalRecords)
      .values({
        petId: input.petId,
        clinicId: input.clinicId,
        veterinarianId: vetId,
        diagnosis: input.diagnosis,
        symptoms: input.symptoms,
        severity: input.severity,
        treatment: input.treatment,
        notes: input.notes,
        labNotes: input.labNotes,
        fileUrls: input.fileUrls,
        prescriptionImage: input.prescriptionImage,
        isDraft: input.isDraft ?? false,
        recordType: input.recordType ?? "فحص_شامل",
        date: input.date ? new Date(input.date) : new Date(),
      })
      .returning();

    // Fetch pet for notifications
    const pet = await db.query.pets.findFirst({ where: eq(pets.id, input.petId) });

    let vaccinationRecord = null;
    if (input.vaccination?.name) {
      [vaccinationRecord] = await db
        .insert(vaccinations)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          veterinarianId: vetId,
          name: input.vaccination.name,
          nextDate: input.vaccination.nextDate ? new Date(input.vaccination.nextDate) : undefined,
          notes: input.vaccination.vaccinationNotes,
          status: "scheduled",
        })
        .returning();

      if (pet) {
        await db.insert(notifications).values({
          userId: pet.ownerId,
          title: "تم إضافة تطعيم جديد",
          message: `تم إضافة تطعيم ${input.vaccination.name} لحيوانك ${pet.name}`,
          type: "new_vaccination",
          data: { vaccinationId: vaccinationRecord.id, petId: input.petId, clinicId: input.clinicId },
          isRead: false,
        });
      }
    }

    let reminderRecord = null;
    if (input.reminder?.title && input.reminder?.reminderDate) {
      [reminderRecord] = await db
        .insert(petReminders)
        .values({
          petId: input.petId,
          clinicId: input.clinicId,
          veterinarianId: vetId,
          title: input.reminder.title,
          reminderDate: new Date(input.reminder.reminderDate),
          description: input.reminder.reminderNotes,
          reminderType: "checkup",
          isCompleted: false,
        })
        .returning();

      if (pet) {
        await db.insert(notifications).values({
          userId: pet.ownerId,
          title: "تم إضافة تذكير جديد",
          message: `تم إضافة تذكير لحيوانك ${pet.name}: ${input.reminder.title}`,
          type: "new_reminder",
          data: { reminderId: reminderRecord.id, petId: input.petId, clinicId: input.clinicId },
          isRead: false,
        });
      }
    }

    return { success: true, record, vaccinationRecord, reminderRecord };
  });

// ── Direct vaccination add (no approval required) ───────────────────────────

export const addVaccinationDirectProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      petId: z.string(),
      name: z.string().min(1),
      nextDate: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const vetId = await resolveVetId(input.clinicId, ctx.user.id);
    const [record] = await db
      .insert(vaccinations)
      .values({
        petId: input.petId,
        clinicId: input.clinicId,
        veterinarianId: vetId,
        name: input.name,
        nextDate: input.nextDate ? new Date(input.nextDate) : undefined,
        notes: input.notes,
        status: "scheduled",
      })
      .returning();

    const pet = await db.query.pets.findFirst({ where: eq(pets.id, input.petId) });
    if (pet) {
      await db.insert(notifications).values({
        userId: pet.ownerId,
        title: "تم إضافة تطعيم جديد",
        message: `تم إضافة تطعيم ${input.name} لحيوانك ${pet.name}`,
        type: "new_vaccination",
        data: { vaccinationId: record.id, petId: input.petId, clinicId: input.clinicId },
        isRead: false,
      });
    }

    return { success: true, record };
  });

// ── Direct reminder add (no approval required) ───────────────────────────────

export const addReminderDirectProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number(),
      petId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      reminderDate: z.string(),
      reminderType: z.enum(["vaccination", "medication", "checkup", "other"]).optional().default("checkup"),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const vetId = await resolveVetId(input.clinicId, ctx.user.id);
    const [record] = await db
      .insert(petReminders)
      .values({
        petId: input.petId,
        clinicId: input.clinicId,
        veterinarianId: vetId,
        title: input.title,
        description: input.description,
        reminderDate: new Date(input.reminderDate),
        reminderType: input.reminderType ?? "checkup",
        isCompleted: false,
      })
      .returning();

    const pet = await db.query.pets.findFirst({ where: eq(pets.id, input.petId) });
    if (pet) {
      await db.insert(notifications).values({
        userId: pet.ownerId,
        title: "تم إضافة تذكير جديد",
        message: `تم إضافة تذكير لحيوانك ${pet.name}: ${input.title}`,
        type: "new_reminder",
        data: { reminderId: record.id, petId: input.petId, clinicId: input.clinicId },
        isRead: false,
      });
    }

    return { success: true, record };
  });

// ── Update vaccination ───────────────────────────────────────────────────────

export const updateVaccinationDirectProcedure = protectedProcedure
  .input(
    z.object({
      vaccinationId: z.number(),
      name: z.string().min(1),
      nextDate: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    await db
      .update(vaccinations)
      .set({
        name: input.name,
        nextDate: input.nextDate ? new Date(input.nextDate) : undefined,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(vaccinations.id, input.vaccinationId));
    return { success: true };
  });

// ── Update reminder ──────────────────────────────────────────────────────────

export const updateReminderDirectProcedure = protectedProcedure
  .input(
    z.object({
      reminderId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      reminderDate: z.string(),
      reminderType: z.enum(["vaccination", "medication", "checkup", "other"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    await db
      .update(petReminders)
      .set({
        title: input.title,
        description: input.description,
        reminderDate: new Date(input.reminderDate),
        reminderType: input.reminderType ?? "checkup",
        updatedAt: new Date(),
      })
      .where(eq(petReminders.id, input.reminderId));
    return { success: true };
  });

// ── Update medical record ────────────────────────────────────────────────────

export const updateMedicalRecordProcedure = protectedProcedure
  .input(
    z.object({
      recordId: z.number(),
      diagnosis: z.string().min(1),
      treatment: z.string().min(1),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    await db
      .update(medicalRecords)
      .set({
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        notes: input.notes,
        updatedAt: new Date(),
      })
      .where(eq(medicalRecords.id, input.recordId));
    return { success: true };
  });

// ── Get clinic's known pets for the pet picker (pets with any clinic records) ──

export const getClinicAccessedPetsProcedure = publicProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    const [fromRecords, fromVaccinations, fromReminders] = await Promise.all([
      db.selectDistinct({ petId: medicalRecords.petId }).from(medicalRecords).where(eq(medicalRecords.clinicId, input.clinicId)),
      db.selectDistinct({ petId: vaccinations.petId }).from(vaccinations).where(eq(vaccinations.clinicId, input.clinicId)),
      db.selectDistinct({ petId: petReminders.petId }).from(petReminders).where(eq(petReminders.clinicId, input.clinicId)),
    ]);

    const petIds = [...new Set([
      ...fromRecords.map((r) => r.petId),
      ...fromVaccinations.map((r) => r.petId),
      ...fromReminders.map((r) => r.petId),
    ])];

    if (petIds.length === 0) return { pets: [] };

    const rows = await db
      .select({
        id: pets.id,
        name: pets.name,
        type: pets.type,
        breed: pets.breed,
        image: pets.image,
        ownerId: pets.ownerId,
        ownerName: users.name,
        ownerPhone: users.phone,
      })
      .from(pets)
      .leftJoin(users, eq(pets.ownerId, users.id))
      .where(inArray(pets.id, petIds));

    return { pets: rows };
  });
