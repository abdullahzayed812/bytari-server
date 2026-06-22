import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { eggMarketAds, notifications, adminNotifications, users } from "../../../../db/schema";
import { eq, and, desc } from "drizzle-orm";

const AD_EXPIRY_DAYS = 7;

// ─── Public: List approved egg ads ───────────────────────────
export const listEggMarketAdsProcedure = publicProcedure
  .input(
    z.object({
      eggType: z.string().optional(),
      governorate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }) => {
    const ads = await db
      .select({
        id: eggMarketAds.id,
        eggType: eggMarketAds.eggType,
        quantity: eggMarketAds.quantity,
        unit: eggMarketAds.unit,
        pricePerUnit: eggMarketAds.pricePerUnit,
        totalPrice: eggMarketAds.totalPrice,
        pricingMethod: eggMarketAds.pricingMethod,
        productionDate: eggMarketAds.productionDate,
        governorate: eggMarketAds.governorate,
        region: eggMarketAds.region,
        contactPhone: eggMarketAds.contactPhone,
        contactWhatsapp: eggMarketAds.contactWhatsapp,
        images: eggMarketAds.images,
        notes: eggMarketAds.notes,
        isFeatured: eggMarketAds.isFeatured,
        expiresAt: eggMarketAds.expiresAt,
        createdAt: eggMarketAds.createdAt,
        sellerId: eggMarketAds.sellerId,
        sellerName: users.name,
        sellerPhone: users.phone,
      })
      .from(eggMarketAds)
      .leftJoin(users, eq(eggMarketAds.sellerId, users.id))
      .where(and(eq(eggMarketAds.status, "approved"), eq(eggMarketAds.isActive, true)))
      .orderBy(desc(eggMarketAds.isFeatured), desc(eggMarketAds.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    let result = ads;
    if (input.eggType) result = result.filter((a) => a.eggType === input.eggType);
    if (input.governorate) result = result.filter((a) => a.governorate === input.governorate);

    return { ads: result };
  });

// ─── User: Create egg ad ──────────────────────────────────────
export const createEggMarketAdProcedure = protectedProcedure
  .input(
    z.object({
      eggType: z.string(),
      quantity: z.number().int().positive(),
      unit: z.string().default("tray"),
      pricePerUnit: z.number().positive().optional(),
      totalPrice: z.number().positive().optional(),
      pricingMethod: z.enum(["per_tray", "per_carton", "per_piece"]).default("per_tray"),
      productionDate: z.string().optional(),
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
      .insert(eggMarketAds)
      .values({
        sellerId: ctx.user.id,
        eggType: input.eggType,
        quantity: input.quantity,
        unit: input.unit,
        pricePerUnit: input.pricePerUnit?.toString(),
        totalPrice: input.totalPrice?.toString(),
        pricingMethod: input.pricingMethod,
        productionDate: input.productionDate ? new Date(input.productionDate) : undefined,
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
      .returning({ id: eggMarketAds.id });

    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.userType, "admin"));

    if (admins.length > 0) {
      await db.insert(adminNotifications).values(
        admins.map((admin) => ({
          recipientId: admin.id,
          title: "إعلان سوق بيض جديد",
          content: `إعلان بيض جديد بانتظار الموافقة: ${input.eggType} - ${input.quantity} ${input.unit}`,
          type: "approval_request",
          priority: "normal",
          isRead: false,
        }))
      );
    }

    return { success: true, adId: ad.id, message: "تم إرسال الإعلان وهو في انتظار الموافقة" };
  });

// ─── Admin: Get pending egg ads ───────────────────────────────
export const getPendingEggAdsProcedure = adminProcedure.query(async () => {
  const ads = await db
    .select({
      id: eggMarketAds.id,
      eggType: eggMarketAds.eggType,
      quantity: eggMarketAds.quantity,
      unit: eggMarketAds.unit,
      pricePerUnit: eggMarketAds.pricePerUnit,
      totalPrice: eggMarketAds.totalPrice,
      pricingMethod: eggMarketAds.pricingMethod,
      productionDate: eggMarketAds.productionDate,
      governorate: eggMarketAds.governorate,
      region: eggMarketAds.region,
      contactPhone: eggMarketAds.contactPhone,
      contactWhatsapp: eggMarketAds.contactWhatsapp,
      images: eggMarketAds.images,
      notes: eggMarketAds.notes,
      status: eggMarketAds.status,
      createdAt: eggMarketAds.createdAt,
      sellerId: eggMarketAds.sellerId,
      sellerName: users.name,
      sellerPhone: users.phone,
    })
    .from(eggMarketAds)
    .leftJoin(users, eq(eggMarketAds.sellerId, users.id))
    .where(eq(eggMarketAds.status, "pending"))
    .orderBy(desc(eggMarketAds.createdAt));

  return { ads };
});

// ─── Admin: Approve / reject egg ad ──────────────────────────
export const reviewEggAdProcedure = adminProcedure
  .input(
    z.object({
      adId: z.number().int().positive(),
      action: z.enum(["approve", "reject"]),
      rejectionReason: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const [ad] = await db
      .select({ id: eggMarketAds.id, sellerId: eggMarketAds.sellerId })
      .from(eggMarketAds)
      .where(eq(eggMarketAds.id, input.adId))
      .limit(1);

    if (!ad) throw new Error("الإعلان غير موجود");

    await db
      .update(eggMarketAds)
      .set({
        status: input.action === "approve" ? "approved" : "rejected",
        isActive: input.action === "approve",
        rejectionReason: input.rejectionReason,
        updatedAt: new Date(),
      })
      .where(eq(eggMarketAds.id, input.adId));

    await db.insert(notifications).values({
      userId: ad.sellerId,
      title: input.action === "approve" ? "تمت الموافقة على إعلانك" : "تم رفض إعلانك",
      message:
        input.action === "approve"
          ? "تمت الموافقة على إعلانك في سوق البيض وهو الآن مرئي للجميع"
          : `تم رفض إعلانك. ${input.rejectionReason ? `السبب: ${input.rejectionReason}` : ""}`,
      type: input.action === "approve" ? "approval" : "warning",
    });

    return { success: true };
  });

// ─── Admin/Moderator: Delete egg ad ──────────────────────────
export const deleteEggAdProcedure = adminProcedure
  .input(z.object({ adId: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    await db.delete(eggMarketAds).where(eq(eggMarketAds.id, input.adId));
    return { success: true };
  });

// ─── User: Delete own egg ad ──────────────────────────────────
export const deleteMyEggAdProcedure = protectedProcedure
  .input(z.object({ adId: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    await db
      .delete(eggMarketAds)
      .where(and(eq(eggMarketAds.id, input.adId), eq(eggMarketAds.sellerId, ctx.user.id)));
    return { success: true };
  });

// ─── User: Get own egg ads ────────────────────────────────────
export const getMyEggAdsProcedure = protectedProcedure.query(async ({ ctx }) => {
  const ads = await db
    .select()
    .from(eggMarketAds)
    .where(eq(eggMarketAds.sellerId, ctx.user.id))
    .orderBy(desc(eggMarketAds.createdAt));

  return { ads };
});
