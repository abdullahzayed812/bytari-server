import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { poultryFarms, fieldAssignments } from "../schema";
import { logStep, getDateOffset } from "./helpers";

export async function seedPoultryFarms(db: NodePgDatabase<any>, regularUsers: any[], vetUsers: any[]) {
  console.log("🐔 Seeding poultry farms...");

  const farmsData = [
    {
      ownerId: regularUsers[0]?.id,
      name: "مزرعة النجاح للدواجن",
      location: "بغداد - أبو غريب - منطقة المزارع",
      farmType: "broiler",
      capacity: 10000,
      currentPopulation: 8500,
      establishedDate: new Date("2020-05-15"),
      licenseNumber: "PF-BGD-2020-001",
      contactPerson: "علي أحمد الكاظمي",
      phone: "+964 770 100 001",
      email: "success.farm@gmail.com",
      facilities: JSON.stringify(["عنابر حديثة", "نظام تهوية آلي", "نظام تغذية أوتوماتيكي", "مستودع أعلاف"]),
      healthStatus: "healthy",
      lastInspection: getDateOffset(-15),
      isActive: true,
      isVerified: true,
    },
    {
      ownerId: regularUsers[1]?.id,
      name: "مزرعة الأمل لإنتاج البيض",
      location: "البصرة - الزبير - طريق الكويت",
      farmType: "layer",
      capacity: 15000,
      currentPopulation: 14200,
      establishedDate: new Date("2019-03-20"),
      licenseNumber: "PF-BSR-2019-002",
      contactPerson: "فاطمة محمد النجفي",
      phone: "+964 770 100 002",
      email: "hope.eggs@gmail.com",
      facilities: JSON.stringify(["أقفاص بطاريات حديثة", "نظام جمع بيض آلي", "وحدة فرز وتعبئة", "ثلاجات تخزين"]),
      healthStatus: "healthy",
      lastInspection: getDateOffset(-8),
      isActive: true,
      isVerified: true,
    },
    {
      ownerId: regularUsers[2]?.id,
      name: "مزرعة الخير للتربية",
      location: "النجف - الكوفة - المنطقة الزراعية",
      farmType: "breeder",
      capacity: 5000,
      currentPopulation: 4800,
      establishedDate: new Date("2021-01-10"),
      licenseNumber: "PF-NJF-2021-003",
      contactPerson: "حسن علي البصري",
      phone: "+964 770 100 003",
      email: "khair.breeding@gmail.com",
      facilities: JSON.stringify(["عنابر تربية", "محضن صناعي", "عيادة بيطرية صغيرة"]),
      healthStatus: "healthy",
      lastInspection: getDateOffset(-20),
      isActive: true,
      isVerified: true,
    },
  ];

  const createdFarms = await db.insert(poultryFarms).values(farmsData).returning();
  logStep(`Created ${createdFarms.length} poultry farms`);

  // Field Assignments
  const assignmentsData = [
    {
      farmId: createdFarms[0].id,
      veterinarianId: vetUsers[0]?.id,
      supervisorId: regularUsers[0]?.id,
      assignedDate: getDateOffset(-30),
      status: "active",
      visitFrequency: "weekly",
      lastVisit: getDateOffset(-3),
      nextVisit: getDateOffset(4),
      notes: "مزرعة بحالة جيدة، تحتاج فحص دوري أسبوعي",
      reports: JSON.stringify([
        {
          date: getDateOffset(-3),
          findings: "الدواجن بصحة جيدة، تم إعطاء التطعيمات الدورية",
        },
      ]),
    },
    {
      farmId: createdFarms[1].id,
      veterinarianId: vetUsers[1]?.id,
      supervisorId: regularUsers[1]?.id,
      assignedDate: getDateOffset(-45),
      status: "active",
      visitFrequency: "monthly",
      lastVisit: getDateOffset(-8),
      nextVisit: getDateOffset(22),
      notes: "مزرعة منتجة، فحص شهري كافي",
      reports: JSON.stringify([
        {
          date: getDateOffset(-8),
          findings: "إنتاج البيض جيد، لا توجد مشاكل صحية",
        },
      ]),
    },
  ];

  await db.insert(fieldAssignments).values(assignmentsData);
  logStep(`Created ${assignmentsData.length} field assignments\n`);

  return createdFarms;
}
