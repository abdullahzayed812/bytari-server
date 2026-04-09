import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { farmStaff, users, poultryFarms, notifications } from "../../../../db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ============== GET FARM WORKERS ==============
export const getFarmWorkersProcedure = publicProcedure
  .input(z.object({ farmId: z.number().int().positive() }))
  .query(async ({ input }) => {
    const workers = await db
      .select({
        id: farmStaff.id,
        userId: farmStaff.userId,
        permissions: farmStaff.permissions,
        createdAt: farmStaff.createdAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        userType: users.userType,
      })
      .from(farmStaff)
      .innerJoin(users, eq(farmStaff.userId, users.id))
      .where(and(eq(farmStaff.farmId, input.farmId), eq(farmStaff.isActive, true)));

    return {
      success: true,
      workers: workers.map((w) => ({
        id: w.id,
        userId: w.userId,
        name: w.userName,
        email: w.userEmail,
        phone: w.userPhone,
        userType: w.userType,
        permissions: w.permissions,
        joinedAt: w.createdAt,
      })),
    };
  });

// ============== ADD FARM WORKER BY EMAIL ==============
export const addFarmWorkerProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      email: z.string().email(),
      permissions: z.enum(["view_only", "add_daily_data"]).default("add_daily_data"),
      addedBy: z.number().int().positive(),
    })
  )
  .mutation(async ({ input }) => {
    // Verify the farm exists
    const [farm] = await db
      .select({ id: poultryFarms.id, name: poultryFarms.name, ownerId: poultryFarms.ownerId })
      .from(poultryFarms)
      .where(eq(poultryFarms.id, input.farmId))
      .limit(1);

    if (!farm) throw new Error("حقل الدواجن غير موجود");

    // Verify the user adding is the owner
    if (farm.ownerId !== input.addedBy) throw new Error("فقط صاحب الحقل يمكنه إضافة موظفين");

    // Find user by email
    const [targetUser] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()))
      .limit(1);

    if (!targetUser) throw new Error("البريد الإلكتروني غير مسجل في النظام");

    if (targetUser.id === input.addedBy) throw new Error("لا يمكنك إضافة نفسك كموظف");

    // Check already added
    const [existing] = await db
      .select({ id: farmStaff.id, isActive: farmStaff.isActive })
      .from(farmStaff)
      .where(and(eq(farmStaff.farmId, input.farmId), eq(farmStaff.userId, targetUser.id)))
      .limit(1);

    if (existing?.isActive) throw new Error("هذا المستخدم موجود بالفعل كموظف في الحقل");

    if (existing && !existing.isActive) {
      // Reactivate
      await db
        .update(farmStaff)
        .set({ isActive: true, permissions: input.permissions, updatedAt: new Date() })
        .where(eq(farmStaff.id, existing.id));
    } else {
      await db.insert(farmStaff).values({
        farmId: input.farmId,
        userId: targetUser.id,
        addedBy: input.addedBy,
        permissions: input.permissions,
        isActive: true,
      });
    }

    // Notify the new worker
    await db.insert(notifications).values({
      userId: targetUser.id,
      title: "تمت إضافتك كموظف في حقل دواجن",
      message: `تمت إضافتك كموظف في حقل الدواجن "${farm.name}". يمكنك الآن الوصول إليه من صفحة حيواناتي.`,
      type: "info",
      data: JSON.stringify({ farmId: farm.id }),
      isRead: false,
      createdAt: new Date(),
    });

    return { success: true, message: `تمت إضافة ${targetUser.name} كموظف بنجاح`, userId: targetUser.id, name: targetUser.name };
  });

// ============== REMOVE FARM WORKER ==============
export const removeFarmWorkerProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      workerId: z.number().int().positive(), // farmStaff.id
      removedBy: z.number().int().positive(),
    })
  )
  .mutation(async ({ input }) => {
    const [farm] = await db
      .select({ ownerId: poultryFarms.ownerId, name: poultryFarms.name })
      .from(poultryFarms)
      .where(eq(poultryFarms.id, input.farmId))
      .limit(1);

    if (!farm) throw new Error("حقل الدواجن غير موجود");
    if (farm.ownerId !== input.removedBy) throw new Error("فقط صاحب الحقل يمكنه إزالة الموظفين");

    const [worker] = await db
      .select({ userId: farmStaff.userId })
      .from(farmStaff)
      .where(eq(farmStaff.id, input.workerId))
      .limit(1);

    await db
      .update(farmStaff)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(farmStaff.id, input.workerId));

    if (worker) {
      await db.insert(notifications).values({
        userId: worker.userId,
        title: "تمت إزالتك من حقل دواجن",
        message: `تمت إزالتك من حقل الدواجن "${farm.name}".`,
        type: "warning",
        data: JSON.stringify({ farmId: input.farmId }),
        isRead: false,
        createdAt: new Date(),
      });
    }

    return { success: true, message: "تمت إزالة الموظف بنجاح" };
  });

// ============== UPDATE FARM WORKER PERMISSIONS ==============
export const updateFarmWorkerPermissionsProcedure = publicProcedure
  .input(
    z.object({
      workerId: z.number().int().positive(),
      permissions: z.enum(["view_only", "add_daily_data"]),
      updatedBy: z.number().int().positive(),
    })
  )
  .mutation(async ({ input }) => {
    const [record] = await db
      .select({ farmId: farmStaff.farmId })
      .from(farmStaff)
      .where(eq(farmStaff.id, input.workerId))
      .limit(1);

    if (!record) throw new Error("السجل غير موجود");

    const [farm] = await db
      .select({ ownerId: poultryFarms.ownerId })
      .from(poultryFarms)
      .where(eq(poultryFarms.id, record.farmId))
      .limit(1);

    if (farm?.ownerId !== input.updatedBy) throw new Error("فقط صاحب الحقل يمكنه تعديل الصلاحيات");

    await db
      .update(farmStaff)
      .set({ permissions: input.permissions, updatedAt: new Date() })
      .where(eq(farmStaff.id, input.workerId));

    return { success: true, message: "تم تحديث الصلاحيات بنجاح" };
  });

// ============== GET WORKER FARMS (farms where this user is a staff member) ==============
export const getWorkerFarmsProcedure = publicProcedure
  .input(z.object({ userId: z.number().int().positive() }))
  .query(async ({ input }) => {
    const assignments = await db
      .select({
        farmId: farmStaff.farmId,
        permissions: farmStaff.permissions,
      })
      .from(farmStaff)
      .where(and(eq(farmStaff.userId, input.userId), eq(farmStaff.isActive, true)));

    if (!assignments.length) return { success: true, farms: [] };

    const farmIds = assignments.map((a) => a.farmId);
    const permMap = Object.fromEntries(assignments.map((a) => [a.farmId, a.permissions]));

    const farms = await db
      .select({
        id: poultryFarms.id,
        name: poultryFarms.name,
        location: poultryFarms.location,
        address: poultryFarms.address,
        farmType: poultryFarms.farmType,
        capacity: poultryFarms.capacity,
        phone: poultryFarms.phone,
        isActive: poultryFarms.isActive,
        status: poultryFarms.status,
        needsRenewal: poultryFarms.needsRenewal,
        activationStartDate: poultryFarms.activationStartDate,
        activationEndDate: poultryFarms.activationEndDate,
        ownerId: poultryFarms.ownerId,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(poultryFarms)
      .leftJoin(users, eq(poultryFarms.ownerId, users.id))
      .where(inArray(poultryFarms.id, farmIds));

    return {
      success: true,
      farms: farms.map((f) => ({
        ...f,
        permissions: permMap[f.id] || "view_only",
        isWorker: true,
        owner: { id: f.ownerId, name: f.ownerName, email: f.ownerEmail },
      })),
    };
  });
