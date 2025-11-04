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
        const searchCondition = or(
          like(clinics.name, searchTerm),
          like(clinics.address, searchTerm)
        );
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

      // if (activeClinics.length === 0) {
      //   console.log("No clinics found in database, returning mock data");
      //   const mockClinics = [
      //     {
      //       id: 1,
      //       name: "عيادة الرحمة البيطرية",
      //       address: "بغداد - الكرادة - شارع الطيران",
      //       phone: "+964 770 123 4567",
      //       email: "info@rahma-vet.com",
      //       latitude: 33.3152,
      //       longitude: 44.3661,
      //       workingHours: {
      //         saturday: "8:00 AM - 10:00 PM",
      //         sunday: "8:00 AM - 10:00 PM",
      //         monday: "8:00 AM - 10:00 PM",
      //         tuesday: "8:00 AM - 10:00 PM",
      //         wednesday: "8:00 AM - 10:00 PM",
      //         thursday: "8:00 AM - 10:00 PM",
      //         friday: "Closed",
      //       },
      //       services: ["فحص عام", "تطعيمات", "جراحة", "أشعة"],
      //       images: ["https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400"],
      //       rating: 4.8,
      //       isActive: true,
      //       createdAt: new Date().toISOString(),
      //       updatedAt: new Date().toISOString(),
      //     },
      //     {
      //       id: 2,
      //       name: "عيادة النجف البيطرية",
      //       address: "النجف الأشرف - حي الجديدة - شارع الكوفة",
      //       phone: "+964 770 234 5678",
      //       email: "contact@najaf-vet.com",
      //       latitude: 32.0281,
      //       longitude: 44.3225,
      //       workingHours: {
      //         saturday: "9:00 AM - 9:00 PM",
      //         sunday: "9:00 AM - 9:00 PM",
      //         monday: "9:00 AM - 9:00 PM",
      //         tuesday: "9:00 AM - 9:00 PM",
      //         wednesday: "9:00 AM - 9:00 PM",
      //         thursday: "9:00 AM - 9:00 PM",
      //         friday: "2:00 PM - 8:00 PM",
      //       },
      //       services: ["فحص عام", "تطعيمات", "علاج الماشية"],
      //       images: ["https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400"],
      //       rating: 4.5,
      //       isActive: true,
      //       createdAt: new Date().toISOString(),
      //       updatedAt: new Date().toISOString(),
      //     },
      //     {
      //       id: 3,
      //       name: "مستشفى البصرة البيطري",
      //       address: "البصرة - العشار - شارع الكورنيش",
      //       phone: "+964 770 345 6789",
      //       email: "info@basra-vet-hospital.com",
      //       latitude: 30.5085,
      //       longitude: 47.7804,
      //       workingHours: {
      //         saturday: "24 Hours",
      //         sunday: "24 Hours",
      //         monday: "24 Hours",
      //         tuesday: "24 Hours",
      //         wednesday: "24 Hours",
      //         thursday: "24 Hours",
      //         friday: "24 Hours",
      //       },
      //       services: ["طوارئ 24 ساعة", "جراحة متقدمة", "أشعة مقطعية"],
      //       images: ["https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400"],
      //       rating: 4.9,
      //       isActive: true,
      //       createdAt: new Date().toISOString(),
      //       updatedAt: new Date().toISOString(),
      //     },
      //     {
      //       id: 4,
      //       name: "عيادة أربيل البيطرية",
      //       address: "أربيل - عنكاوا - شارع الجامعة",
      //       phone: "+964 770 456 7890",
      //       email: "info@erbil-vet.com",
      //       latitude: 36.1911,
      //       longitude: 44.0093,
      //       workingHours: {
      //         saturday: "8:00 AM - 8:00 PM",
      //         sunday: "8:00 AM - 8:00 PM",
      //         monday: "8:00 AM - 8:00 PM",
      //         tuesday: "8:00 AM - 8:00 PM",
      //         wednesday: "8:00 AM - 8:00 PM",
      //         thursday: "8:00 AM - 8:00 PM",
      //         friday: "Closed",
      //       },
      //       services: ["فحص عام", "تطعيمات", "جراحة", "طب الأسنان البيطري"],
      //       images: ["https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400"],
      //       rating: 4.6,
      //       isActive: true,
      //       createdAt: new Date().toISOString(),
      //       updatedAt: new Date().toISOString(),
      //     },
      //     {
      //       id: 5,
      //       name: "عيادة الموصل البيطرية",
      //       address: "الموصل - الجانب الأيمن - حي الزهراء",
      //       phone: "+964 770 567 8901",
      //       email: "contact@mosul-vet.com",
      //       latitude: 36.3489,
      //       longitude: 43.1189,
      //       workingHours: {
      //         saturday: "9:00 AM - 7:00 PM",
      //         sunday: "9:00 AM - 7:00 PM",
      //         monday: "9:00 AM - 7:00 PM",
      //         tuesday: "9:00 AM - 7:00 PM",
      //         wednesday: "9:00 AM - 7:00 PM",
      //         thursday: "9:00 AM - 7:00 PM",
      //         friday: "Closed",
      //       },
      //       services: ["فحص عام", "تطعيمات", "علاج الطيور"],
      //       images: ["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"],
      //       rating: 4.3,
      //       isActive: true,
      //       createdAt: new Date().toISOString(),
      //       updatedAt: new Date().toISOString(),
      //     },
      //   ];

      //   console.log("Returning mock clinics:", mockClinics.length, "clinics");
      //   return {
      //     success: true,
      //     clinics: mockClinics,
      //     total: mockClinics.length,
      //   };
      // }

      return {
        success: true,
        clinics: activeClinics.map((clinic: any) => ({
          ...clinic,
          workingHours:
            typeof clinic.workingHours === "string"
              ? JSON.parse(clinic.workingHours)
              : clinic.workingHours ?? null,
          services:
            typeof clinic.services === "string"
              ? JSON.parse(clinic.services)
              : clinic.services ?? [],
          images:
            typeof clinic.images === "string"
              ? JSON.parse(clinic.images)
              : clinic.images ?? [],
          createdAt:
            typeof clinic.createdAt === "number"
              ? new Date(clinic.createdAt * 1000).toISOString()
              : clinic.createdAt,
          updatedAt:
            typeof clinic.updatedAt === "number"
              ? new Date(clinic.updatedAt * 1000).toISOString()
              : clinic.updatedAt,
        })),
        total: activeClinics.length,
      };
    } catch (error) {
      console.error("Error getting active clinics:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء جلب قائمة العيادات"
      );
    }
  });
