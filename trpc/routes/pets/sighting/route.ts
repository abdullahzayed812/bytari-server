import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, petSightingReports, lostPets, users, notifications } from "../../../../db";
import { eq, and } from "drizzle-orm";

// Report a lost pet sighting
export const reportPetSighting = publicProcedure
  .input(
    z.object({
      lostPetId: z.number(),
      reporterId: z.number().optional(), // Optional if reporter is not logged in
      sightingDate: z.date(),
      sightingLocation: z.string().min(1),
      description: z.string().optional(),
      contactInfo: z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      }),
      images: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      const [report] = await db
        .insert(petSightingReports)
        .values({
          lostPetId: input.lostPetId,
          reporterId: input.reporterId || null,
          sightingDate: input.sightingDate,
          sightingLocation: input.sightingLocation,
          description: input.description,
          contactInfo: input.contactInfo,
          images: input.images,
        })
        .returning();

      // Send notification to pet owner
      const [lostPet] = await db
        .select({ ownerId: lostPets.ownerId, name: lostPets.name })
        .from(lostPets)
        .where(eq(lostPets.id, input.lostPetId));

      if (lostPet && lostPet.ownerId) {
        await db.insert(notifications).values({
          userId: lostPet.ownerId,
          title: `بلاغ جديد عن حيوانك المفقود`,
          message: `تم الإبلاغ عن مشاهدة حيوانك المفقود "${lostPet.name}".`,
          type: "lost_pet_sighting",
          data: JSON.stringify({
            lostPetId: input.lostPetId,
            reportId: report.id,
          }),
        });
      }

      return report;
    } catch (error) {
      console.error("Error reporting pet sighting:", error);
      throw new Error("Failed to report pet sighting");
    }
  });

// Get all sighting reports for a lost pet (owner view)
export const getPetSightingReports = publicProcedure
  .input(
    z.object({
      lostPetId: z.number(),
    })
  )
  .query(async ({ input }: { input: { lostPetId: number } }) => {
    try {
      // TODO: Add permission check to ensure only owner can view these reports
      const reports = await db
        .select({
          id: petSightingReports.id,
          lostPetId: petSightingReports.lostPetId,
          reporterId: petSightingReports.reporterId,
          sightingDate: petSightingReports.sightingDate,
          sightingLocation: petSightingReports.sightingLocation,
          description: petSightingReports.description,
          contactInfo: petSightingReports.contactInfo,
          images: petSightingReports.images,
          isDismissed: petSightingReports.isDismissed,
          dismissedAt: petSightingReports.dismissedAt,
          createdAt: petSightingReports.createdAt,
          reporterName: users.name, // Join with users to get reporter's name
        })
        .from(petSightingReports)
        .leftJoin(users, eq(petSightingReports.reporterId, users.id))
        .where(eq(petSightingReports.lostPetId, input.lostPetId));

      return { reports };
    } catch (error) {
      console.error("Error getting pet sighting reports:", error);
      throw new Error("Failed to get pet sighting reports");
    }
  });

// Dismiss a pet sighting report (owner action)
export const dismissPetSightingReport = publicProcedure
  .input(
    z.object({
      reportId: z.number(),
      ownerId: z.number(), // Used for permission check
    })
  )
  .mutation(async ({ input }: { input: { reportId: number; ownerId: number } }) => {
    try {
      // Verify that the owner has permission to dismiss this report
      const [report] = await db
        .select({ lostPetId: petSightingReports.lostPetId })
        .from(petSightingReports)
        .where(eq(petSightingReports.id, input.reportId));

      if (!report) {
        throw new Error("Sighting report not found");
      }

      const [lostPet] = await db
        .select({ ownerId: lostPets.ownerId })
        .from(lostPets)
        .where(eq(lostPets.id, report.lostPetId));

      if (!lostPet || lostPet.ownerId !== input.ownerId) {
        throw new Error("Unauthorized to dismiss this report");
      }

      await db
        .update(petSightingReports)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
        })
        .where(eq(petSightingReports.id, input.reportId));

      // Update the lost pet's status to 'found'
      await db
        .update(lostPets)
        .set({
          status: "found",
          foundAt: new Date(),
          foundBy: input.ownerId,
        })
        .where(eq(lostPets.id, report.lostPetId));

      return { success: true };
    } catch (error) {
      console.error("Error dismissing pet sighting report:", error);
      throw new Error("Failed to dismiss pet sighting report");
    }
  });

// Close a pet sighting report (owner action)
export const closePetSightingReport = publicProcedure
  .input(
    z.object({
      reportId: z.number(),
      ownerId: z.number(), // Used for permission check
    })
  )
  .mutation(async ({ input }: { input: { reportId: number; ownerId: number } }) => {
    try {
      // Verify that the owner has permission to close this report
      const [report] = await db
        .select({ lostPetId: petSightingReports.lostPetId })
        .from(petSightingReports)
        .where(eq(petSightingReports.id, input.reportId));

      if (!report) {
        throw new Error("Sighting report not found");
      }

      const [lostPet] = await db
        .select({ ownerId: lostPets.ownerId })
        .from(lostPets)
        .where(eq(lostPets.id, report.lostPetId));

      if (!lostPet || lostPet.ownerId !== input.ownerId) {
        throw new Error("Unauthorized to close this report");
      }

      await db
        .update(petSightingReports)
        .set({
          isDismissed: true,
          dismissedAt: new Date(),
        })
        .where(eq(petSightingReports.id, input.reportId));

      // Update the lost pet's status to 'closed'
      await db
        .update(lostPets)
        .set({
          status: "closed",
          foundAt: new Date(),
          foundBy: input.ownerId,
        })
        .where(eq(lostPets.id, report.lostPetId));

      return { success: true };
    } catch (error) {
      console.error("Error closing pet sighting report:", error);
      throw new Error("Failed to close pet sighting report");
    }
  });
