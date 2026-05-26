import { z } from "zod";
import { publicProcedure, adminProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { eggExchangePrices } from "../../../../db/schema";
import { eq, desc } from "drizzle-orm";
import { IRAQ_GOVERNORATES } from "../../../../db/schema";

// ─── Public: Get egg prices for a date ────────────────────────
export const getEggExchangePricesProcedure = publicProcedure
  .input(z.object({ date: z.string().optional() }))
  .query(async ({ input }) => {
    const date = input.date || new Date().toISOString().split("T")[0];
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split("T")[0];

    const [current, previous] = await Promise.all([
      db.select().from(eggExchangePrices).where(eq(eggExchangePrices.date, date)),
      db.select().from(eggExchangePrices).where(eq(eggExchangePrices.date, prevDateStr)),
    ]);

    const previousMap = new Map(previous.map((p) => [p.governorate, p]));

    const rows = IRAQ_GOVERNORATES.map((gov) => {
      const curr = current.find((c) => c.governorate === gov);
      const prev = previousMap.get(gov);

      const change =
        curr?.pricePerTray && prev?.pricePerTray
          ? Number(curr.pricePerTray) - Number(prev.pricePerTray)
          : null;

      return {
        governorate: gov,
        pricePerTray: curr?.pricePerTray ? Number(curr.pricePerTray) : null,
        change,
        trend: change === null ? null : change > 0 ? "up" : change < 0 ? "down" : "same",
      };
    });

    return { date, rows };
  });

// ─── Admin: Get egg prices for editing ────────────────────────
export const getEggExchangeForEditProcedure = adminProcedure
  .input(z.object({ date: z.string() }))
  .query(async ({ input }) => {
    const prices = await db
      .select()
      .from(eggExchangePrices)
      .where(eq(eggExchangePrices.date, input.date));

    const priceMap = new Map(prices.map((p) => [p.governorate, p]));

    const rows = IRAQ_GOVERNORATES.map((gov) => ({
      governorate: gov,
      pricePerTray: priceMap.get(gov)?.pricePerTray
        ? Number(priceMap.get(gov)!.pricePerTray)
        : null,
    }));

    return { date: input.date, rows };
  });

// ─── Admin: Save egg exchange prices ──────────────────────────
export const saveEggExchangePricesProcedure = adminProcedure
  .input(
    z.object({
      date: z.string(),
      prices: z.array(
        z.object({
          governorate: z.string(),
          pricePerTray: z.number().positive().optional(),
        })
      ),
    })
  )
  .mutation(async ({ input, ctx }) => {
    await db.delete(eggExchangePrices).where(eq(eggExchangePrices.date, input.date));

    const rows = input.prices
      .filter((p) => p.pricePerTray)
      .map((p) => ({
        date: input.date,
        governorate: p.governorate,
        pricePerTray: p.pricePerTray!.toString(),
        addedBy: ctx.user.id,
      }));

    if (rows.length > 0) {
      await db.insert(eggExchangePrices).values(rows);
    }

    return { success: true, message: "تم حفظ أسعار البيض بنجاح" };
  });
