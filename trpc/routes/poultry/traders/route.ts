import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure } from "../../../create-context";
import { db } from "../../../../db";
import {
  poultryTraders,
  notifications,
  adminNotifications,
  users,
} from "../../../../db/schema";
import { eq, and, desc } from "drizzle-orm";

const SUPER_ADMIN_EMAILS = ["zuhairalrawi0@gmail.com", "superadmin@petapp.com"];

// ─── User: Register as poultry trader ───────────────────────
export const registerPoultryTraderProcedure = protectedProcedure
  .input(
    z.object({
      businessName: z.string().min(2),
      tradeType: z.string().optional(),
      governorate: z.string().optional(),
      licenseNumber: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      description: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user.id;

    // Check if user already has a trader account
    const [existing] = await db
      .select({ id: poultryTraders.id, status: poultryTraders.status })
      .from(poultryTraders)
      .where(eq(poultryTraders.userId, userId))
      .limit(1);

    if (existing) {
      throw new Error("لديك حساب تاجر بالفعل");
    }

    const [trader] = await db
      .insert(poultryTraders)
      .values({
        userId,
        businessName: input.businessName,
        tradeType: input.tradeType,
        governorate: input.governorate,
        licenseNumber: input.licenseNumber,
        phone: input.phone,
        email: input.email,
        description: input.description,
        status: "pending",
        isActive: false,
      })
      .returning();

    // Notify admins
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.userType, "admin"));

    if (admins.length > 0) {
      await db.insert(adminNotifications).values(
        admins.map((admin) => ({
          recipientId: admin.id,
          title: "طلب تسجيل تاجر دواجن جديد",
          content: `طلب تسجيل تاجر جديد: ${input.businessName}`,
          type: "approval_request",
          priority: "normal",
          actionUrl: `/admin/poultry-traders/${trader.id}`,
          isRead: false,
        }))
      );
    }

    return { success: true, trader, message: "تم إرسال طلب التسجيل وهو في انتظار موافقة الإدارة" };
  });

// ─── User: Get own trader profile ───────────────────────────
export const getMyTraderProfileProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const [trader] = await db
      .select()
      .from(poultryTraders)
      .where(eq(poultryTraders.userId, ctx.user.id))
      .limit(1);

    return { trader: trader || null };
  });

// ─── User: Request trader renewal ───────────────────────────
export const requestTraderRenewalProcedure = protectedProcedure
  .input(z.object({ traderId: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    const [trader] = await db
      .select()
      .from(poultryTraders)
      .where(and(eq(poultryTraders.id, input.traderId), eq(poultryTraders.userId, ctx.user.id)))
      .limit(1);

    if (!trader) throw new Error("حساب التاجر غير موجود");
    if (trader.reviewingRenewalRequest) throw new Error("طلب التجديد قيد المراجعة بالفعل");

    await db
      .update(poultryTraders)
      .set({ reviewingRenewalRequest: true, updatedAt: new Date() })
      .where(eq(poultryTraders.id, input.traderId));

    return { success: true, message: "تم إرسال طلب التجديد" };
  });

// ─── Admin: List all trader accounts ────────────────────────
export const listPoultryTradersProcedure = adminProcedure
  .input(
    z.object({
      status: z.enum(["pending", "active", "suspended", "cancelled", "all"]).default("all"),
    })
  )
  .query(async ({ input }) => {
    const query = db
      .select({
        id: poultryTraders.id,
        userId: poultryTraders.userId,
        businessName: poultryTraders.businessName,
        tradeType: poultryTraders.tradeType,
        governorate: poultryTraders.governorate,
        status: poultryTraders.status,
        isActive: poultryTraders.isActive,
        activationStartDate: poultryTraders.activationStartDate,
        activationEndDate: poultryTraders.activationEndDate,
        needsRenewal: poultryTraders.needsRenewal,
        reviewingRenewalRequest: poultryTraders.reviewingRenewalRequest,
        createdAt: poultryTraders.createdAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
      })
      .from(poultryTraders)
      .leftJoin(users, eq(poultryTraders.userId, users.id));

    const results =
      input.status === "all"
        ? await query.orderBy(desc(poultryTraders.createdAt))
        : await query
            .where(eq(poultryTraders.status, input.status))
            .orderBy(desc(poultryTraders.createdAt));

    return { traders: results };
  });

// ─── Admin: Activate trader with date range ──────────────────
export const activatePoultryTraderProcedure = adminProcedure
  .input(
    z.object({
      traderId: z.number().int().positive(),
      durationDays: z.number().int().positive().default(365),
      adminNotes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const [trader] = await db
      .select()
      .from(poultryTraders)
      .where(eq(poultryTraders.id, input.traderId))
      .limit(1);

    if (!trader) throw new Error("حساب التاجر غير موجود");

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + input.durationDays);

    await db
      .update(poultryTraders)
      .set({
        status: "active",
        isActive: true,
        activationStartDate: startDate,
        activationEndDate: endDate,
        needsRenewal: false,
        reviewingRenewalRequest: false,
        adminNotes: input.adminNotes,
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(poultryTraders.id, input.traderId));

    await db.insert(notifications).values({
      userId: trader.userId,
      title: "تم قبول حساب التاجر",
      message: `تهانينا! تم تفعيل حساب التاجر الخاص بك (${trader.businessName}). يمكنك الآن الوصول إلى جميع خدمات قسم الدواجن.`,
      type: "approval",
    });

    return { success: true, message: "تم تفعيل حساب التاجر بنجاح" };
  });

// ─── Admin: Suspend / cancel trader ─────────────────────────
export const updatePoultryTraderStatusProcedure = adminProcedure
  .input(
    z.object({
      traderId: z.number().int().positive(),
      status: z.enum(["suspended", "cancelled", "active"]),
      adminNotes: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const [trader] = await db
      .select()
      .from(poultryTraders)
      .where(eq(poultryTraders.id, input.traderId))
      .limit(1);

    if (!trader) throw new Error("حساب التاجر غير موجود");

    await db
      .update(poultryTraders)
      .set({
        status: input.status,
        isActive: input.status === "active",
        adminNotes: input.adminNotes,
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(poultryTraders.id, input.traderId));

    const statusMsg: Record<string, string> = {
      suspended: "تم تعليق حساب التاجر الخاص بك مؤقتاً",
      cancelled: "تم إلغاء حساب التاجر الخاص بك",
      active: "تم إعادة تفعيل حساب التاجر الخاص بك",
    };

    await db.insert(notifications).values({
      userId: trader.userId,
      title: "تحديث حالة حساب التاجر",
      message: statusMsg[input.status] || "تم تحديث حالة حسابك",
      type: input.status === "active" ? "approval" : "warning",
    });

    return { success: true, message: "تم تحديث حالة التاجر" };
  });
