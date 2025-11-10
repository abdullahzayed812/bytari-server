import bcrypt from "bcryptjs";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export function getDateOffset(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function logStep(message: string): void {
  console.log(`  ✓ ${message}`);
}

export async function cleanDatabase(db: NodePgDatabase<any>) {
  console.log("🗑️  Cleaning existing data...");

  const tables = [
    "users",
    "pets",
    "veterinarians",
    "clinics",
    "appointments",
    "lost_pets",
    "products",
    "orders",
    "order_items",
    "inquiries",
    "inquiry_replies",
    "consultations",
    "consultation_replies",
    "stores",
    "store_products",
    "warehouses",
    "warehouse_products",
    "tips",
    "courses",
    "course_registrations",
    "notifications",
    "admin_notifications",
    "email_notifications",
    "system_messages",
    "system_message_recipients",
    "admin_activity_logs",
    "app_sections",
    "vet_books",
    "vet_magazines",
    "admin_content",
    "advertisements",
    "pet_approvals",
    "approval_requests",
    "ai_settings",
    "poultry_farms",
    "field_assignments",
    "admin_roles",
    "user_roles",
    "admin_permissions",
    "role_permissions",
    // Add union tables
    "union_main",
    "union_branches",
    "union_announcements",
    "union_followers",
    "union_settings",
    "union_users",
  ];

  try {
    await db.execute(sql.raw(`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
    console.log("  ✓ Database cleaned successfully\n");
  } catch (error) {
    if (error.message.includes("does not exist")) {
      console.log("  ✓ Tables do not exist, skipping database cleaning.\n");
    } else {
      throw error;
    }
  }
}
