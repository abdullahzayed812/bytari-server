import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { getDateOffset, logStep } from "./helpers";
import { clinics } from "../schema";

export async function seedClinics(db: NodePgDatabase<any>) {
  console.log("🏥 Seeding clinics...");

  const clinicsData = [
    {
      name: "عيادة الرحمة البيطرية",
      address: "بغداد - الكرادة - شارع الطيران",
      phone: "+964 770 123 4567",
      email: "info@rahma-vet.com",
      latitude: 33.3152,
      longitude: 44.3661,
      services: ["فحص عام", "تطعيمات", "جراحة", "أشعة", "علاج الأسنان"],
      images: ["https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400"],
      rating: 4.8,
      isActive: true,
      activationStartDate: getDateOffset(-30),
      activationEndDate: getDateOffset(60),
      needsRenewal: false,
    },
    {
      name: "عيادة النجف البيطرية",
      address: "النجف الأشرف - حي الجديدة - شارع الكوفة",
      phone: "+964 770 234 5678",
      email: "contact@najaf-vet.com",
      latitude: 32.0281,
      longitude: 44.3225,
      services: ["فحص عام", "تطعيمات", "علاج الماشية", "استشارات تغذية"],
      images: ["https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400"],
      rating: 4.5,
      isActive: true,
      activationStartDate: getDateOffset(-30),
      activationEndDate: getDateOffset(7),
      needsRenewal: false,
    },
    {
      name: "مستشفى البصرة البيطري",
      address: "البصرة - العشار - شارع الكورنيش",
      phone: "+964 770 345 6789",
      email: "info@basra-vet-hospital.com",
      latitude: 30.5085,
      longitude: 47.7804,
      services: ["طوارئ 24 ساعة", "جراحة متقدمة", "أشعة مقطعية", "تحاليل مخبرية"],
      images: ["https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400"],
      rating: 4.9,
      isActive: false,
      activationStartDate: getDateOffset(-30),
      activationEndDate: getDateOffset(-1),
      needsRenewal: true,
    },
    {
      name: "عيادة أربيل البيطرية",
      address: "أربيل - عنكاوا - شارع الجامعة",
      phone: "+964 770 456 7890",
      email: "info@erbil-vet.com",
      latitude: 36.1911,
      longitude: 44.0093,
      services: ["فحص عام", "تطعيمات", "جراحة", "طب الأسنان البيطري"],
      images: ["https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400"],
      rating: 4.6,
      isActive: true,
      activationStartDate: getDateOffset(-30),
      activationEndDate: getDateOffset(60),
      needsRenewal: false,
    },
    {
      name: "عيادة الموصل البيطرية",
      address: "الموصل - الجانب الأيمن - حي الزهراء",
      phone: "+964 770 567 8901",
      email: "contact@mosul-vet.com",
      latitude: 36.3489,
      longitude: 43.1189,
      services: ["فحص عام", "تطعيمات", "علاج الطيور", "استشارات"],
      images: ["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"],
      rating: 4.3,
      isActive: false,
      activationStartDate: getDateOffset(-30),
      activationEndDate: getDateOffset(-1),
      needsRenewal: true,
    },
  ];

  const workingHours = {
    saturday: "8:00 AM - 8:00 PM",
    sunday: "8:00 AM - 8:00 PM",
    monday: "8:00 AM - 8:00 PM",
    tuesday: "8:00 AM - 8:00 PM",
    wednesday: "8:00 AM - 8:00 PM",
    thursday: "8:00 AM - 8:00 PM",
    friday: "Closed",
  };

  const createdClinics = await db
    .insert(clinics)
    .values(
      clinicsData.map((clinic) => ({
        ...clinic,
        workingHours: JSON.stringify(workingHours),
        services: JSON.stringify(clinic.services),
        images: JSON.stringify(clinic.images),
      }))
    )
    .returning();

  logStep(`Created ${createdClinics.length} clinics\n`);
  return createdClinics;
}
