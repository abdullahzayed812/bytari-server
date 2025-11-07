import { db } from "..";
import { seedAdminSystem } from "./admin-system.seed";
import { seedUsers } from "./users.seed";
// import { seedClinics } from "./clinics.seed";
// import { seedStores } from "./stores.seed";
// import { seedPets } from "./pets.seed";
// import { seedApprovals } from "./approvals.seed";
// import { seedContent } from "./content.seed";
// import { seedAISettings } from "./ai-settings.seed";
// import { seedVetBooks } from "./vet-books.seed";
// import { seedVetMagazines } from "./vet-magazines.seed";
// import { seedInquiries } from "./inquiries.seed";
// import { seedTips } from "./tips.seed";
// import { seedCourses } from "./courses.seed";
// import { seedProducts } from "./products.seed";
// import { seedWarehouses } from "./warehouses.seed";
// import { seedPoultryFarms } from "./poultry-farms.seed";
import { cleanDatabase } from "./helpers";

export async function seedDatabase() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Step 1: Clean existing data
    await cleanDatabase(db);

    // Step 2: Seed in correct order (respecting foreign key constraints)
    console.log("📝 Seeding data in order...\n");

    // Admin system (roles, permissions, admin users)
    const adminData = await seedAdminSystem(db);

    // Regular users (users, vets)
    const userData = await seedUsers(db);

    // Inquiries
    // const inquiryData = await seedInquiries(
    //   db,
    //   userData.regularUsers,
    //   userData.veterinarians
    // );

    // // Clinics
    // const clinicData = await seedClinics(db);

    // // Stores
    // const storeData = await seedStores(db, userData.veterinarians);

    // // Pets
    // const petData = await seedPets(db, userData.regularUsers);

    // Approval requests
    // await seedApprovals(db, {
    //   vets: userData.veterinarians,
    //   users: userData.regularUsers,
    //   clinics: clinicData,
    //   superAdmin: adminData.superAdmin,
    //   pets: petData,
    //   stores: storeData,
    // });

    // Content (advertisements, app sections)
    // await seedContent(db);

    // // AI Settings
    // await seedAISettings(db, adminData.superAdmin);

    // // Vet Books
    // const vetBooksData = await seedVetBooks(db, adminData.superAdmin);

    // // Vet Magazines
    // const vetMagazinesData = await seedVetMagazines(db, adminData.superAdmin);

    // // Tips
    // const tipsData = await seedTips(db, adminData.superAdmin);

    // // Courses
    // const coursesData = await seedCourses(
    //   db,
    //   adminData.superAdmin,
    //   userData.veterinarians
    // );

    // // Products
    // const productsData = await seedProducts(db, storeData);

    // // Warehouses
    // const warehousesData = await seedWarehouses(db, userData.veterinarians);

    // // Poultry Farms
    // const poultryFarmsData = await seedPoultryFarms(
    //   db,
    //   userData.regularUsers,
    //   userData.veterinarians
    // );

    // Success message
    console.log("\n✅ Database seeding completed successfully!\n");
    console.log("🔑 Login Credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Super Admin:");
    console.log("  Email: zuhairalrawi0@gmail.com");
    console.log("  Password: zuh000123000321zuh");
    console.log("\nAdmin Users (password: admin123):");
    console.log("  - admin@petapp.com");
    console.log("  - vet.moderator@petapp.com");
    console.log("  - user.moderator@petapp.com");
    console.log("  - content.manager@petapp.com");
    console.log("\nRegular Users (password: user123):");
    console.log("  - user1@example.com to user15@example.com");
    console.log("\nVeterinarians (password: vet123):");
    console.log("  - vet1@example.com to vet8@example.com");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📊 Database Statistics:");
    console.log(
      `  - Total Users: ${userData.regularUsers.length + userData.vets.length + Object.keys(adminData.admins).length}`
    );
    // console.log(`  - Clinics: ${clinicData.length}`);
    // console.log(`  - Vet Stores: ${storeData.length}`);
    // console.log(`  - Pets: ${petData.length}`);
    // console.log(`  - Advertisements: 6`);
    // console.log(`  - Vet Books: ${vetBooksData?.length || 0}`);
    // console.log(`  - Vet Magazines: ${vetMagazinesData?.length || 0}`);
    // console.log(`  - Inquiries: ${inquiryData?.length || 0}`);
    // console.log(`  - Tips: ${tipsData?.length || 0}`);
    // console.log(`  - Courses: ${coursesData?.length || 0}`);
    // console.log(`  - Products: ${productsData?.length || 0}`);
    // console.log(`  - Warehouses: ${warehousesData?.length || 0}`);
    // console.log(`  - Poultry Farms: ${poultryFarmsData?.length || 0}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.main) {
  seedDatabase();
}
