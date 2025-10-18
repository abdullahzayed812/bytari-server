import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Database connection URL
const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/veterinary_app";

// Create PostgreSQL connection
const sql = postgres(connectionString, {
  max: 20, // Maximum number of connections
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(sql, { schema });

// Export all schema tables for easy access
export * from "./schema";

// Connection test function
export async function testConnection() {
  try {
    await sql`SELECT 1`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}
