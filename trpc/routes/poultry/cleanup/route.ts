import { adminProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { poultryMarketAds, eggMarketAds } from "../../../../db/schema";
import { lt, and, eq } from "drizzle-orm";

/**
 * Cleanup expired poultry and egg market ads.
 * Ads auto-delete after 7 days (expiresAt is set on creation).
 * Call this procedure from a scheduled job / cron endpoint.
 */
export const cleanupExpiredAdsProcedure = adminProcedure.mutation(async () => {
  const now = new Date();

  const [deletedPoultry, deletedEgg] = await Promise.all([
    db
      .delete(poultryMarketAds)
      .where(lt(poultryMarketAds.expiresAt, now))
      .returning({ id: poultryMarketAds.id }),
    db
      .delete(eggMarketAds)
      .where(lt(eggMarketAds.expiresAt, now))
      .returning({ id: eggMarketAds.id }),
  ]);

  return {
    success: true,
    deletedPoultryAds: deletedPoultry.length,
    deletedEggAds: deletedEgg.length,
    message: `تم حذف ${deletedPoultry.length + deletedEgg.length} إعلان منتهي`,
  };
});
