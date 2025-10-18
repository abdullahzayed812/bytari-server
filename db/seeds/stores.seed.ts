import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { stores } from "../schema";
import { getDateOffset, logStep } from "./helpers";

export async function seedStores(db: NodePgDatabase<any>, vetUsers: any[]) {
  console.log("🏪 Seeding vet stores...");

  const storesData = [
    {
      ownerId: vetUsers[0].id,
      name: "مذخر الشفاء البيطري",
      description: "مذخر متخصص في بيع الأدوية والمستلزمات البيطرية في بغداد",
      address: "بغداد - الكرادة - شارع الطيران",
      phone: "+964 770 111 2222",
      email: "info@shifa-vet-store.com",
      category: "vet_supplies",
      latitude: 33.3152,
      longitude: 44.3661,
      isVerified: true,
      isActive: true,
      showOnVetHome: true,
      subscriptionStatus: "active",
      activationEndDate: getDateOffset(60),
      needsRenewal: false,
      rating: 4.7,
    },
    {
      ownerId: vetUsers[1].id,
      name: "مذخر النجف البيطري",
      description: "مذخر بيطري شامل يقدم جميع الأدوية والمعدات البيطرية",
      address: "النجف الأشرف - حي الجديدة - شارع الكوفة",
      phone: "+964 770 222 3333",
      email: "contact@najaf-vet-store.com",
      category: "vet_pharmacy",
      latitude: 32.0281,
      longitude: 44.3225,
      isVerified: true,
      isActive: true,
      showOnVetHome: true,
      subscriptionStatus: "active",
      activationEndDate: getDateOffset(7),
      needsRenewal: false,
      rating: 4.5,
    },
    {
      ownerId: vetUsers[2].id,
      name: "مذخر البصرة البيطري",
      description: "مذخر متقدم يوفر أحدث الأدوية والمعدات البيطرية",
      address: "البصرة - العشار - شارع الكورنيش",
      phone: "+964 770 333 4444",
      email: "info@basra-vet-store.com",
      category: "vet_equipment",
      latitude: 30.5085,
      longitude: 47.7804,
      isVerified: true,
      isActive: false,
      showOnVetHome: false,
      subscriptionStatus: "expired",
      activationEndDate: getDateOffset(-1),
      needsRenewal: true,
      rating: 4.9,
    },
    {
      ownerId: vetUsers[3].id,
      name: "مذخر أربيل البيطري",
      description: "مذخر بيطري متخصص في الأدوية والمعدات الجراحية",
      address: "أربيل - عنكاوا - شارع الجامعة",
      phone: "+964 770 444 5555",
      email: "info@erbil-vet-store.com",
      category: "vet_surgery",
      latitude: 36.1911,
      longitude: 44.0093,
      isVerified: true,
      isActive: true,
      showOnVetHome: true,
      subscriptionStatus: "active",
      activationEndDate: getDateOffset(60),
      needsRenewal: false,
      rating: 4.6,
    },
  ];

  const createdStores = await db.insert(stores).values(storesData).returning();

  logStep(`Created ${createdStores.length} vet stores\n`);
  return createdStores;
}
