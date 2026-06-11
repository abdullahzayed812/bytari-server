import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryFarms, poultryBatches } from "../../../../db/schema";
import { eq, and } from "drizzle-orm";
import { IRAQ_GOVERNORATES } from "../../../../db/schema";

// ─── Public: Aggregate poultry statistics ─────────────────────
export const getPoultryStatisticsProcedure = publicProcedure
  .input(
    z.object({
      farmType: z.enum(["all", "broiler", "layer"]).default("all"),
    }).optional()
  )
  .query(async ({ input }) => {
    const farmType = input?.farmType ?? "all";
    const activeConditions = [
      eq(poultryFarms.status, "active"),
      eq(poultryFarms.isActive, true),
    ];
    if (farmType !== "all") {
      activeConditions.push(eq(poultryFarms.farmType, farmType));
    }

    // Join active farms with their active batches to get real-time bird counts
    const farmRows = await db
      .select({
        farmId: poultryFarms.id,
        farmType: poultryFarms.farmType,
        governorate: poultryFarms.governorate,
        updatedAt: poultryFarms.updatedAt,
        batchCurrentCount: poultryBatches.currentCount,
      })
      .from(poultryFarms)
      .leftJoin(
        poultryBatches,
        and(
          eq(poultryBatches.farmId, poultryFarms.id),
          eq(poultryBatches.status, "active")
        )
      )
      .where(and(...activeConditions));

    // Aggregate per farm (a farm may have multiple active batches)
    const farmAgg = new Map<
      number,
      { governorate: string; updatedAt: Date; totalBirds: number }
    >();
    for (const row of farmRows) {
      const existing = farmAgg.get(row.farmId);
      if (existing) {
        existing.totalBirds += row.batchCurrentCount ?? 0;
      } else {
        farmAgg.set(row.farmId, {
          governorate: row.governorate || "غير محدد",
          updatedAt: new Date(row.updatedAt),
          totalBirds: row.batchCurrentCount ?? 0,
        });
      }
    }

    // Compute totals and governorate breakdown from aggregated farm data
    let totalBirds = 0;
    const govMap = new Map<
      string,
      { totalBirds: number; farmCount: number; lastUpdated: Date | null }
    >();

    for (const [, farm] of farmAgg) {
      totalBirds += farm.totalBirds;
      const gov = farm.governorate;
      const existing = govMap.get(gov) || { totalBirds: 0, farmCount: 0, lastUpdated: null };
      existing.totalBirds += farm.totalBirds;
      existing.farmCount += 1;
      if (!existing.lastUpdated || farm.updatedAt > existing.lastUpdated) {
        existing.lastUpdated = farm.updatedAt;
      }
      govMap.set(gov, existing);
    }

    const totalFarms = farmAgg.size;

    // Layer birds — always computed regardless of the farmType filter
    let totalLayerBirds: number;
    if (farmType === "layer") {
      totalLayerBirds = totalBirds;
    } else {
      const layerRows = await db
        .select({ batchCurrentCount: poultryBatches.currentCount })
        .from(poultryFarms)
        .leftJoin(
          poultryBatches,
          and(
            eq(poultryBatches.farmId, poultryFarms.id),
            eq(poultryBatches.status, "active")
          )
        )
        .where(
          and(
            eq(poultryFarms.status, "active"),
            eq(poultryFarms.isActive, true),
            eq(poultryFarms.farmType, "layer")
          )
        );
      totalLayerBirds = layerRows.reduce((s, r) => s + (r.batchCurrentCount ?? 0), 0);
    }

    const governorateStats = IRAQ_GOVERNORATES.map((gov) => {
      const data = govMap.get(gov) || { totalBirds: 0, farmCount: 0, lastUpdated: null };
      return {
        governorate: gov,
        totalBirds: data.totalBirds,
        farmCount: data.farmCount,
        lastUpdated: data.lastUpdated,
      };
    }).sort((a, b) => b.totalBirds - a.totalBirds);

    return {
      totalFarms,
      totalBirds,
      totalLayerBirds,
      governorateStats,
      farmType: input?.farmType ?? "all",
    };
  });
