import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { warehouses, warehouseProducts } from "../schema";
import { logStep, getDateOffset } from "./helpers";

export async function seedWarehouses(db: NodePgDatabase<any>, vetUsers: any[]) {
  console.log("🏭 Seeding warehouses...");

  const warehousesData = [
    {
      ownerId: vetUsers[0]?.id,
      name: "مخزن بغداد المركزي للمستلزمات البيطرية",
      description: "مخزن كبير يوفر جميع المستلزمات البيطرية بالجملة",
      address: "بغداد - منطقة الدورة - شارع الصناعة",
      phone: "+964 770 444 5555",
      email: "baghdad.warehouse@vet.com",
      licenseNumber: "WH-BGD-2023-001",
      capacity: 5000,
      currentStock: 3450,
      isActive: true,
      isVerified: true,
      activationStartDate: getDateOffset(-60),
      activationEndDate: getDateOffset(305),
      needsRenewal: false,
    },
    {
      ownerId: vetUsers[1]?.id,
      name: "مخزن البصرة للأدوية البيطرية",
      description: "مخزن متخصص في الأدوية واللقاحات البيطرية",
      address: "البصرة - منطقة الزبير الصناعية",
      phone: "+964 770 555 6666",
      email: "basra.pharma@vet.com",
      licenseNumber: "WH-BSR-2023-002",
      capacity: 3000,
      currentStock: 2100,
      isActive: true,
      isVerified: true,
      activationStartDate: getDateOffset(-45),
      activationEndDate: getDateOffset(320),
      needsRenewal: false,
    },
    {
      ownerId: vetUsers[2]?.id,
      name: "مخزن أربيل للمعدات البيطرية",
      description: "مخزن يوفر المعدات والأجهزة الطبية البيطرية",
      address: "أربيل - المنطقة الصناعية - شارع 100",
      phone: "+964 770 666 7777",
      email: "erbil.equipment@vet.com",
      licenseNumber: "WH-ERB-2023-003",
      capacity: 2500,
      currentStock: 1800,
      isActive: true,
      isVerified: true,
      activationStartDate: getDateOffset(-30),
      activationEndDate: getDateOffset(335),
      needsRenewal: false,
    },
  ];

  const createdWarehouses = await db.insert(warehouses).values(warehousesData).returning();
  logStep(`Created ${createdWarehouses.length} warehouses`);

  // Warehouse Products
  const warehouseProductsData = [
    {
      warehouseId: createdWarehouses[0].id,
      name: "مضاد حيوي واسع الطيف - 100 مل",
      description: "مضاد حيوي فعال لعلاج الالتهابات البكتيرية",
      category: "medicine",
      brand: "VetPharma",
      sku: "VP-AB-100ML-001",
      batchNumber: "VP2024-001",
      expiryDate: new Date("2026-12-31"),
      quantity: 500,
      unitPrice: 35000,
      wholesalePrice: 28000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400"]),
      specifications: JSON.stringify({
        dosage: "حسب وزن الحيوان",
        storage: "يحفظ في مكان بارد وجاف",
        administration: "عن طريق الحقن العضلي",
      }),
      isAvailable: true,
    },
    {
      warehouseId: createdWarehouses[0].id,
      name: "لقاح السعار - 50 جرعة",
      description: "لقاح فعال ضد مرض السعار للكلاب والقطط",
      category: "vaccines",
      brand: "SafeVac",
      sku: "SV-RAB-50D-001",
      batchNumber: "SV2024-015",
      expiryDate: new Date("2025-06-30"),
      quantity: 200,
      unitPrice: 125000,
      wholesalePrice: 110000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1579154204601-01588f351e67?w=400"]),
      specifications: JSON.stringify({
        dosage: "جرعة واحدة سنوياً",
        storage: "يحفظ مبرداً بين 2-8 درجات",
        administration: "حقن تحت الجلد",
      }),
      isAvailable: true,
    },
    {
      warehouseId: createdWarehouses[1].id,
      name: "محلول معقم للجروح - 500 مل",
      description: "محلول طبي معقم لتنظيف وتطهير الجروح",
      category: "antiseptics",
      brand: "CleanCare",
      sku: "CC-ANT-500ML-001",
      batchNumber: "CC2024-033",
      expiryDate: new Date("2027-03-31"),
      quantity: 800,
      unitPrice: 15000,
      wholesalePrice: 12000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=400"]),
      specifications: JSON.stringify({
        usage: "للاستخدام الخارجي فقط",
        storage: "يحفظ في درجة حرارة الغرفة",
      }),
      isAvailable: true,
    },
    {
      warehouseId: createdWarehouses[2].id,
      name: "جهاز قياس الحرارة الرقمي البيطري",
      description: "جهاز دقيق وسريع لقياس حرارة الحيوانات",
      category: "equipment",
      brand: "MediTech",
      sku: "MT-THERM-DIG-001",
      batchNumber: "MT2024-088",
      expiryDate: null,
      quantity: 150,
      unitPrice: 45000,
      wholesalePrice: 38000,
      images: JSON.stringify(["https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=400"]),
      specifications: JSON.stringify({
        accuracy: "±0.1 درجة",
        battery: "بطارية قابلة للاستبدال",
        warranty: "سنة واحدة",
      }),
      isAvailable: true,
    },
  ];

  await db.insert(warehouseProducts).values(warehouseProductsData);
  logStep(`Created ${warehouseProductsData.length} warehouse products\n`);

  return createdWarehouses;
}
