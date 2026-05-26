import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryFarms } from "../../../../db/schema";
import { eq, and, sum, count } from "drizzle-orm";
import { IRAQ_GOVERNORATES } from "../../../../db/schema";

// ─── Public: Aggregate poultry statistics ─────────────────────
export const getPoultryStatisticsProcedure = publicProcedure
  .input(
    z.object({
      farmType: z.enum(["all", "broiler", "layer", "breeder", "mixed"]).default("all"),
    }).optional()
  )
  .query(async ({ input }) => {
    const farmType = input?.farmType ?? "all";
    const activeConditions = [eq(poultryFarms.status, "active"), eq(poultryFarms.isActive, true)];
    if (farmType !== "all") {
      activeConditions.push(eq(poultryFarms.farmType, farmType));
    }

    // Total active farms
    const [totals] = await db
      .select({
        totalFarms: count(poultryFarms.id),
        totalBirds: sum(poultryFarms.currentPopulation),
      })
      .from(poultryFarms)
      .where(and(...activeConditions));

    // Per-governorate breakdown
    const allFarms = await db
      .select({
        governorate: poultryFarms.governorate,
        farmType: poultryFarms.farmType,
        currentPopulation: poultryFarms.currentPopulation,
        capacity: poultryFarms.capacity,
        updatedAt: poultryFarms.updatedAt,
      })
      .from(poultryFarms)
      .where(and(...activeConditions));

    // Aggregate per governorate
    const govMap = new Map<
      string,
      { totalBirds: number; farmCount: number; lastUpdated: Date | null }
    >();

    for (const farm of allFarms) {
      const gov = farm.governorate || "غير محدد";
      const existing = govMap.get(gov) || { totalBirds: 0, farmCount: 0, lastUpdated: null };
      existing.totalBirds += farm.currentPopulation ?? 0;
      existing.farmCount += 1;
      if (!existing.lastUpdated || new Date(farm.updatedAt) > existing.lastUpdated) {
        existing.lastUpdated = new Date(farm.updatedAt);
      }
      govMap.set(gov, existing);
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
      totalFarms: Number(totals?.totalFarms ?? 0),
      totalBirds: Number(totals?.totalBirds ?? 0),
      governorateStats,
      farmType: input?.farmType ?? "all",
    };
  });
