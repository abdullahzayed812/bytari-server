import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, clinics, approvalRequests } from "../../../../db";
import { eq, and, inArray } from "drizzle-orm";

export const getUserClinicsProcedure = publicProcedure.query(async () => {
  try {
    // Mock user ID for development - in production, get from authentication
    const userId = 1;
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

    // Get clinic details for approved requests
    const clinicIds = requests.filter((req) => req.status === "approved").map((req) => req.resourceId);

    let userClinics: any[] = [];
    if (clinicIds.length > 0) {
      userClinics = await db
        .select()
        .from(clinics)
        .where(and(eq(clinics.isActive, true), inArray(clinics.id, clinicIds)));
    }

    return {
      success: true,
      clinics: userClinics.map((clinic: any) => ({
        ...clinic,
        workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null,
        services: clinic.services ? JSON.parse(clinic.services) : [],
        images: clinic.images ? JSON.parse(clinic.images) : [],
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

export const getClinicDetailsProcedure = publicProcedure
  .input(
    z.object({
      clinicId: z.number(),
    })
  )
  .query(async ({ input }) => {
    try {
      // Mock user ID for development - in production, get from authentication
      const userId = 1;
      console.log("Getting clinic details for clinic:", input.clinicId);

      // Get clinic details
      const [clinic] = await db.select().from(clinics).where(eq(clinics.id, input.clinicId)).limit(1);

      if (!clinic) {
        throw new Error("العيادة غير موجودة");
      }

      // Check if user owns this clinic
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

      return {
        success: true,
        clinic: {
          ...clinic,
          workingHours: clinic.workingHours ? JSON.parse(clinic.workingHours) : null,
          services: clinic.services ? JSON.parse(clinic.services) : [],
          images: clinic.images ? JSON.parse(clinic.images) : [],
        },
        isOwner,
      };
    } catch (error) {
      console.error("Error getting clinic details:", error);
      throw new Error(error instanceof Error ? error.message : "حدث خطأ أثناء جلب تفاصيل العيادة");
    }
  });

// Get user's approved clinics
export const getUserApprovedClinicsProcedure = publicProcedure.query(async () => {
  try {
    // Mock user ID for development - in production, get from authentication
    const userId = 1;
    console.log("Getting user approved clinics for user:", userId);

    // Mock approved clinics data
    const mockApprovedClinics = [
      {
        id: 1,
        name: "عيادة الرحمة البيطرية",
        address: "شارع الجامعة، بغداد",
        phone: "+964 770 123 4567",
        image: "https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=400",
        activationEndDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000), // 300 days from now
        isActive: true,
        isPremium: false,
        rating: 4.8,
        reviewsCount: 156,
        specialties: ["جراحة", "طب داخلي", "تطعيمات"],
        services: ["فحص شامل", "عمليات جراحية", "تطعيمات", "علاج طوارئ"],
        workingHours: "السبت - الخميس: 8:00 ص - 8:00 م",
        createdAt: new Date("2024-01-15"),
      },
      {
        id: 2,
        name: "مركز الشفاء البيطري",
        address: "حي الكرادة، بغداد",
        phone: "+964 771 234 5678",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400",
        activationEndDate: new Date(Date.now() + 250 * 24 * 60 * 60 * 1000), // 250 days from now
        isActive: true,
        isPremium: true,
        rating: 4.9,
        reviewsCount: 203,
        specialties: ["طب الطوارئ", "جراحة العظام", "أمراض جلدية"],
        services: ["طوارئ 24/7", "جراحة متقدمة", "تشخيص بالأشعة", "مختبر طبي"],
        workingHours: "24/7",
        createdAt: new Date("2024-02-01"),
      },
    ];

    return {
      success: true,
      clinics: mockApprovedClinics,
    };
  } catch (error) {
    console.error("Error getting user approved clinics:", error);
    throw new Error("Failed to get user approved clinics");
  }
});
