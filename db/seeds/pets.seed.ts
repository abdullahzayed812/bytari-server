import { pets } from "../schema";

export async function seedPets(db, regularUsers) {
  console.log("📝 Seeding pets...\n");

  // ==================== PETS ====================
  console.log("Creating pets...");
  const createdPets = await db
    .insert(pets)
    .values([
      {
        name: "لولو",
        type: "cat",
        breed: "شيرازي",
        age: 2,
        weight: 3.5,
        color: "أبيض وبرتقالي",
        gender: "female",
        image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400",
        medicalHistory: "تطعيمات كاملة، معقمة",
        vaccinations: "تطعيم ثلاثي، تطعيم السعار",
        ownerId: regularUsers[0].id,
      },
      {
        name: "ماكس",
        type: "dog",
        breed: "جولدن ريتريفر",
        age: 3,
        weight: 25,
        color: "ذهبي",
        gender: "male",
        image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400",
        medicalHistory: "صحة ممتازة، تطعيمات كاملة",
        vaccinations: "تطعيمات سنوية كاملة",
        ownerId: regularUsers[1].id,
      },
      {
        name: "سنو",
        type: "rabbit",
        breed: "أرنب هولندي",
        age: 1,
        weight: 1.5,
        color: "أبيض",
        gender: "male",
        image: "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400",
        medicalHistory: "صحة جيدة",
        vaccinations: "تطعيمات أساسية",
        ownerId: regularUsers[2].id,
      },
      {
        name: "بيلا",
        type: "cat",
        breed: "شيرازي",
        age: 4,
        weight: 4,
        color: "رمادي",
        gender: "female",
        image: "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400",
        medicalHistory: "صحة ممتازة، معقمة",
        vaccinations: "تطعيمات كاملة",
        ownerId: regularUsers[3].id,
      },
      {
        name: "تشارلي",
        type: "dog",
        breed: "بيجل",
        age: 2,
        weight: 12,
        color: "بني وأبيض",
        gender: "male",
        image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400",
        medicalHistory: "مفقود منذ أسبوع",
        vaccinations: "تطعيمات كاملة",
        ownerId: regularUsers[4].id,
      },
    ])
    .returning();

  return createdPets;
}
