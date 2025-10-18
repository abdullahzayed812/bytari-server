import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/veterinary_app";

  console.log("🔄 Connecting to database...");

  // Create connection for migrations
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    console.log("🔄 Running database migrations...");

    await migrate(db, {
      migrationsFolder: "./db/migrations",
    });

    console.log("✅ All migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
    console.log("📦 Database connection closed");
  }
}

// Run migrations if this script is called directly
if (import.meta.main) {
  runMigrations();
}
