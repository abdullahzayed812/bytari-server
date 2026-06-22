import { z } from "zod";
import { protectedProcedure, adminProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { farmDoctorLinks, poultryFarms, users, notifications } from "../../../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

// Generate a unique farm identifier (6-char alphanumeric)
function generateFarmIdentifier(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// ─── Farm owner: Get or generate farm identifier ──────────────
export const getFarmIdentifierProcedure = protectedProcedure
  .input(z.object({ farmId: z.number().int().positive() }))
  .query(async ({ input, ctx }) => {
    const [farm] = await db
      .select({ id: poultryFarms.id, ownerId: poultryFarms.ownerId, farmIdentifier: poultryFarms.farmIdentifier, name: poultryFarms.name })
      .from(poultryFarms)
      .where(and(eq(poultryFarms.id, input.farmId), eq(poultryFarms.ownerId, ctx.user.id)))
      .limit(1);

    if (!farm) throw new Error("الحقل غير موجود");

    // Generate identifier if not set
    if (!farm.farmIdentifier) {
      const identifier = generateFarmIdentifier();
      await db
        .update(poultryFarms)
        .set({ farmIdentifier: identifier, updatedAt: new Date() })
        .where(eq(poultryFarms.id, input.farmId));
      return { farmIdentifier: identifier, farmName: farm.name };
    }

    return { farmIdentifier: farm.farmIdentifier, farmName: farm.name };
  });

// ─── Doctor: Link to a farm via identifier ────────────────────
export const linkFarmToDoctorProcedure = protectedProcedure
  .input(z.object({ farmIdentifier: z.string().min(4) }))
  .mutation(async ({ input, ctx }) => {
    const [farm] = await db
      .select({ id: poultryFarms.id, ownerId: poultryFarms.ownerId, name: poultryFarms.name })
      .from(poultryFarms)
      .where(eq(poultryFarms.farmIdentifier, input.farmIdentifier.toUpperCase()))
      .limit(1);

    if (!farm) throw new Error("رمز الحقل غير صحيح أو غير موجود");

    // Check for any existing link record (active or removed)
    const [existing] = await db
      .select({ id: farmDoctorLinks.id, status: farmDoctorLinks.status })
      .from(farmDoctorLinks)
      .where(
        and(
          eq(farmDoctorLinks.farmId, farm.id),
          eq(farmDoctorLinks.doctorId, ctx.user.id),
        )
      )
      .limit(1);

    if (existing?.status === "active") throw new Error("أنت مرتبط بهذا الحقل بالفعل");

    if (existing) {
      // Reactivate a previously removed link
      await db
        .update(farmDoctorLinks)
        .set({ status: "active", removedAt: null, linkedAt: new Date() })
        .where(eq(farmDoctorLinks.id, existing.id));
    } else {
      await db.insert(farmDoctorLinks).values({
        farmId: farm.id,
        doctorId: ctx.user.id,
        farmIdentifier: input.farmIdentifier.toUpperCase(),
        status: "active",
      });
    }

    // Notify farm owner
    await db.insert(notifications).values({
      userId: farm.ownerId,
      title: "طبيب بيطري جديد مرتبط بحقلك",
      message: `تم ربط طبيب بيطري بحقل ${farm.name}. يمكنه الآن الاطلاع على بيانات الحقل.`,
      type: "info",
    });

    return { success: true, farmName: farm.name, message: "تم الربط بالحقل بنجاح" };
  });

// ─── Doctor: Get my linked farms ──────────────────────────────
export const getMyLinkedFarmsProcedure = protectedProcedure.query(async ({ ctx }) => {
  const links = await db
    .select({
      linkId: farmDoctorLinks.id,
      farmId: farmDoctorLinks.farmId,
      linkedAt: farmDoctorLinks.linkedAt,
      farmName: poultryFarms.name,
      farmLocation: poultryFarms.location,
      farmGovernorate: poultryFarms.governorate,
      farmType: poultryFarms.farmType,
      farmStatus: poultryFarms.status,
      currentPopulation: poultryFarms.currentPopulation,
      capacity: poultryFarms.capacity,
      healthStatus: poultryFarms.healthStatus,
      isVerified: poultryFarms.isVerified,
      licenseNumber: poultryFarms.licenseNumber,
      ownerName: users.name,
      ownerPhone: users.phone,
      needsRenewal: poultryFarms.needsRenewal,
      reviewingRenewalRequest: poultryFarms.reviewingRenewalRequest,
      activationStartDate: poultryFarms.activationStartDate,
      activationEndDate: poultryFarms.activationEndDate,
    })
    .from(farmDoctorLinks)
    .leftJoin(poultryFarms, eq(farmDoctorLinks.farmId, poultryFarms.id))
    .leftJoin(users, eq(poultryFarms.ownerId, users.id))
    .where(and(eq(farmDoctorLinks.doctorId, ctx.user.id), eq(farmDoctorLinks.status, "active")))
    .orderBy(desc(farmDoctorLinks.linkedAt));

  return { farms: links };
});

// ─── Doctor: Unlink from a farm ───────────────────────────────
export const unlinkFarmFromDoctorProcedure = protectedProcedure
  .input(z.object({ linkId: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const [link] = await db
      .select({ farmId: farmDoctorLinks.farmId })
      .from(farmDoctorLinks)
      .where(and(eq(farmDoctorLinks.id, input.linkId), eq(farmDoctorLinks.doctorId, ctx.user.id)))
      .limit(1);

    if (!link) throw new Error("الربط غير موجود");

    await db
      .update(farmDoctorLinks)
      .set({ status: "removed", removedAt: new Date() })
      .where(eq(farmDoctorLinks.id, input.linkId));

    return { success: true, message: "تم إلغاء الربط بالحقل" };
  });

// ─── Farm owner: Get doctors linked to my farm ────────────────
export const getFarmDoctorsProcedure = protectedProcedure
  .input(z.object({ farmId: z.number().int().positive() }))
  .query(async ({ input, ctx }) => {
    // Verify ownership
    const [farm] = await db
      .select({ id: poultryFarms.id })
      .from(poultryFarms)
      .where(and(eq(poultryFarms.id, input.farmId), eq(poultryFarms.ownerId, ctx.user.id)))
      .limit(1);

    if (!farm) throw new Error("الحقل غير موجود");

    const doctors = await db
      .select({
        linkId: farmDoctorLinks.id,
        doctorId: farmDoctorLinks.doctorId,
        linkedAt: farmDoctorLinks.linkedAt,
        doctorName: users.name,
        doctorEmail: users.email,
        doctorPhone: users.phone,
      })
      .from(farmDoctorLinks)
      .leftJoin(users, eq(farmDoctorLinks.doctorId, users.id))
      .where(and(eq(farmDoctorLinks.farmId, input.farmId), eq(farmDoctorLinks.status, "active")));

    return { doctors };
  });

// ─── Farm owner: Remove a doctor from farm ────────────────────
export const removeFarmDoctorProcedure = protectedProcedure
  .input(z.object({ linkId: z.number().int().positive(), farmId: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const [farm] = await db
      .select({ id: poultryFarms.id })
      .from(poultryFarms)
      .where(and(eq(poultryFarms.id, input.farmId), eq(poultryFarms.ownerId, ctx.user.id)))
      .limit(1);

    if (!farm) throw new Error("الحقل غير موجود");

    await db
      .update(farmDoctorLinks)
      .set({ status: "removed", removedAt: new Date() })
      .where(and(eq(farmDoctorLinks.id, input.linkId), eq(farmDoctorLinks.farmId, input.farmId)));

    return { success: true, message: "تم إزالة الطبيب من الحقل" };
  });

// ─── Admin: Get all farm-doctor links ─────────────────────────
export const getAllFarmDoctorLinksProcedure = adminProcedure.query(async () => {
  const links = await db
    .select({
      linkId: farmDoctorLinks.id,
      farmId: farmDoctorLinks.farmId,
      doctorId: farmDoctorLinks.doctorId,
      status: farmDoctorLinks.status,
      linkedAt: farmDoctorLinks.linkedAt,
      farmName: poultryFarms.name,
      farmGovernorate: poultryFarms.governorate,
      doctorName: users.name,
      doctorEmail: users.email,
    })
    .from(farmDoctorLinks)
    .leftJoin(poultryFarms, eq(farmDoctorLinks.farmId, poultryFarms.id))
    .leftJoin(users, eq(farmDoctorLinks.doctorId, users.id))
    .where(eq(farmDoctorLinks.status, "active"))
    .orderBy(desc(farmDoctorLinks.linkedAt));

  return { links };
});
