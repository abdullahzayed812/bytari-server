import bcrypt from "bcryptjs";
import { users, veterinarians } from "../schema";

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function seedUsers(db) {
  console.log("📝 Seeding users...\n");

  // ==================== REGULAR USERS ====================
  console.log("Creating regular users...");
  const userPassword = await hashPassword("user123");

  const regularUsers = await db
    .insert(users)
    .values([
      {
        email: "user1@example.com",
        name: "علي أحمد الكاظمي",
        phone: "+964770100001",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user2@example.com",
        name: "فاطمة محمد النجفي",
        phone: "+964770100002",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user3@example.com",
        name: "حسن علي البصري",
        phone: "+964770100003",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user4@example.com",
        name: "زينب حسين الموصلي",
        phone: "+964770100004",
        password: userPassword,
        userType: "user",
        isActive: false,
      },
      {
        email: "user5@example.com",
        name: "عمر سالم الأنبار",
        phone: "+964770100005",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user6@example.com",
        name: "مريم خالد الكربلائي",
        phone: "+964770100006",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user7@example.com",
        name: "يوسف عبد الرحمن الديواني",
        phone: "+964770100007",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user8@example.com",
        name: "نور الهدى جاسم الناصري",
        phone: "+964770100008",
        password: userPassword,
        userType: "user",
        isActive: false,
      },
      {
        email: "user9@example.com",
        name: "محمد صالح الحلي",
        phone: "+964770100009",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user10@example.com",
        name: "سارة أحمد الكوفي",
        phone: "+964770100010",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user11@example.com",
        name: "عبد الله حسن السماوي",
        phone: "+964770100011",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user12@example.com",
        name: "رقية علي الحيدري",
        phone: "+964770100012",
        password: userPassword,
        userType: "user",
        isActive: false,
      },
      {
        email: "user13@example.com",
        name: "كريم محمود الأربيلي",
        phone: "+964770100013",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user14@example.com",
        name: "هدى سعد الدهوكي",
        phone: "+964770100014",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
      {
        email: "user15@example.com",
        name: "أمير فاضل الواسطي",
        phone: "+964770100015",
        password: userPassword,
        userType: "user",
        isActive: true,
      },
    ])
    .returning();

  // ==================== VETERINARIAN USERS ====================
  console.log("Creating veterinarian users...");
  const vetPassword = await hashPassword("vet123");

  const vets = await db
    .insert(users)
    .values([
      {
        email: "vet1@example.com",
        name: "د. محمد عبد الله - طبيب بيطري",
        phone: "+964770200001",
        password: vetPassword,
        userType: "vet",
        isActive: true,
      },
      {
        email: "vet2@example.com",
        name: "د. سعاد حسن - طبيبة بيطرية",
        phone: "+964770200002",
        password: vetPassword,
        userType: "vet",
        isActive: true,
      },
      {
        email: "vet3@example.com",
        name: "د. أحمد جاسم - طبيب بيطري",
        phone: "+964770200003",
        password: vetPassword,
        userType: "vet",
        isActive: false,
      },
      {
        email: "vet4@example.com",
        name: "د. نور الهدى - طبيبة بيطرية",
        phone: "+964770200004",
        password: vetPassword,
        userType: "vet",
        isActive: true,
      },
      {
        email: "vet5@example.com",
        name: "د. عبد الرحمن علي - طبيب بيطري",
        phone: "+964770200005",
        password: vetPassword,
        userType: "vet",
        isActive: true,
      },
      {
        email: "vet6@example.com",
        name: "د. زينب محمد - طبيبة بيطرية",
        phone: "+964770200006",
        password: vetPassword,
        userType: "vet",
        isActive: true,
      },
      {
        email: "vet7@example.com",
        name: "د. حسن عبد الله - طبيب بيطري",
        phone: "+964770200007",
        password: vetPassword,
        userType: "vet",
        isActive: false,
      },
      {
        email: "vet8@example.com",
        name: "د. فاطمة أحمد - طبيبة بيطرية",
        phone: "+964770200008",
        password: vetPassword,
        userType: "vet",
        isActive: true,
      },
    ])
    .returning();

  // ==================== VETERINARIANS ====================
  console.log("Creating veterinarians...");
  const createdVeterinarians = await db
    .insert(veterinarians)
    .values(
      vets.map((vet, index) => ({
        userId: vet.id,
        licenseNumber: `VET-LICENSE-${1000 + index}`,
        specialization: "General Practice",
        experience: 5,
        isVerified: true,
      }))
    )
    .returning();

  return { regularUsers, vets, veterinarians: createdVeterinarians };
}