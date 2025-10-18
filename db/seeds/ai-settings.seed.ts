import { aiSettings } from "../schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { logStep } from "./helpers";

export async function seedAISettings(db: NodePgDatabase<any>, superAdmin: any) {
  console.log("🤖 Seeding AI settings...");

  const aiSettingsData = [
    {
      isEnabled: true,
      responseDelay: 30,
      maxResponseLength: 1000,
      confidenceThreshold: 0.7,
      customPrompts: {
        consultations: "أنت مساعد ذكي متخصص في الاستشارات البيطرية. قدم نصائح مفيدة وآمنة حول رعاية الحيوانات الأليفة.",
        inquiries: "أنت مساعد ذكي متخصص في الرد على استفسارات الأطباء البيطريين."
      }
    }
  ];

  await db.insert(aiSettings).values(aiSettingsData);
  logStep(`Created ${aiSettingsData.length} AI settings
`);
}