import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, clinics, approvalRequests, users, reviews } from "../../../../db";
import { eq, and, like, or, inArray, sql } from "drizzle-orm";

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

      // Fetch approval requests for these clinics to get identity and license images
      const clinicIds = filteredClinics.map((clinic: any) => clinic.id);

      let approvalData: any[] = [];
      let userIds: number[] = [];

      if (clinicIds.length > 0) {
        approvalData = await db
          .select()
          .from(approvalRequests)
          .where(and(eq(approvalRequests.requestType, "clinic_activation"), eq(approvalRequests.status, "approved")));

        // Collect unique user IDs from approval requests
        userIds = [...new Set(approvalData.map((approval: any) => approval.requesterId))];
      }

      // Fetch user data (owner name and email)
      let userData: any[] = [];
      if (userIds.length > 0) {
        userData = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(inArray(users.id, userIds));
      }

      // Create maps for efficient lookup
      const approvalMap = new Map();
      approvalData.forEach((approval: any) => {
        if (clinicIds.includes(approval.resourceId)) {
          approvalMap.set(approval.resourceId, approval);
        }
      });

      const userMap = new Map();
      userData.forEach((user: any) => {
        userMap.set(user.id, user);
      });

      // Compute review statistics for clinics (average rating + review count)
      const clinicReviewStats: Record<number, { averageRating: number; reviewCount: number }> = {};
      if (clinicIds.length > 0) {
        const reviewStats = await db
          .select({
            clinicId: reviews.clinicId,
            averageRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`.as("averageRating"),
            reviewCount: sql<number>`COUNT(*)`.as("reviewCount"),
          })
          .from(reviews)
          .where(inArray(reviews.clinicId, clinicIds))
          .groupBy(reviews.clinicId);

        reviewStats.forEach((stat: any) => {
          clinicReviewStats[stat.clinicId] = {
            averageRating: Number(stat.averageRating) || 0,
            reviewCount: Number(stat.reviewCount) || 0,
          };
        });
      }

      return {
        success: true,
        clinics: filteredClinics.map((clinic: any) => {
          const approval = approvalMap.get(clinic.id);
          const owner = approval ? userMap.get(approval.requesterId) : null;

          return {
            ...clinic,
            workingHours: clinic.workingHours,
            services: clinic.services,
            images: typeof clinic.images === "string" ? JSON.parse(clinic.images) : clinic.images ?? [],
            identityImages: approval?.identityImages || null,
            licenseImages: approval?.licenseImages || null,
            ownerName: owner?.name || "غير متوفر",
            ownerEmail: owner?.email || "غير متوفر",
            rating: clinicReviewStats[clinic.id]?.averageRating ?? clinic.rating ?? 0,
            reviewCount: clinicReviewStats[clinic.id]?.reviewCount ?? 0,
            createdAt:
              typeof clinic.createdAt === "number" ? new Date(clinic.createdAt * 1000).toISOString() : clinic.createdAt,
            updatedAt:
              typeof clinic.updatedAt === "number" ? new Date(clinic.updatedAt * 1000).toISOString() : clinic.updatedAt,
          };
        }),
        total: filteredClinics.length,
      };
    } catch (error) {
      console.error("Error getting active clinics:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب قائمة العيادات");
    }
  });
