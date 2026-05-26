import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryMarketAds, notifications, adminNotifications, users } from "../../../../db/schema";
import { eq, and, desc, lt, inArray } from "drizzle-orm";

const AD_EXPIRY_DAYS = 7;

// ─── Public: List approved ads ───────────────────────────────
export const listPoultryMarketAdsProcedure = publicProcedure
  .input(
    z.object({
      poultryType: z.string().optional(),
      governorate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    const now = new Date();
    const conditions = [
      eq(poultryMarketAds.status, "approved"),
      eq(poultryMarketAds.isActive, true),
    ];

    const ads = await db
      .select({
        id: poultryMarketAds.id,
        poultryType: poultryMarketAds.poultryType,
        breed: poultryMarketAds.breed,
        quantity: poultryMarketAds.quantity,
        unit: poultryMarketAds.unit,
        pricePerUnit: poultryMarketAds.pricePerUnit,
        totalPrice: poultryMarketAds.totalPrice,
        pricingMethod: poultryMarketAds.pricingMethod,
        ageWeeks: poultryMarketAds.ageWeeks,
        weightKg: poultryMarketAds.weightKg,
        governorate: poultryMarketAds.governorate,
        region: poultryMarketAds.region,
        contactPhone: poultryMarketAds.contactPhone,
        contactWhatsapp: poultryMarketAds.contactWhatsapp,
        images: poultryMarketAds.images,
        notes: poultryMarketAds.notes,
        isFeatured: poultryMarketAds.isFeatured,
        expiresAt: poultryMarketAds.expiresAt,
        createdAt: poultryMarketAds.createdAt,
        sellerName: users.name,
        sellerPhone: users.phone,
      })
      .from(poultryMarketAds)
      .leftJoin(users, eq(poultryMarketAds.sellerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(poultryMarketAds.isFeatured), desc(poultryMarketAds.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Filter by type and governorate in JS (avoids complex conditional where)
    let result = ads;
    if (input.poultryType) result = result.filter((a) => a.poultryType === input.poultryType);
    if (input.governorate) result = result.filter((a) => a.governorate === input.governorate);

    return { ads: result };
  });

// ─── User: Create ad ─────────────────────────────────────────
export const createPoultryMarketAdProcedure = protectedProcedure
  .input(
    z.object({
      poultryType: z.string(),
      breed: z.string().optional(),
      quantity: z.number().int().positive(),
      unit: z.string().default("bird"),
      pricePerUnit: z.number().positive().optional(),
      totalPrice: z.number().positive().optional(),
      pricingMethod: z.enum(["per_unit", "per_weight"]).default("per_unit"),
      ageWeeks: z.number().int().optional(),
      weightKg: z.number().optional(),
      governorate: z.string().optional(),
      region: z.string().optional(),
      contactPhone: z.string().optional(),
      contactWhatsapp: z.string().optional(),
      contactEmail: z.string().optional(),
      images: z.array(z.string()).default([]),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + AD_EXPIRY_DAYS);

    const [ad] = await db
      .insert(poultryMarketAds)
      .values({
        sellerId: ctx.user.id,
        poultryType: input.poultryType,
        breed: input.breed,
        quantity: input.quantity,
        unit: input.unit,
        pricePerUnit: input.pricePerUnit?.toString(),
        totalPrice: input.totalPrice?.toString(),
        pricingMethod: input.pricingMethod,
        ageWeeks: input.ageWeeks,
        weightKg: input.weightKg?.toString(),
        governorate: input.governorate,
        region: input.region,
        contactPhone: input.contactPhone,
        contactWhatsapp: input.contactWhatsapp,
        contactEmail: input.contactEmail,
        images: input.images,
        notes: input.notes,
        status: "pending",
        isActive: false,
        expiresAt,
      })
      .returning({ id: poultryMarketAds.id });

    // Notify admins
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.userType, "admin"));

    if (admins.length > 0) {
      await db.insert(adminNotifications).values(
        admins.map((admin) => ({
          recipientId: admin.id,
          title: "إعلان سوق دواجن جديد",
          content: `إعلان جديد بانتظار الموافقة: ${input.poultryType} - ${input.quantity} ${input.unit}`,
          type: "approval_request",
          priority: "normal",
          isRead: false,
        }))
      );
    }

    return { success: true, adId: ad.id, message: "تم إرسال الإعلان وهو في انتظار الموافقة" };
  });

// ─── Admin: Get pending ads ───────────────────────────────────
export const getPendingPoultryAdsProcedure = adminProcedure.query(async () => {
  const ads = await db
    .select({
      id: poultryMarketAds.id,
      poultryType: poultryMarketAds.poultryType,
      quantity: poultryMarketAds.quantity,
      pricePerUnit: poultryMarketAds.pricePerUnit,
      governorate: poultryMarketAds.governorate,
      status: poultryMarketAds.status,
      createdAt: poultryMarketAds.createdAt,
      sellerName: users.name,
      sellerPhone: users.phone,
    })
    .from(poultryMarketAds)
    .leftJoin(users, eq(poultryMarketAds.sellerId, users.id))
    .where(eq(poultryMarketAds.status, "pending"))
    .orderBy(desc(poultryMarketAds.createdAt));

  return { ads };
});

// ─── Admin: Approve / reject ad ──────────────────────────────
export const reviewPoultryAdProcedure = adminProcedure
  .input(
    z.object({
      adId: z.number().int().positive(),
      action: z.enum(["approve", "reject"]),
      rejectionReason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const [ad] = await db
      .select({ id: poultryMarketAds.id, sellerId: poultryMarketAds.sellerId })
      .from(poultryMarketAds)
      .where(eq(poultryMarketAds.id, input.adId))
      .limit(1);

    if (!ad) throw new Error("الإعلان غير موجود");

    await db
      .update(poultryMarketAds)
      .set({
        status: input.action === "approve" ? "approved" : "rejected",
        isActive: input.action === "approve",
        rejectionReason: input.rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(poultryMarketAds.id, input.adId));

    await db.insert(notifications).values({
      userId: ad.sellerId,
      title: input.action === "approve" ? "تمت الموافقة على إعلانك" : "تم رفض إعلانك",
      message:
        input.action === "approve"
          ? "تمت الموافقة على إعلانك في سوق الدواجن وهو الآن مرئي للجميع"
          : `تم رفض إعلانك. ${input.rejectionReason ? `السبب: ${input.rejectionReason}` : ""}`,
      type: input.action === "approve" ? "approval" : "warning",
    });

    return { success: true };
  });

// ─── Admin/Moderator: Delete any ad ──────────────────────────
export const deletePoultryAdProcedure = adminProcedure
  .input(z.object({ adId: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    await db.delete(poultryMarketAds).where(eq(poultryMarketAds.id, input.adId));
    return { success: true };
  });

// ─── User: Delete own ad ──────────────────────────────────────
export const deleteMyPoultryAdProcedure = protectedProcedure
  .input(z.object({ adId: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    await db
      .delete(poultryMarketAds)
      .where(and(eq(poultryMarketAds.id, input.adId), eq(poultryMarketAds.sellerId, ctx.user.id)));
    return { success: true };
  });

// ─── User: Get own ads ────────────────────────────────────────
export const getMyPoultryAdsProcedure = protectedProcedure.query(async ({ ctx }) => {
  const ads = await db
    .select()
    .from(poultryMarketAds)
    .where(eq(poultryMarketAds.sellerId, ctx.user.id))
    .orderBy(desc(poultryMarketAds.createdAt));

  return { ads };
});
