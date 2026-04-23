import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure } from "../../../create-context";
import {
  db,
  clinics,
  approvalRequests,
  users,
  veterinarians,
  vetPermissions,
  clinicStaff,
  medicalRecords,
  vaccinations,
  petReminders,
  approvedClinicAccess,
  reviews,
} from "../../../../db";
import { eq, and, inArray, count, countDistinct, sql } from "drizzle-orm";

// ============== GET USER CLINICS (UPDATED) ==============
export const getUserClinicsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const userId = input.userId;
      console.log("Getting user clinics for user:", userId);

      // Get all approval requests for clinics by this user
      const requests = await db
        .select({
          id: approvalRequests.id,
          requestType: approvalRequests.requestType,
          resourceId: approvalRequests.resourceId,
          title: approvalRequests.title,
          status: approvalRequests.status,
          createdAt: approvalRequests.createdAt,
          reviewedAt: approvalRequests.reviewedAt,
          rejectionReason: approvalRequests.rejectionReason,
        })
        .from(approvalRequests)
        .where(and(eq(approvalRequests.requesterId, userId), eq(approvalRequests.requestType, "clinic_activation")));

      // Get clinic IDs for approved requests (owned clinics)
      const ownedClinicIds = requests.filter((req) => req.status === "approved").map((req) => req.resourceId);

      // Get veterinarian record for this user
      const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, userId)).limit(1);

      // Get assigned clinic IDs
      let assignedClinicIds: number[] = [];
      if (vet) {
        const assignments = await db
          .select({ clinicId: clinicStaff.clinicId })
          .from(clinicStaff)
          .where(and(eq(clinicStaff.veterinarianId, vet.id), eq(clinicStaff.isActive, true)));
        assignedClinicIds = assignments.map((a) => a.clinicId);
      }

      // Combine all clinic IDs
      const allClinicIds = [...new Set([...ownedClinicIds, ...assignedClinicIds])];

      let userClinics: any[] = [];
      if (allClinicIds.length > 0) {
        userClinics = await db
          .select()
          .from(clinics)
          .where(and(eq(clinics.isActive, true), inArray(clinics.id, allClinicIds)));
      }

      return {
        success: true,
        clinics: userClinics.map((clinic: any) => ({
          ...clinic,
          workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null,
          services: clinic.services ? JSON.parse(clinic.services) : [],
          images: clinic.images ? JSON.parse(clinic.images) : [],
          isOwned: ownedClinicIds.includes(clinic.id),
          isAssigned: assignedClinicIds.includes(clinic.id),
        })),
        requests: requests.map((req: any) => ({
          ...req,
          createdAt: new Date(Number(req.createdAt) * 1000).toISOString(),
          reviewedAt: req.reviewedAt ? new Date(Number(req.reviewedAt) * 1000).toISOString() : null,
        })),
      };
    } catch (error) {
      console.error("Error getting user clinics:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب بيانات العيادات");
    }
  });

// ============== GET CLINIC DETAILS (UPDATED) ==============
export const getClinicDetailsProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const userId = input.userId;

      // Get clinic details
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Check ownership
      const [request] = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.resourceId, input.clinicId),
            eq(approvalRequests.requesterId, userId),
            eq(approvalRequests.requestType, "clinic_activation")
          )
        )
        .limit(1);

      const isOwner = !!request;

      // Check if user is assigned as staff
      let isStaff = false;
      const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, userId)).limit(1);

      if (vet) {
        const [staffRecord] = await db
          .select()
          .from(clinicStaff)
          .where(
            and(
              eq(clinicStaff.clinicId, input.clinicId),
              eq(clinicStaff.veterinarianId, vet.id),
              eq(clinicStaff.isActive, true)
            )
          )
          .limit(1);
        isStaff = !!staffRecord;
      }

      return {
        success: true,
        isOwner,
        isStaff,
        clinic,
      };
    } catch (error) {
      console.error("Error getting clinic details:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب تفاصيل العيادة");
    }
  });

// ============== GET USER APPROVED CLINICS (UPDATED) ==============
export const getUserApprovedClinicsProcedure = publicProcedure
  .input(
    z.object({
      userId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const userId = input.userId;
      console.log("Getting user approved clinics for user:", userId);

      // Get approved clinic activation requests for this user
      const approvedRequests = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.requesterId, userId),
            eq(approvalRequests.requestType, "clinic_activation"),
            eq(approvalRequests.status, "approved")
          )
        );

      const ownedClinicIds = approvedRequests.map((req) => req.resourceId);

      // Get veterinarian record
      const [vet] = await db.select().from(veterinarians).where(eq(veterinarians.userId, userId)).limit(1);

      // Get assigned clinics
      let assignedClinicIds: number[] = [];
      if (vet) {
        const assignments = await db
          .select({ clinicId: clinicStaff.clinicId })
          .from(clinicStaff)
          .where(and(eq(clinicStaff.veterinarianId, vet.id), eq(clinicStaff.isActive, true)));
        assignedClinicIds = assignments.map((a) => a.clinicId);
      }

      // Combine all clinic IDs
      const allClinicIds = [...new Set([...ownedClinicIds, ...assignedClinicIds])];

      if (allClinicIds.length === 0) {
        return {
          success: true,
          clinics: [],
        };
      }

      // Fetch clinic details
      const clinicRows = await db
        .select()
        .from(clinics)
        .where(and(eq(clinics.isActive, true), inArray(clinics.id, allClinicIds)));

      // Compute stats per clinic dynamically
      const medicalPetsRows = await db
        .select({ clinicId: medicalRecords.clinicId, count: countDistinct(medicalRecords.petId) })
        .from(medicalRecords)
        .where(inArray(medicalRecords.clinicId, allClinicIds))
        .groupBy(medicalRecords.clinicId);

      const vaccinationPetsRows = await db
        .select({ clinicId: vaccinations.clinicId, count: countDistinct(vaccinations.petId) })
        .from(vaccinations)
        .where(inArray(vaccinations.clinicId, allClinicIds))
        .groupBy(vaccinations.clinicId);

      const reminderPetsRows = await db
        .select({ clinicId: petReminders.clinicId, count: countDistinct(petReminders.petId) })
        .from(petReminders)
        .where(inArray(petReminders.clinicId, allClinicIds))
        .groupBy(petReminders.clinicId);

      const activePatientsRows = await db
        .select({ clinicId: approvedClinicAccess.clinicId, count: count() })
        .from(approvedClinicAccess)
        .where(and(inArray(approvedClinicAccess.clinicId, allClinicIds), eq(approvedClinicAccess.isActive, true)))
        .groupBy(approvedClinicAccess.clinicId);

      const completedTreatmentsRows = await db
        .select({ clinicId: vaccinations.clinicId, count: count() })
        .from(vaccinations)
        .where(inArray(vaccinations.clinicId, allClinicIds))
        .groupBy(vaccinations.clinicId);

      const toMap = <T extends { clinicId: number | null; count: number }>(rows: T[]) =>
        Object.fromEntries(rows.filter((r) => r.clinicId !== null).map((r) => [r.clinicId!, r.count]));

      const medicalMap = toMap(medicalPetsRows);
      const vaccinationMap = toMap(vaccinationPetsRows);
      const reminderMap = toMap(reminderPetsRows);
      const activePatientsMap = toMap(activePatientsRows);
      const completedTreatmentsMap = toMap(completedTreatmentsRows);

      return {
        success: true,
        clinics: clinicRows.map((clinic: any) => {
          const isOwned = ownedClinicIds.includes(clinic.id);
          const isAssigned = assignedClinicIds.includes(clinic.id);

          const now = new Date();
          const endDate = clinic.activationEndDate ? new Date(clinic.activationEndDate) : null;
          const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const needsRenewal = daysRemaining && daysRemaining < 1;

          const totalAnimals =
            (medicalMap[clinic.id] ?? 0) +
            (vaccinationMap[clinic.id] ?? 0) +
            (reminderMap[clinic.id] ?? 0);

          return {
            ...clinic,
            totalAnimals,
            activePatients: activePatientsMap[clinic.id] ?? 0,
            completedTreatments: completedTreatmentsMap[clinic.id] ?? 0,
            ...(isOwned && { needsRenewal, daysRemaining }),
            isOwned,
            isAssigned,
          };
        }),
      };
    } catch (error) {
      console.error("Error getting user approved clinics:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب العيادات الموافق عليها");
    }
  });

// ============== ADMIN: GET ALL CLINICS ==============
export const getAllClinicsForAdmin = adminProcedure
  .input(
    z.object({
      adminId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { adminId } = input;

      console.log("Fetching ALL clinics for admin:", adminId);

      // 1️⃣ Validate this user is admin
      const adminUser = await db
        .select({
          id: users.id,
          userType: users.userType,
        })
        .from(users)
        .where(eq(users.id, adminId))
        .limit(1);

      if (!adminUser.length || adminUser[0].userType !== "admin") {
        throw new Error("ليس لديك صلاحية للوصول إلى بيانات العيادات");
      }

      // 2️⃣ Fetch ALL clinics
      const allClinics = await db.select().from(clinics);

      return {
        success: true,
        clinics: allClinics,
      };
    } catch (error) {
      console.error("Error fetching clinics (admin):", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب جميع العيادات");
    }
  });

// ============== ADMIN: GET ALL CLINICS WITH ENRICHED DATA ==============
export const getAdminClinicsListProcedure = adminProcedure
  .input(z.object({}))
  .query(async () => {
    try {
      // Fetch ALL clinics regardless of isActive
      const allClinics = await db.select().from(clinics).orderBy(clinics.createdAt);

      const clinicIds = allClinics.map((c: any) => c.id);
      if (clinicIds.length === 0) return { success: true, clinics: [] };

      // Fetch approval requests to get owner info and document images
      const approvalData = await db
        .select()
        .from(approvalRequests)
        .where(and(eq(approvalRequests.requestType, "clinic_activation"), inArray(approvalRequests.resourceId, clinicIds)));

      const userIds = [...new Set(approvalData.map((a: any) => a.requesterId))];
      const userData =
        userIds.length > 0
          ? await db
              .select({ id: users.id, name: users.name, email: users.email })
              .from(users)
              .where(inArray(users.id, userIds))
          : [];

      const approvalMap = new Map<number, any>();
      approvalData.forEach((a: any) => {
        if (!approvalMap.has(a.resourceId)) approvalMap.set(a.resourceId, a);
      });

      const userMap = new Map<number, any>();
      userData.forEach((u: any) => userMap.set(u.id, u));

      // Compute review statistics
      const reviewStats = await db
        .select({
          clinicId: reviews.clinicId,
          averageRating: sql<number>`ROUND(AVG(${reviews.rating})::numeric, 1)`.as("averageRating"),
          reviewCount: sql<number>`COUNT(*)`.as("reviewCount"),
        })
        .from(reviews)
        .where(inArray(reviews.clinicId, clinicIds))
        .groupBy(reviews.clinicId);

      const reviewMap: Record<number, { averageRating: number; reviewCount: number }> = {};
      reviewStats.forEach((s: any) => {
        reviewMap[s.clinicId] = { averageRating: Number(s.averageRating) || 0, reviewCount: Number(s.reviewCount) || 0 };
      });

      return {
        success: true,
        clinics: allClinics.map((clinic: any) => {
          const approval = approvalMap.get(clinic.id);
          const owner = approval ? userMap.get(approval.requesterId) : null;

          // Derive status: pending approval → "pending", active → "active", inactive → "banned"
          let status: string;
          if (!approval || approval.status === "pending") {
            status = "pending";
          } else if (clinic.isActive) {
            status = "active";
          } else {
            status = "banned";
          }

          return {
            ...clinic,
            status,
            ownerName: owner?.name || "غير متوفر",
            ownerEmail: owner?.email || "غير متوفر",
            identityImages: approval?.identityImages || null,
            licenseImages: approval?.licenseImages || null,
            rating: reviewMap[clinic.id]?.averageRating ?? clinic.rating ?? 0,
            reviewsCount: reviewMap[clinic.id]?.reviewCount ?? 0,
            reportCount: 0,
            isPremium: false,
            createdAt: typeof clinic.createdAt === "number" ? new Date(clinic.createdAt * 1000).toISOString() : clinic.createdAt,
          };
        }),
      };
    } catch (error) {
      console.error("Error fetching admin clinics list:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب قائمة العيادات");
    }
  });

// ============== GET CLINIC BY ID (ADMIN ONLY) ==============
export const getClinicByIdProcedure = protectedProcedure
  .input(
    z.object({
      clinicId: z.number().int().positive("معرف العيادة غير صحيح"),
    })
  )
  .query(async ({ input, ctx }) => {
    try {
      const userId = ctx.user.id;
      const { clinicId } = input;

      // 1️⃣ Check if user is admin
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!user || user.userType !== "admin") {
        throw new Error("غير مصرح لك بالوصول إلى بيانات العيادة");
      }

      // 2️⃣ Fetch clinic
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // 3️⃣ Parse JSON fields safely
      const parseSafe = (value: any) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      };

      return {
        success: true,
        clinic,
      };
    } catch (error) {
      console.error("❌ Error fetching clinic:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب بيانات العيادة");
    }
  });
