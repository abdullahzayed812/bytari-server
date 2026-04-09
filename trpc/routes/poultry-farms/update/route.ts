import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryFarms } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";

export const updatePoultryFarmProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      ownerId: z.number().int().positive(),
      name: z.string().min(1).optional(),
      location: z.string().optional(),
      address: z.string().optional(),
      farmType: z.enum(["broiler", "layer", "breeder", "mixed"]).optional(),
      capacity: z.number().int().positive().optional(),
      currentPopulation: z.number().int().min(0).optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      description: z.string().optional(),
      licenseNumber: z.string().optional(),
      contactPerson: z.string().optional(),
      healthStatus: z.enum(["healthy", "quarantine", "sick"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { farmId, ownerId, ...updates } = input;

    const [farm] = await db
      .select({ ownerId: poultryFarms.ownerId })
      .from(poultryFarms)
      .where(eq(poultryFarms.id, farmId))
      .limit(1);

    if (!farm) throw new Error("حقل الدواجن غير موجود");
    if (farm.ownerId !== ownerId) throw new Error("فقط صاحب الحقل يمكنه تعديل المعلومات");

    const setObj: Record<string, any> = { updatedAt: new Date() };
    if (updates.name !== undefined) setObj.name = updates.name;
    if (updates.location !== undefined) setObj.location = updates.location;
    if (updates.address !== undefined) setObj.address = updates.address;
    if (updates.farmType !== undefined) setObj.farmType = updates.farmType;
    if (updates.capacity !== undefined) setObj.capacity = updates.capacity;
    if (updates.currentPopulation !== undefined) setObj.currentPopulation = updates.currentPopulation;
    if (updates.phone !== undefined) setObj.phone = updates.phone;
    if (updates.email !== undefined) setObj.email = updates.email || null;
    if (updates.description !== undefined) setObj.description = updates.description;
    if (updates.licenseNumber !== undefined) setObj.licenseNumber = updates.licenseNumber;
    if (updates.contactPerson !== undefined) setObj.contactPerson = updates.contactPerson;
    if (updates.healthStatus !== undefined) setObj.healthStatus = updates.healthStatus;

    await db.update(poultryFarms).set(setObj).where(eq(poultryFarms.id, farmId));

    return { success: true, message: "تم تحديث معلومات الحقل بنجاح" };
  });
