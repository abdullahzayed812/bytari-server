import { approvalRequests, petApprovalRequests } from "../schema";

export async function seedApprovals(
  db,
  { vets, users, clinics, superAdmin, pets, stores }
) {
  console.log("📝 Seeding approvals...\n");

  // ==================== APPROVAL REQUESTS ====================
  console.log("Creating approval requests...");
  await db
    .insert(approvalRequests)
    .values([
      {
        requestType: "vet_registration",
        requesterId: vets[0].id,
        resourceId: vets[0].id,
        title: "طلب تسجيل د. محمد عبد الله كطبيب بيطري",
        description:
          "طلب تسجيل الدكتور محمد عبد الله كطبيب بيطري معتمد في العراق - تخصص الحيوانات الأليفة",
        documents: JSON.stringify([
          "vet_license_mohammed.pdf",
          "graduation_certificate.pdf",
        ]),
        licenseImages: JSON.stringify([
          "license_mohammed_1.jpg",
          "license_mohammed_2.jpg",
        ]),
        identityImages: JSON.stringify([
          "id_mohammed_front.jpg",
          "id_mohammed_back.jpg",
        ]),
        officialDocuments: JSON.stringify([
          "graduation_cert_baghdad_uni.pdf",
          "internship_certificate.pdf",
        ]),
        paymentStatus: "completed",
        paymentAmount: 15000,
        paymentMethod: "credit_card",
        paymentTransactionId: "TXN123456789",
        paymentCompletedAt: Math.floor(Date.now() / 1000),
        paymentReceipt: "receipt_mohammed_1.pdf",
        status: "approved",
        reviewedBy: superAdmin.id,
        reviewedAt: Math.floor(Date.now() / 1000),
        priority: "normal",
      },
      {
        requestType: "clinic_activation",
        requesterId: users[1].id,
        resourceId: clinics[0].id,
        title: "طلب تفعيل عيادة الرحمة البيطرية - بغداد",
        description:
          "طلب تفعيل عيادة الرحمة البيطرية في منطقة الكرادة - بغداد، تقدم خدمات شاملة للحيوانات الأليفة",
        documents: JSON.stringify([
          "clinic_license_rahma.pdf",
          "health_permit.pdf",
        ]),
        licenseImages: JSON.stringify([
          "clinic_license_rahma.jpg",
          "clinic_exterior.jpg",
        ]),
        identityImages: JSON.stringify([
          "owner_id_front.jpg",
          "owner_id_back.jpg",
        ]),
        officialDocuments: JSON.stringify([
          "municipal_permit.pdf",
          "fire_safety_cert.pdf",
        ]),
        paymentStatus: "pending",
        paymentAmount: 10000,
        paymentMethod: "bank_transfer",
        paymentTransactionId: "TXN987654321",
        status: "pending",
        priority: "high",
      },
      {
        requestType: "store_activation",
        requesterId: users[2].id,
        resourceId: stores[0].id,
        title: "طلب تفعيل مذخر الشفاء البيطري - البصرة",
        description:
          "طلب تفعيل مذخر الشفاء البيطري في البصرة لبيع الأدوية والمستلزمات البيطرية",
        documents: JSON.stringify([
          "store_license_shifa.pdf",
          "pharmacy_permit.pdf",
        ]),
        licenseImages: JSON.stringify([
          "store_license_shifa.jpg",
          "store_interior.jpg",
        ]),
        identityImages: JSON.stringify(["owner_basra_id.jpg"]),
        officialDocuments: JSON.stringify([
          "trade_license_basra.pdf",
          "drug_handling_permit.pdf",
        ]),
        paymentStatus: "failed",
        paymentAmount: 12000,
        paymentMethod: "wallet",
        paymentTransactionId: "TXN44556677",
        status: "rejected",
        rejectionReason:
          "المتجر لا يحتوي على التجهيزات المطلوبة لحفظ الأدوية البيطرية",
        adminNotes: "يمكن إعادة التقديم بعد تجهيز المخزن بشكل صحيح",
        priority: "urgent",
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400",
      ]),
      contactInfo: "+964770100005",
      location: "أربيل، العراق",
      status: "approved",
      reviewedBy: superAdmin.id,
      reviewedAt: new Date(),
    },
  ]);
}
