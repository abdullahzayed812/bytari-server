import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, aiSettings } from "../../../../db"; // Import db and aiSettings table
import { eq } from "drizzle-orm";

const aiSettingsSchema = z.object({
  type: z.enum(["consultations", "inquiries"]),
  isEnabled: z.boolean(),
  systemPrompt: z.string().min(1),
  responseDelay: z.number().min(5).max(300), // 5 seconds to 5 minutes
  maxResponseLength: z.number().min(100).max(2000),
  adminId: z.number(),
});

const getAiSettingsSchema = z.object({
  type: z.enum(["consultations", "inquiries"]).optional(),
});

// إنشاء أو تحديث إعدادات الذكاء الاصطناعي
export const updateAiSettingsProcedure = publicProcedure.input(aiSettingsSchema).mutation(async ({ input }) => {
  try {
    console.log("Updating AI settings with input:", input);

    const { type, isEnabled, systemPrompt, responseDelay, maxResponseLength, adminId } = input;

    const existingSettings = await db.query.aiSettings.findFirst({
      where: eq(aiSettings.type, type),
    });

    let updatedSetting;

    if (existingSettings) {
      // Update existing settings
      updatedSetting = await db
        .update(aiSettings)
        .set({
          isEnabled,
          systemPrompt,
          responseDelay,
          maxResponseLength,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.id, existingSettings.id))
        .returning();
    } else {
      // Create new settings
      updatedSetting = await db
        .insert(aiSettings)
        .values({
          type,
          isEnabled,
          systemPrompt,
          responseDelay,
          maxResponseLength,
          updatedBy: adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
    }

    if (!updatedSetting || updatedSetting.length === 0) {
      throw new Error("فشل في تحديث/إنشاء إعدادات الذكاء الاصطناعي");
    }

    console.log(`AI settings updated for type: ${type}`);

    return {
      success: true,
      settings: updatedSetting[0],
      message: `تم تحديث إعدادات الذكاء الاصطناعي للـ${type === "consultations" ? "استشارات" : "استفسارات"} بنجاح`,
    };
  } catch (error) {
    console.error("Error updating AI settings:", error);

    if (error instanceof Error) {
      throw new Error(`فشل في تحديث إعدادات الذكاء الاصطناعي: ${error.message}`);
    }
    throw new Error("فشل في تحديث إعدادات الذكاء الاصطناعي");
  }
});

// جلب إعدادات الذكاء الاصطناعي
export const getAiSettingsProcedure = publicProcedure.input(getAiSettingsSchema).query(async ({ input }) => {
  try {
    console.log("Getting AI settings with input:", input);

    let fetchedSettings;
    if (input.type) {
      fetchedSettings = await db.query.aiSettings.findMany({
        where: eq(aiSettings.type, input.type),
      });
    } else {
      fetchedSettings = await db.query.aiSettings.findMany();
    }

    console.log(`Found ${fetchedSettings.length} AI settings`);

    return {
      success: true,
      settings: fetchedSettings,
    };
  } catch (error) {
    console.error("Error getting AI settings:", error);

    if (error instanceof Error) {
      throw new Error(`فشل في جلب إعدادات الذكاء الاصطناعي: ${error.message}`);
    }
    throw new Error("فشل في جلب إعدادات الذكاء الاصطناعي");
  }
});

// تفعيل/إيقاف الذكاء الاصطناعي بسرعة
export const toggleAiProcedure = publicProcedure
  .input(
    z.object({
      type: z.enum(["consultations", "inquiries"]),
      isEnabled: z.boolean(),
      adminId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log("Toggling AI with input:", input);

      const { type, isEnabled, adminId } = input;

      const updatedSetting = await db
        .update(aiSettings)
        .set({
          isEnabled,
          updatedBy: adminId,
          updatedAt: new Date(),
        })
        .where(eq(aiSettings.type, type))
        .returning();

      if (!updatedSetting || updatedSetting.length === 0) {
        throw new Error("فشل في تحديث حالة الذكاء الاصطناعي");
      }

      console.log(`AI ${isEnabled ? "enabled" : "disabled"} for type: ${type}`);

      return {
        success: true,
        message: `تم ${isEnabled ? "تفعيل" : "إيقاف"} الذكاء الاصطناعي للـ${
          type === "consultations" ? "استشارات" : "استفسارات"
        } بنجاح`,
      };
    } catch (error) {
      console.error("Error toggling AI:", error);

      if (error instanceof Error) {
        throw new Error(`فشل في تغيير حالة الذكاء الاصطناعي: ${error.message}`);
      }
      throw new Error("فشل في تغيير حالة الذكاء الاصطناعي");
    }
  });
