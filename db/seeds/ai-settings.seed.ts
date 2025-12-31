import { aiSettings } from "../schema";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { logStep } from "./helpers";

export async function seedAISettings(db: NodePgDatabase<any>, superAdmin: any) {
  console.log("🤖 Seeding AI settings...");

  const aiSettingsData = [
    {
      type: "consultations",
      isEnabled: true,
      systemPrompt:
        "أنت طبيب بيطري خبير ومساعد ذكي متخصص في الاستشارات البيطرية. قدم نصائح طبية مفيدة ومهنية ودقيقة للمستخدمين حول رعاية الحيوانات الأليفة وعلاج الأمراض. انصح بزيارة الطبيب البيطري فوراً في الحالات الطارئة.",
      responseDelay: 15,
      maxResponseLength: 1500,
      updatedBy: superAdmin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      type: "inquiries",
      isEnabled: true,
      systemPrompt:
        "أنت مساعد ذكي متخصص في الرد على استفسارات الأطباء البيطريين والطلاب. قدم إجابات دقيقة ومهنية وعلمية حول الطب البيطري والممارسات المهنية.",
      responseDelay: 15,
      maxResponseLength: 1500,
      updatedBy: superAdmin.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  await db.insert(aiSettings).values(aiSettingsData);
  logStep(`Created ${aiSettingsData.length} AI settings`);
}
