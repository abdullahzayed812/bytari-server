import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, advertisements, adminActivityLogs } from "../../../../db";
import { eq, and, desc, gte, lte, count, sum } from "drizzle-orm";

// Create advertisement
export const createAdvertisementProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      title: z.string().min(1),
      content: z.string().optional(),
      image: z.string().optional(),
      link: z.string().optional(),
      type: z.enum(["banner", "popup", "inline", "image_only", "image_with_link"]),
      position: z.string().optional(),
      interface: z.enum(["pet_owner", "vet", "both"]).default("both"),
      clickAction: z.enum(["none", "open_link", "open_file"]).default("none"),
      startDate: z.date(),
      endDate: z.date(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Validate dates
      if (input.endDate <= input.startDate) {
        throw new Error("End date must be after start date");
      }

      // Create advertisement
      const [advertisement] = await db
        .insert(advertisements)
        .values({
          title: input.title,
          content: input.content,
          image: input.image,
          link: input.link,
          type: input.type,
          position: input.position,
          interface: input.interface,
          clickAction: input.clickAction,
          startDate: input.startDate,
          endDate: input.endDate,
        })
        .returning();

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId: input.adminId,
        action: "create",
        resource: "advertisement",
        resourceId: advertisement.id,
        details: JSON.stringify({
          title: input.title,
          type: input.type,
          position: input.position,
        }),
      });

      return advertisement;
    } catch (error) {
      console.error("Error creating advertisement:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create advertisement");
    }
  });

// Update advertisement
export const updateAdvertisementProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      adId: z.number(),
      title: z.string().min(1).optional(),
      content: z.string().optional(),
      image: z.string().optional(),
      link: z.string().optional(),
      type: z.enum(["banner", "popup", "inline", "image_only", "image_with_link"]).optional(),
      position: z.string().optional(),
      interface: z.enum(["pet_owner", "vet", "both"]).optional(),
      clickAction: z.enum(["none", "open_link", "open_file"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      isActive: z.boolean().optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const { adminId, adId, ...updateData } = input;

      // Validate dates if both are provided
      if (updateData.startDate && updateData.endDate && updateData.endDate <= updateData.startDate) {
        throw new Error("End date must be after start date");
      }

      // Update advertisement
      const [updatedAd] = await db
        .update(advertisements)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(advertisements.id, adId))
        .returning();

      if (!updatedAd) {
        throw new Error("Advertisement not found");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId: input.adminId,
        action: "update",
        resource: "advertisement",
        resourceId: adId,
        details: JSON.stringify(updateData),
      });

      return updatedAd;
    } catch (error) {
      console.error("Error updating advertisement:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to update advertisement");
    }
  });

// Delete advertisement
export const deleteAdvertisementProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      adId: z.number(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      // Soft delete by setting isActive to false
      const [deletedAd] = await db
        .update(advertisements)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(advertisements.id, input.adId))
        .returning();

      if (!deletedAd) {
        throw new Error("Advertisement not found");
      }

      // Log activity
      await db.insert(adminActivityLogs).values({
        adminId: input.adminId,
        action: "delete",
        resource: "advertisement",
        resourceId: input.adId,
        details: JSON.stringify({ title: deletedAd.title }),
      });

      return { success: true };
    } catch (error) {
      console.error("Error deleting advertisement:", error);
      throw new Error("Failed to delete advertisement");
    }
  });

// Get all advertisements (Admin)
export const getAllAdvertisementsProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      limit: z.number().default(20),
      offset: z.number().default(0),
      includeInactive: z.boolean().default(false),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      const ads = await db
        .select()
        .from(advertisements)
        .where(input.includeInactive ? undefined : eq(advertisements.isActive, true))
        .orderBy(desc(advertisements.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { success: true, ads };
    } catch (error) {
      console.error("Error getting advertisements:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get advertisements");
    }
  });

// Get active advertisements for display
export const getActiveProcedure = publicProcedure
  .input(
    z.object({
      position: z.string().optional(),
      type: z.enum(["banner", "popup", "inline", "image_only", "image_with_link"]).optional(),
      interface: z.enum(["pet_owner", "vet", "both"]).optional(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    console.log("📊 Getting active advertisements with input:", input);

    try {
      // For development/demo purposes, return empty array when no database is available
      // This prevents the "Query data cannot be undefined" error
      console.log("📊 Returning empty array for ads (development mode)");

      // Always return a valid array - never undefined or null
      // This is critical to prevent React Query "data cannot be undefined" errors
      return [];

      // TODO: Uncomment when database is properly set up
      /*
      const now = new Date();
      
      const conditions = [
        eq(advertisements.isActive, true),
        lte(advertisements.startDate, now),
        gte(advertisements.endDate, now)
      ];
      
      if (input.position) {
        conditions.push(eq(advertisements.position, input.position));
      }
      
      if (input.type) {
        conditions.push(eq(advertisements.type, input.type));
      }
      
      const ads = await db
        .select()
        .from(advertisements)
        .where(and(...conditions))
        .orderBy(advertisements.createdAt);

      // Always return an array, even if empty
      return Array.isArray(ads) ? ads : [];
      */
    } catch (error) {
      console.error("❌ Error getting active advertisements:", error);
      // Always return empty array instead of throwing error to prevent crashes
      // This is critical for React Query to work properly
      return [];
    }
  });

// Track advertisement click
export const trackClickProcedure = publicProcedure
  .input(
    z.object({
      adId: z.number(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // Increment click count
      await db
        .update(advertisements)
        .set({
          clicks: await db
            .select({ clicks: advertisements.clicks })
            .from(advertisements)
            .where(eq(advertisements.id, input.adId))
            .then((result: any[]) => (result[0]?.clicks || 0) + 1),
          updatedAt: new Date(),
        })
        .where(eq(advertisements.id, input.adId));

      return { success: true };
    } catch (error) {
      console.error("Error tracking ad click:", error);
      throw new Error("Failed to track ad click");
    }
  });

// Track advertisement impression
export const trackImpressionProcedure = publicProcedure
  .input(
    z.object({
      adId: z.number(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // Increment impression count
      await db
        .update(advertisements)
        .set({
          impressions: await db
            .select({ impressions: advertisements.impressions })
            .from(advertisements)
            .where(eq(advertisements.id, input.adId))
            .then((result: any[]) => (result[0]?.impressions || 0) + 1),
          updatedAt: new Date(),
        })
        .where(eq(advertisements.id, input.adId));

      return { success: true };
    } catch (error) {
      console.error("Error tracking ad impression:", error);
      throw new Error("Failed to track ad impression");
    }
  });

// Get advertisement by ID
export const getByIdProcedure = publicProcedure
  .input(
    z.object({
      id: z.number(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      const ad = await db.select().from(advertisements).where(eq(advertisements.id, input.id)).limit(1);

      if (ad.length === 0) {
        throw new Error("Advertisement not found");
      }

      return ad[0];
    } catch (error) {
      console.error("Error getting advertisement by ID:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get advertisement");
    }
  });

// Get advertisement statistics
export const getAdStatisticsProcedure = publicProcedure
  .input(
    z.object({
      adminId: z.number(),
      adId: z.number().optional(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      // TODO: Implement proper permission checking

      if (input.adId) {
        // Get specific ad statistics
        const ad = await db.select().from(advertisements).where(eq(advertisements.id, input.adId)).limit(1);

        if (ad.length === 0) {
          throw new Error("Advertisement not found");
        }

        return {
          ad: ad[0],
          clickThroughRate: ad[0].impressions > 0 ? (ad[0].clicks / ad[0].impressions) * 100 : 0,
        };
      } else {
        // Get overall statistics
        const totalAds = await db
          .select({ count: count() })
          .from(advertisements)
          .where(eq(advertisements.isActive, true));

        const totalClicks = await db
          .select({ sum: sum(advertisements.clicks) })
          .from(advertisements)
          .where(eq(advertisements.isActive, true));

        const totalImpressions = await db
          .select({ sum: sum(advertisements.impressions) })
          .from(advertisements)
          .where(eq(advertisements.isActive, true));

        return {
          totalAds: totalAds[0]?.count || 0,
          totalClicks: totalClicks[0]?.sum || 0,
          totalImpressions: totalImpressions[0]?.sum || 0,
          overallCTR:
            Number(totalImpressions[0]?.sum || 0) > 0
              ? (Number(totalClicks[0]?.sum || 0) / Number(totalImpressions[0]?.sum || 0)) * 100
              : 0,
        };
      }
    } catch (error) {
      console.error("Error getting ad statistics:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get advertisement statistics");
    }
  });
