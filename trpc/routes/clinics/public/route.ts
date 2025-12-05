import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, clinics } from "../../../../db";
import { eq, and, like, or } from "drizzle-orm";

export const getActiveClinicsListProcedure = publicProcedure
  .input(
    z.object({
      search: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    })
  )
  .query(async ({ input }) => {
    try {
      console.log("Getting active clinics list with filters:", input);

      let whereConditions = [eq(clinics.isActive, true)];

      // Add search filter
      if (input.search && input.search.trim()) {
        const searchTerm = `%${input.search.trim()}%`;
        const searchCondition = or(like(clinics.name, searchTerm), like(clinics.address, searchTerm));
        if (searchCondition) {
          whereConditions.push(searchCondition);
        }
      }

      // Get active clinics
      const activeClinics = await db
        .select()
        .from(clinics)
        .where(and(...whereConditions))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(clinics.createdAt);

      // Filter out clinics that need renewal
      const now = new Date();
      const filteredClinics = activeClinics.filter((clinic: any) => {
        const endDate = clinic.activationEndDate ? new Date(clinic.activationEndDate) : null;
        if (!endDate) return true; // Include clinics without end date

        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const needsRenewal = daysRemaining < 1;

        return !needsRenewal; // Exclude clinics that need renewal
      });

      return {
        success: true,
        clinics: filteredClinics.map((clinic: any) => ({
          ...clinic,
          workingHours: clinic.workingHours,
          services: clinic.services,
          images: typeof clinic.images === "string" ? JSON.parse(clinic.images) : clinic.images ?? [],
          createdAt:
            typeof clinic.createdAt === "number" ? new Date(clinic.createdAt * 1000).toISOString() : clinic.createdAt,
          updatedAt:
            typeof clinic.updatedAt === "number" ? new Date(clinic.updatedAt * 1000).toISOString() : clinic.updatedAt,
        })),
        total: filteredClinics.length,
      };
    } catch (error) {
      console.error("Error getting active clinics:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب قائمة العيادات");
    }
  });
