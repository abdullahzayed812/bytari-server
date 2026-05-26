import { z } from "zod";
import { publicProcedure, adminProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryExchangePrices } from "../../../../db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { IRAQ_GOVERNORATES } from "../../../../db/schema";

// ─── Public: Get prices for a specific date ───────────────────
export const getPoultryExchangePricesProcedure = publicProcedure
  .input(z.object({ date: z.string().optional() })) // YYYY-MM-DD, defaults to today
  .query(async ({ input }) => {
    const date = input.date || new Date().toISOString().split("T")[0];
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split("T")[0];

    const [current, previous] = await Promise.all([
      db
        .select()
        .from(poultryExchangePrices)
        .where(eq(poultryExchangePrices.date, date))
        .orderBy(poultryExchangePrices.governorate),
      db
        .select()
        .from(poultryExchangePrices)
        .where(eq(poultryExchangePrices.date, prevDateStr))
        .orderBy(poultryExchangePrices.governorate),
    ]);

    // Merge current with previous-day comparison
    const previousMap = new Map(previous.map((p) => [p.governorate, p]));

    const rows = IRAQ_GOVERNORATES.map((gov) => {
      const curr = current.find((c) => c.governorate === gov);
      const prev = previousMap.get(gov);

      const broilerChange =
        curr?.broilerPricePerKg && prev?.broilerPricePerKg
          ? Number(curr.broilerPricePerKg) - Number(prev.broilerPricePerKg)
          : null;

      const layerChange =
        curr?.layerPricePerBird && prev?.layerPricePerBird
          ? Number(curr.layerPricePerBird) - Number(prev.layerPricePerBird)
          : null;

      return {
        governorate: gov,
        broilerPricePerKg: curr?.broilerPricePerKg ? Number(curr.broilerPricePerKg) : null,
        layerPricePerBird: curr?.layerPricePerBird ? Number(curr.layerPricePerBird) : null,
        broilerChange,
        layerChange,
        broilerTrend: broilerChange === null ? null : broilerChange > 0 ? "up" : broilerChange < 0 ? "down" : "same",
        layerTrend: layerChange === null ? null : layerChange > 0 ? "up" : layerChange < 0 ? "down" : "same",
      };
    });

    return { date, rows };
  });

// ─── Admin: Get prices for editing ────────────────────────────
export const getPoultryExchangeForEditProcedure = adminProcedure
  .input(z.object({ date: z.string() }))
  .query(async ({ input }) => {
    const prices = await db
      .select()
      .from(poultryExchangePrices)
      .where(eq(poultryExchangePrices.date, input.date));

    // Return all governorates with existing values or nulls
    const priceMap = new Map(prices.map((p) => [p.governorate, p]));

    const rows = IRAQ_GOVERNORATES.map((gov) => {
      const existing = priceMap.get(gov);
      return {
        governorate: gov,
        broilerPricePerKg: existing?.broilerPricePerKg ? Number(existing.broilerPricePerKg) : null,
        layerPricePerBird: existing?.layerPricePerBird ? Number(existing.layerPricePerBird) : null,
      };
    });

    return { date: input.date, rows };
  });

// ─── Admin: Save / upsert prices for a date ───────────────────
export const savePoultryExchangePricesProcedure = adminProcedure
  .input(
    z.object({
      date: z.string(), // YYYY-MM-DD
      prices: z.array(
        z.object({
          governorate: z.string(),
          broilerPricePerKg: z.number().positive().optional(),
          layerPricePerBird: z.number().positive().optional(),
        })
      ),
    })
  )
  .mutation(async ({ input, ctx }) => {
    // Delete existing for this date and re-insert
    await db
      .delete(poultryExchangePrices)
      .where(eq(poultryExchangePrices.date, input.date));

    const rows = input.prices
      .filter((p) => p.broilerPricePerKg || p.layerPricePerBird)
      .map((p) => ({
        date: input.date,
        governorate: p.governorate,
        broilerPricePerKg: p.broilerPricePerKg?.toString(),
        layerPricePerBird: p.layerPricePerBird?.toString(),
        addedBy: ctx.user.id,
      }));

    if (rows.length > 0) {
      await db.insert(poultryExchangePrices).values(rows);
    }

    return { success: true, message: "تم حفظ الأسعار بنجاح" };
  });
