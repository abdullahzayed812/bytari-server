import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { db, poultryBatches, poultryDailyData } from "../../../db";
import { eq } from "drizzle-orm";

export const addPoultryBatchProcedure = publicProcedure
  .input(
    z.object({
      farmId: z.number().int().positive(),
      initialCount: z.number().int().positive(),
      pricePerChick: z.number().positive(),
      initialWeight: z.number().positive().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Adding new poultry batch:", input);

    try {
      // Get the next batch number
      const existingBatches = await db.select().from(poultryBatches).where(eq(poultryBatches.farmId, input.farmId));

      const batchNumber = existingBatches.length + 1;

      // Create new batch
      const [newBatch] = await db
        .insert(poultryBatches)
        .values({
          farmId: input.farmId,
          batchNumber,
          startDate: new Date(),
          initialCount: input.initialCount,
          currentCount: input.initialCount,
          chicksAge: 0,
          pricePerChick: input.pricePerChick.toString(),
          totalInvestment: (input.initialCount * input.pricePerChick).toString(),
          initialWeight: input.initialWeight?.toString(),
          status: "active",
        })
        .returning();

      console.log("Batch added successfully");
      return {
        success: true,
        batch: newBatch,
      };
    } catch (error) {
      console.error("Error adding batch:", error);
      throw new Error("فشل في إضافة الدفعة");
    }
  });

// ============== ADD DAILY DATA ==============
export const addDailyDataProcedure = publicProcedure
  .input(
    z.object({
      batchId: z.number().int().positive(),
      mortality: z.number().int().min(0),
      mortalityReasons: z.array(z.string()).optional(),
      feedConsumption: z.number().positive(),
      averageWeight: z.number().positive(),
      treatments: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            duration: z.number(),
            administeredBy: z.string(),
            cost: z.number(),
            reason: z.string(),
            notes: z.string(),
          })
        )
        .optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Adding daily data:", input);

    try {
      // Get batch info
      const [batch] = await db.select().from(poultryBatches).where(eq(poultryBatches.id, input.batchId));

      if (!batch) {
        throw new Error("الدفعة غير موجودة");
      }

      // Get existing daily data count
      const existingData = await db.select().from(poultryDailyData).where(eq(poultryDailyData.batchId, input.batchId));

      const dayNumber = existingData.length + 1;

      // Calculate feed cost and estimated profit
      const feedCost = input.feedConsumption * 0.5; // تكلفة تقديرية
      const mortalityLoss = input.mortality * parseFloat(batch.pricePerChick);
      const estimatedRevenue = batch.currentCount * 0.02;
      const estimatedProfit = Math.max(0, estimatedRevenue - feedCost - mortalityLoss);

      // Insert daily data
      const [dailyData] = await db
        .insert(poultryDailyData)
        .values({
          batchId: input.batchId,
          dayNumber,
          date: new Date(),
          feedConsumption: input.feedConsumption.toString(),
          feedCost: feedCost.toString(),
          averageWeight: input.averageWeight.toString(),
          mortality: input.mortality,
          mortalityReasons: input.mortalityReasons || [],
          treatments: input.treatments || [],
          vaccinations: [],
          estimatedProfit: estimatedProfit.toString(),
          notes: input.notes,
        })
        .returning();

      // Update batch
      const newCurrentCount = Math.max(0, batch.currentCount - input.mortality);
      const newChicksAge = batch.chicksAge + 1;

      await db
        .update(poultryBatches)
        .set({
          currentCount: newCurrentCount,
          chicksAge: newChicksAge,
          updatedAt: new Date(),
        })
        .where(eq(poultryBatches.id, input.batchId));

      console.log("Daily data added successfully");
      return {
        success: true,
        dailyData,
        updatedBatch: {
          ...batch,
          currentCount: newCurrentCount,
          chicksAge: newChicksAge,
        },
      };
    } catch (error) {
      console.error("Error adding daily data:", error);
      throw new Error("فشل في إضافة البيانات اليومية");
    }
  });

// ============== SELL BATCH ==============
export const sellBatchProcedure = publicProcedure
  .input(
    z.object({
      batchId: z.number().int().positive(),
      finalCount: z.number().int().positive().optional(),
      totalProfit: z.number().optional(),
    })
  )
  .mutation(async ({ input }) => {
    console.log("Selling batch:", input);

    try {
      const [batch] = await db.select().from(poultryBatches).where(eq(poultryBatches.id, input.batchId));

      if (!batch) {
        throw new Error("الدفعة غير موجودة");
      }

      // Calculate total profit from daily data if not provided
      let totalProfit = input.totalProfit;
      if (!totalProfit) {
        const dailyData = await db.select().from(poultryDailyData).where(eq(poultryDailyData.batchId, input.batchId));

        totalProfit = dailyData.reduce((sum, day) => sum + parseFloat(day.estimatedProfit), 0);
      }

      // Update batch
      await db
        .update(poultryBatches)
        .set({
          status: "sold",
          endDate: new Date(),
          finalCount: input.finalCount || batch.currentCount,
          totalProfit: totalProfit.toString(),
          updatedAt: new Date(),
        })
        .where(eq(poultryBatches.id, input.batchId));

      console.log("Batch sold successfully");
      return {
        success: true,
        message: "تم بيع الدفعة بنجاح",
      };
    } catch (error) {
      console.error("Error selling batch:", error);
      throw new Error("فشل في بيع الدفعة");
    }
  });
