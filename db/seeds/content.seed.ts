import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { advertisements } from "../schema";
import { getDateOffset, logStep } from "./helpers";

export async function seedContent(db: NodePgDatabase<any>) {
  console.log("📰 Seeding content...");

  // ==================== ADVERTISEMENTS ====================
  const startDate = new Date();
  const endDate = getDateOffset(365);

  const advertisementsData = [
    {
      title: "متجر مستلزمات الحيوانات الأليفة - العراق",
      description: "أفضل المنتجات والأدوية البيطرية بأسعار منافسة",
      imageUrl: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&h=400&fit=crop",
      targetUrl: "/store",
      type: "banner",
      placement: "vet_home",
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: "وصول شحنة جديدة من الأدوية البيطرية",
      description: "أحدث الأدوية والمكملات الغذائية للحيوانات متوفرة الآن",
      imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop",
      targetUrl: "/store",
      type: "banner",
      placement: "vet_home",
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: "وظائف شاغرة للأطباء البيطريين - العراق",
      description: "فرص عمل متميزة للأطباء البيطريين في العيادات والمستشفيات",
      imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800&h=400&fit=crop",
      targetUrl: "/job-vacancies",
      type: "banner",
      placement: "vet_home",
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: "عيادة الرحمة البيطرية - بغداد",
      description: "أفضل الخدمات البيطرية والرعاية الصحية لحيواناتك",
      imageUrl: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&h=400&fit=crop",
      targetUrl: "/clinics-list",
      type: "banner",
      placement: "home",
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: "طعام صحي ومغذي لحيواناتك الأليفة",
      description: "تشكيلة واسعة من الأطعمة الصحية والمكملات الغذائية",
      imageUrl: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=400&fit=crop",
      targetUrl: "/store",
      type: "banner",
      placement: "home",
      startDate,
      endDate,
      isActive: true,
    },
    {
      title: "خدمة التطعيمات المنزلية",
      description: "احجز موعد للتطعيمات الدورية لحيوانك في منزلك",
      imageUrl: "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=800&h=400&fit=crop",
      targetUrl: "/appointments",
      type: "banner",
      placement: "home",
      startDate,
      endDate,
      isActive: true,
    },
  ];

  await db.insert(advertisements).values(advertisementsData);
  logStep(`Created ${advertisementsData.length} advertisements\n`);
}