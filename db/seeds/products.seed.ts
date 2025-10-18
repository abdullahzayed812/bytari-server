import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { products } from "../schema";
import { logStep } from "./helpers";

export async function seedProducts(db: NodePgDatabase<any>, stores: any[]) {
  console.log("🛍️ Seeding products...");

  if (!stores.length) {
    throw new Error("No stores available to associate with products");
  }

  const productsData = [
    {
      storeId: stores[0].id, // Assign to first store
      name: "طعام قطط رويال كانين - 2 كغم",
      description: "طعام جاف متوازن للقطط البالغة، يحتوي على جميع العناصر الغذائية الضرورية",
      price: "45000",
      category: "food",
      subcategory: "cat_food",
      brand: "Royal Canin",
      images: JSON.stringify(["https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400"]),
      inStock: true,
      stockQuantity: 150,
      sku: "RC-CAT-2KG-001",
      isActive: true,
    },
    {
      storeId: stores[0].id, // Assign to first store
      name: "طعام كلاب بيديجري - 3 كغم",
      description: "طعام جاف غني بالبروتين للكلاب من جميع الأعمار",
      price: "38000",
      category: "food",
      subcategory: "dog_food",
      brand: "Pedigree",
      images: JSON.stringify(["https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=400"]),
      inStock: true,
      stockQuantity: 200,
      sku: "PDG-DOG-3KG-001",
      isActive: true,
    },
    {
      storeId: stores[1].id, // Assign to second store
      name: "قفص قطط كبير",
      description: "قفص فسيح وآمن للقطط مع باب قابل للفتح وصينية قابلة للإزالة",
      price: "85000",
      category: "accessories",
      subcategory: "cages",
      brand: "PetMate",
      images: JSON.stringify(["https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400"]),
      inStock: true,
      stockQuantity: 45,
      sku: "PM-CAGE-CAT-L-001",
      isActive: true,
    },
    {
      storeId: stores[1].id, // Assign to second store
      name: "طوق كلاب جلدي",
      description: "طوق جلدي أصلي متين ومريح للكلاب متوسطة الحجم",
      price: "25000",
      category: "accessories",
      subcategory: "collars",
      brand: "Leather Pro",
      images: JSON.stringify(["https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400"]),
      inStock: true,
      stockQuantity: 120,
      sku: "LP-COL-DOG-M-001",
      isActive: true,
    },
    {
      storeId: stores[2].id, // Assign to third store
      name: "شامبو قطط بالصبار",
      description: "شامبو طبيعي لطيف على جلد القطط، برائحة الصبار المنعشة",
      price: "18000",
      category: "grooming",
      subcategory: "shampoo",
      brand: "Bio Pet",
      images: JSON.stringify(["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400"]),
      inStock: true,
      stockQuantity: 85,
      sku: "BP-SHAM-CAT-500-001",
      isActive: true,
    },
    {
      storeId: stores[2].id, // Assign to third store
      name: "لعبة كرة تفاعلية للقطط",
      description: "كرة إلكترونية تتحرك تلقائياً لتحفيز القطط على اللعب",
      price: "32000",
      category: "toys",
      subcategory: "interactive",
      brand: "PlayPet",
      images: JSON.stringify(["https://images.unsplash.com/photo-1591768575867-f11f2dcb5266?w=400"]),
      inStock: true,
      stockQuantity: 60,
      sku: "PP-TOY-CAT-BALL-001",
      isActive: true,
    },
    {
      storeId: stores[3].id, // Assign to fourth store
      name: "مكملات غذائية للكلاب - فيتامينات",
      description: "فيتامينات متعددة لتعزيز صحة الكلاب ومناعتها",
      price: "55000",
      category: "supplements",
      subcategory: "vitamins",
      brand: "VetPlus",
      images: JSON.stringify(["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400"]),
      inStock: true,
      stockQuantity: 75,
      sku: "VP-VIT-DOG-120-001",
      isActive: true,
    },
    {
      storeId: stores[3].id, // Assign to fourth store
      name: "صندوق رمل للقطط مع غطاء",
      description: "صندوق رمل كبير مع غطاء لمنع انتشار الروائح",
      price: "42000",
      category: "accessories",
      subcategory: "litter_boxes",
      brand: "CleanCat",
      images: JSON.stringify(["https://images.unsplash.com/photo-1611003228941-98852ba62227?w=400"]),
      inStock: true,
      stockQuantity: 55,
      sku: "CC-LBOX-CAT-L-001",
      isActive: true,
    },
    {
      storeId: stores[0].id, // Assign to first store
      name: "حزام أمان للسيارة - كلاب",
      description: "حزام أمان مصمم خصيصاً لتأمين الكلاب أثناء السفر بالسيارة",
      price: "28000",
      category: "accessories",
      subcategory: "safety",
      brand: "SafePet",
      images: JSON.stringify(["https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?w=400"]),
      inStock: true,
      stockQuantity: 90,
      sku: "SP-SAFE-DOG-BELT-001",
      isActive: true,
    },
    {
      storeId: stores[0].id, // Assign to first store
      name: "وعاء طعام أوتوماتيكي",
      description: "وعاء طعام ذكي يوزع الطعام تلقائياً في أوقات محددة",
      price: "120000",
      category: "accessories",
      subcategory: "feeders",
      brand: "SmartPet",
      images: JSON.stringify(["https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=400"]),
      inStock: true,
      stockQuantity: 35,
      sku: "SMP-FEED-AUTO-001",
      isActive: true,
    },
    {
      storeId: stores[1].id, // Assign to second store
      name: "رمل قطط طبيعي - 5 كغم",
      description: "رمل طبيعي ممتاز يمتص الروائح ويتكتل بسهولة",
      price: "22000",
      category: "litter",
      subcategory: "clumping",
      brand: "NatureCat",
      images: JSON.stringify(["https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=400"]),
      inStock: true,
      stockQuantity: 180,
      sku: "NC-LIT-5KG-001",
      isActive: true,
    },
    {
      storeId: stores[1].id, // Assign to second store
      name: "فرشاة تنظيف شعر الحيوانات",
      description: "فرشاة احترافية لإزالة الشعر الميت والحفاظ على نظافة الفراء",
      price: "15000",
      category: "grooming",
      subcategory: "brushes",
      brand: "GroomPro",
      images: JSON.stringify(["https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400"]),
      inStock: true,
      stockQuantity: 110,
      sku: "GP-BRUSH-UNI-001",
      isActive: true,
    },
    {
      storeId: stores[2].id, // Assign to third store
      name: "بيت خشبي للكلاب - حجم كبير",
      description: "بيت خشبي متين ومعزول مناسب للكلاب الكبيرة",
      price: "250000",
      category: "accessories",
      subcategory: "houses",
      brand: "WoodPet",
      images: JSON.stringify(["https://images.unsplash.com/photo-1583511655826-05700d3f6c2e?w=400"]),
      inStock: true,
      stockQuantity: 20,
      sku: "WP-HOUSE-DOG-L-001",
      isActive: true,
    },
    {
      storeId: stores[2].id, // Assign to third store
      name: "مقص أظافر للحيوانات الأليفة",
      description: "مقص احترافي حاد وآمن لقص أظافر القطط والكلاب",
      price: "12000",
      category: "grooming",
      subcategory: "nail_clippers",
      brand: "PetCare",
      images: JSON.stringify(["https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400"]),
      inStock: true,
      stockQuantity: 95,
      sku: "PC-CLIP-NAIL-001",
      isActive: true,
    },
    {
      storeId: stores[3].id, // Assign to fourth store
      name: "علاج البراغيث والقراد - قطط",
      description: "علاج موضعي فعال ضد البراغيث والقراد للقطط",
      price: "48000",
      category: "medicine",
      subcategory: "flea_treatment",
      brand: "FleaFree",
      images: JSON.stringify(["https://images.unsplash.com/photo-1559003714-d5d4c8ba1d96?w=400"]),
      inStock: true,
      stockQuantity: 65,
      sku: "FF-FLEA-CAT-3PK-001",
      isActive: true,
    },
  ];

  const createdProducts = await db.insert(products).values(productsData).returning();

  logStep(`Created ${createdProducts.length} products\n`);
  return createdProducts;
}
