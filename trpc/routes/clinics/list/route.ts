import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure } from "../../../create-context";
import { db, clinics, approvalRequests, users, veterinarians, vetPermissions, clinicStaff } from "../../../../db";
import { eq, and, inArray } from "drizzle-orm";

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
      const userClinics = await db
        .select()
        .from(clinics)
        .where(and(eq(clinics.isActive, true), inArray(clinics.id, allClinicIds)));

      return {
        success: true,
        clinics: userClinics.map((clinic: any) => {
          const isOwned = ownedClinicIds.includes(clinic.id);
          const isAssigned = assignedClinicIds.includes(clinic.id);

          // Calculate subscription status
          const now = new Date();
          const endDate = clinic.activationEndDate ? new Date(clinic.activationEndDate) : null;
          const daysRemaining = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const needsRenewal = daysRemaining && daysRemaining < 1;

          return {
            ...clinic,
            ...clinic,
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
