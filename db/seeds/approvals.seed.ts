import { approvalRequests, petApprovalRequests } from "../schema";

export async function seedApprovals(db, { vets, users, clinics, superAdmin, pets, stores }) {
  console.log("📝 Seeding approvals...\n");

  // ==================== APPROVAL REQUESTS ====================
  console.log("Creating approval requests...");
  await db
    .insert(approvalRequests)
    .values([
      {
        type: "vet_registration",
        userId: vets[0].id,
        entityId: vets[0].id,
        data: {
          title: "طلب تسجيل د. محمد عبد الله كطبيب بيطري",
          description: "طلب تسجيل الدكتور محمد عبد الله كطبيب بيطري معتمد في العراق - تخصص الحيوانات الأليفة",
          documents: ["vet_license_mohammed.pdf", "graduation_certificate.pdf"],
          licenseImages: ["license_mohammed_1.jpg", "license_mohammed_2.jpg"],
          identityImages: ["id_mohammed_front.jpg", "id_mohammed_back.jpg"],
          officialDocuments: ["graduation_cert_baghdad_uni.pdf", "internship_certificate.pdf"],
        },
        status: "pending",
      },
      {
        type: "vet_registration",
        userId: vets[1].id,
        entityId: vets[1].id,
        data: {
          title: "طلب تسجيل د. سعاد حسن كطبيبة بيطرية",
          description: "طلب تسجيل الدكتورة سعاد حسن كطبيبة بيطرية معتمدة - تخصص جراحة الحيوانات",
          documents: ["vet_license_suaad.pdf", "specialization_cert.pdf"],
          licenseImages: ["license_suaad_1.jpg", "license_suaad_2.jpg"],
          identityImages: ["id_suaad_front.jpg", "id_suaad_back.jpg"],
          officialDocuments: ["graduation_cert_mosul_uni.pdf", "surgery_specialization.pdf"],
        },
        status: "approved",
      },
      {
        type: "vet_registration",
        userId: vets[2].id,
        entityId: vets[2].id,
        data: {
          title: "طلب تسجيل د. أحمد جاسم كطبيب بيطري",
          description: "طلب تسجيل الدكتور أحمد جاسم كطبيب بيطري معتمد - تخصص الطب الباطني للحيوانات",
          documents: ["vet_license_ahmed.pdf", "internal_medicine_cert.pdf"],
          licenseImages: ["license_ahmed_1.jpg", "license_ahmed_2.jpg"],
          identityImages: ["id_ahmed_front.jpg", "id_ahmed_back.jpg"],
          officialDocuments: ["graduation_cert_basra_uni.pdf"],
        },
        status: "rejected",
        reviewNotes: "الوثائق المقدمة غير مكتملة - يرجى إرفاق شهادة التدريب العملي",
      },
      {
        type: "clinic_activation",
        userId: users[0].id,
        entityId: clinics[0].id,
        data: {
          title: "طلب تفعيل عيادة الرحمة البيطرية - بغداد",
          description: "طلب تفعيل عيادة الرحمة البيطرية في منطقة الكرادة - بغداد، تقدم خدمات شاملة للحيوانات الأليفة",
          documents: ["clinic_license_rahma.pdf", "health_permit.pdf"],
          licenseImages: ["clinic_license_rahma.jpg", "clinic_exterior.jpg"],
          identityImages: ["owner_id_front.jpg", "owner_id_back.jpg"],
          officialDocuments: ["municipal_permit.pdf", "fire_safety_cert.pdf"],
        },
        status: "pending",
      },
      {
        type: "clinic_activation",
        userId: users[1].id,
        entityId: clinics[1].id,
        data: {
          title: "طلب تفعيل عيادة النجف البيطرية",
          description: "طلب تفعيل عيادة النجف البيطرية المتخصصة في علاج الحيوانات الأليفة والماشية",
          documents: ["clinic_license_najaf.pdf"],
          licenseImages: ["clinic_license_najaf.jpg"],
          identityImages: ["owner_najaf_id.jpg"],
          officialDocuments: ["health_permit_najaf.pdf"],
        },
        status: "approved",
      },
      {
        type: "store_activation",
        userId: users[2].id,
        entityId: stores[0].id,
        data: {
          title: "طلب تفعيل مذخر الشفاء البيطري - البصرة",
          description: "طلب تفعيل مذخر الشفاء البيطري في البصرة لبيع الأدوية والمستلزمات البيطرية",
          documents: ["store_license_shifa.pdf", "pharmacy_permit.pdf"],
          licenseImages: ["store_license_shifa.jpg", "store_interior.jpg"],
          identityImages: ["owner_basra_id.jpg"],
          officialDocuments: ["trade_license_basra.pdf", "drug_handling_permit.pdf"],
        },
        status: "pending",
      },
      {
        type: "store_activation",
        userId: users[3].id,
        entityId: stores[1].id,
        data: {
          title: "طلب تفعيل مذخر الموصل البيطري",
          description: "طلب تفعيل مذخر الموصل البيطري المتخصص في الأدوية والأعلاف البيطرية",
          documents: ["store_license_mosul.pdf"],
          licenseImages: ["store_license_mosul.jpg"],
          identityImages: ["owner_mosul_id.jpg"],
          officialDocuments: ["trade_license_mosul.pdf"],
        },
        status: "rejected",
        reviewNotes: "المتجر لا يحتوي على التجهيزات المطلوبة لحفظ الأدوية البيطرية",
      },
    ])
    .returning();

  // ==================== PET APPROVAL REQUESTS ====================
  console.log("Creating pet approval requests...");
  await db.insert(petApprovalRequests).values([
    {
      petId: pets[0].id,
      ownerId: users[0].id,
      requestType: "adoption",
      title: "طلب تبني - لولو",
      description: "قطة جميلة ولطيفة تحتاج إلى منزل محب",
      images: JSON.stringify(["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400"]),
      contactInfo: "+964770100001",
      location: "بغداد، العراق",
      status: "approved",
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(),
    },
    {
      petId: pets[1].id,
      ownerId: users[1].id,
      requestType: "breeding",
      title: "طلب تزويج - ماكس",
      description: "كلب جولدن ريتريفر أصيل للتزويج",
      images: JSON.stringify(["https://images.unsplash.com/photo-1552053831-71594a27632d?w=400"]),
      contactInfo: "+964770100002",
      location: "النجف، العراق",
      price: 2000,
      status: "approved",
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(),
    },
    {
      petId: pets[2].id,
      ownerId: users[2].id,
      requestType: "adoption",
      title: "طلب تبني - سنو",
      description: "أرنب أبيض صغير يحتاج إلى عناية خاصة",
      images: JSON.stringify(["https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400"]),
      contactInfo: "+964770100003",
      location: "البصرة، العراق",
      status: "approved",
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(),
    },
    {
      petId: pets[3].id,
      ownerId: users[3].id,
      requestType: "breeding",
      title: "طلب تزويج - بيلا",
      description: "قطة شيرازي أصيلة للتزاوج",
      images: JSON.stringify(["https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"]),
      contactInfo: "+964770100004",
      location: "الموصل، العراق",
      price: 1500,
      status: "approved",
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(),
    },
    {
      petId: pets[4].id,
      ownerId: users[4].id,
      requestType: "missing",
      title: "بلاغ حيوان مفقود - تشارلي",
      description: "كلب صغير مفقود منذ أسبوع، يرجى المساعدة في العثور عليه",
      images: JSON.stringify(["https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400"]),
      contactInfo: "+964770100005",
      location: "أربيل، العراق",
      status: "approved",
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(),
    },
  ]);
}