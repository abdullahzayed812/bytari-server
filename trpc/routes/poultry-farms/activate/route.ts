import { z } from "zod";
import { adminProcedure, publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryFarms, adminNotifications, notifications, users, approvalRequests } from "../../../../db/schema";
import { eq, and, inArray } from "drizzle-orm";

const SUPER_ADMIN_EMAILS = ["zuhairalrawi0@gmail.com", "superadmin@petapp.com"];

// Admin: activate a poultry farm with date range
export const activatePoultryFarmProcedure = adminProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      activationStartDate: z.date(),
      activationEndDate: z.date(),
    }),
  )
  .mutation(async ({ input }) => {
    const [farm] = await db
      .select({ id: poultryFarms.id, ownerId: poultryFarms.ownerId, name: poultryFarms.name })
      .from(poultryFarms)
      .where(eq(poultryFarms.id, input.farmId))
      .limit(1);

    if (!farm) throw new Error("حقل الدواجن غير موجود");

    await db
      .update(poultryFarms)
      .set({
        isActive: true,
        isVerified: true,
        status: "active",
        activationStartDate: input.activationStartDate,
        activationEndDate: input.activationEndDate,
        needsRenewal: false,
        reviewingRenewalRequest: false,
        updatedAt: new Date(),
      })
      .where(eq(poultryFarms.id, input.farmId));

    // Mark any pending approval request as approved
    await db
      .update(approvalRequests)
      .set({ status: "approved", updatedAt: Math.floor(Date.now() / 1000) })
      .where(
        and(eq(approvalRequests.resourceId, input.farmId), eq(approvalRequests.requestType, "poultry_farm_activation"), eq(approvalRequests.status, "pending")),
      );

    // In-app notification to farm owner
    await db.insert(notifications).values({
      userId: farm.ownerId,
      title: "تم قبول حقل الدواجن",
      message: `تم قبول وتفعيل حقل الدواجن "${farm.name}". صالح حتى ${input.activationEndDate.toLocaleDateString()}.`,
      type: "approval",
      data: JSON.stringify({ farmId: farm.id }),
      isRead: false,
      createdAt: new Date(),
    });

    return { success: true, message: "تم تفعيل حقل الدواجن بنجاح" };
  });

// Admin: reject a poultry farm activation
export const rejectPoultryFarmProcedure = adminProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      rejectionReason: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const [farm] = await db
      .select({ id: poultryFarms.id, ownerId: poultryFarms.ownerId, name: poultryFarms.name })
      .from(poultryFarms)
      .where(eq(poultryFarms.id, input.farmId))
      .limit(1);

    if (!farm) throw new Error("حقل الدواجن غير موجود");

    await db
      .update(poultryFarms)
      .set({ isActive: false, isVerified: false, status: "rejected", updatedAt: new Date() })
      .where(eq(poultryFarms.id, input.farmId));

    // Mark pending approval request as rejected
    await db
      .update(approvalRequests)
      .set({
        status: "rejected",
        rejectionReason: input.rejectionReason,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(
        and(eq(approvalRequests.resourceId, input.farmId), eq(approvalRequests.requestType, "poultry_farm_activation"), eq(approvalRequests.status, "pending")),
      );

    // In-app notification to farm owner
    await db.insert(notifications).values({
      userId: farm.ownerId,
      title: "تم رفض طلب تفعيل حقل الدواجن",
      message: `تم رفض طلب تفعيل حقل الدواجن "${farm.name}". السبب: ${input.rejectionReason}`,
      type: "error",
      data: JSON.stringify({ farmId: farm.id }),
      isRead: false,
      createdAt: new Date(),
    });

    return { success: true, message: "تم رفض حقل الدواجن" };
  });

// Check and mark expired poultry farm subscriptions
export const checkExpiredPoultryFarmsProcedure = publicProcedure.input(z.object({ adminId: z.number() })).mutation(async ({ input }) => {
  const now = new Date();

  const activeFarms = await db
    .select({ id: poultryFarms.id, name: poultryFarms.name, ownerId: poultryFarms.ownerId, activationEndDate: poultryFarms.activationEndDate })
    .from(poultryFarms)
    .where(and(eq(poultryFarms.isActive, true), eq(poultryFarms.needsRenewal, false)));

  let expiredCount = 0;
  for (const farm of activeFarms) {
    if (farm.activationEndDate && new Date(farm.activationEndDate) <= now) {
      await db.update(poultryFarms).set({ isActive: false, needsRenewal: true, updatedAt: now }).where(eq(poultryFarms.id, farm.id));

      await db.insert(adminNotifications).values({
        recipientId: farm.ownerId,
        type: "system_alert",
        title: "انتهت صلاحية حقل الدواجن",
        content: `انتهت صلاحية تفعيل حقل الدواجن "${farm.name}". يرجى تجديد الاشتراك.`,
        relatedResourceType: "poultry_farm",
        relatedResourceId: farm.id,
        priority: "high",
      });

      expiredCount++;
    }
  }

  return { success: true, expiredCount };
});

// Owner: renew subscription request
export const requestPoultryFarmRenewalProcedure = publicProcedure
  .input(z.object({ farmId: z.number().int().positive(), ownerId: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const [farm] = await db
      .select({
        id: poultryFarms.id,
        name: poultryFarms.name,
        needsRenewal: poultryFarms.needsRenewal,
        reviewingRenewalRequest: poultryFarms.reviewingRenewalRequest,
      })
      .from(poultryFarms)
      .where(and(eq(poultryFarms.id, input.farmId), eq(poultryFarms.ownerId, input.ownerId)))
      .limit(1);

    if (!farm) throw new Error("حقل الدواجن غير موجود");
    if (!farm.needsRenewal) throw new Error("لا يحتاج الحقل إلى تجديد");
    if (farm.reviewingRenewalRequest) throw new Error("طلب التجديد قيد المراجعة بالفعل");

    await db.update(poultryFarms).set({ reviewingRenewalRequest: true, updatedAt: new Date() }).where(eq(poultryFarms.id, input.farmId));

    await db.insert(approvalRequests).values({
      requestType: "poultry_farm_renewal",
      requesterId: input.ownerId,
      resourceId: input.farmId,
      title: `طلب تجديد اشتراك حقل دواجن ${farm.name}`,
      description: `طلب تجديد اشتراك حقل الدواجن ${farm.name}`,
      paymentStatus: "not_required",
      status: "pending",
      priority: "high",
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    });

    const adminUsers = await db.select({ id: users.id }).from(users).where(inArray(users.email, SUPER_ADMIN_EMAILS));
    for (const admin of adminUsers) {
      await db.insert(adminNotifications).values({
        recipientId: admin.id,
        type: "approval_request",
        title: "طلب تجديد حقل دواجن",
        content: `طلب تجديد اشتراك حقل الدواجن: ${farm.name}`,
        relatedResourceType: "poultry_farm",
        relatedResourceId: farm.id,
        priority: "high",
      });
    }

    return { success: true, message: "تم إرسال طلب التجديد بنجاح" };
  });

// Admin: ban a poultry farm
export const banPoultryFarmProcedure = adminProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      reason: z.string().min(1),
    }),
  )
  .mutation(async ({ input }) => {
    const [farm] = await db
      .select({ id: poultryFarms.id, ownerId: poultryFarms.ownerId, name: poultryFarms.name })
      .from(poultryFarms)
      .where(eq(poultryFarms.id, input.farmId))
      .limit(1);

    if (!farm) throw new Error("حقل الدواجن غير موجود");

    await db
      .update(poultryFarms)
      .set({ isActive: false, isVerified: false, status: "banned", needsRenewal: false, reviewingRenewalRequest: false, updatedAt: new Date() })
      .where(eq(poultryFarms.id, input.farmId));

    await db.insert(notifications).values({
      userId: farm.ownerId,
      title: "تم حظر حقل الدواجن",
      message: `تم حظر حقل الدواجن "${farm.name}". السبب: ${input.reason}`,
      type: "error",
      data: JSON.stringify({ farmId: farm.id }),
      isRead: false,
      createdAt: new Date(),
    });

    return { success: true, message: "تم حظر حقل الدواجن" };
  });

// Admin: deactivate an active poultry farm
export const deactivatePoultryFarmProcedure = adminProcedure.input(z.object({ farmId: z.number().int().positive() })).mutation(async ({ input }) => {
  const [farm] = await db
    .select({ id: poultryFarms.id, ownerId: poultryFarms.ownerId, name: poultryFarms.name })
    .from(poultryFarms)
    .where(eq(poultryFarms.id, input.farmId))
    .limit(1);

  if (!farm) throw new Error("حقل الدواجن غير موجود");

  await db
    .update(poultryFarms)
    .set({ isActive: false, status: "deactivated", needsRenewal: false, reviewingRenewalRequest: false, updatedAt: new Date() })
    .where(eq(poultryFarms.id, input.farmId));

  await db.insert(notifications).values({
    userId: farm.ownerId,
    title: "تم إيقاف تفعيل حقل الدواجن",
    message: `تم إيقاف تفعيل حقل الدواجن "${farm.name}" من قبل الإدارة.`,
    type: "warning",
    data: JSON.stringify({ farmId: farm.id }),
    isRead: false,
    createdAt: new Date(),
  });

  return { success: true, message: "تم إيقاف تفعيل حقل الدواجن" };
});
