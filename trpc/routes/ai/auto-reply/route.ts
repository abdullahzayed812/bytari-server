import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, aiSettings, consultationReplies, inquiryReplies } from "../../../../db"; // Import db and tables
import { eq } from "drizzle-orm";

// دالة محسنة لإرسال طلب للذكاء الاصطناعي
async function callAI(
  messages: any[],
  maxLength: number = 1500
): Promise<{
  success: boolean;
  response: string;
  tokensUsed?: number;
  processingTime?: number;
}> {
  const startTime = Date.now();

  try {
    console.log("🤖 Calling AI with messages:", messages.length);

    const response = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      console.error("❌ AI API error:", response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    console.log("✅ AI response received in", processingTime, "ms");

    // تحديد طول الرد
    let aiResponse = data.completion || "عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.";
    if (aiResponse.length > maxLength) {
      aiResponse = aiResponse.substring(0, maxLength - 3) + "...";
      console.log("✂️ AI response truncated to", maxLength, "characters");
    }

    return {
      success: true,
      response: aiResponse,
      tokensUsed: data.tokensUsed || 0,
      processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Error calling AI:", error);

    return {
      success: false,
      response: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.",
      processingTime,
    };
  }
}

// دالة لجلب إعدادات الذكاء الاصطناعي من قاعدة البيانات
async function getAiSettingsFromDb(type: "consultations" | "inquiries") {
  const settings = await db.query.aiSettings.findFirst({
    where: eq(aiSettings.type, type),
  });

  if (!settings) {
    // Return default settings if not found in DB
    console.warn(`No AI settings found for type: ${type}. Using default values.`);
    return {
      isEnabled: false, // Default to disabled if no settings exist
      systemPrompt: type === "consultations" ? "أنت مساعد ذكي." : "أنت مساعد ذكي.",
      responseDelay: 15,
      maxResponseLength: 1500,
    };
  }

  return settings;
}

// دالة لتسجيل إحصائيات الذكاء الاصطناعي
function logAiStats(
  type: "consultations" | "inquiries",
  success: boolean,
  processingTime: number,
  tokensUsed?: number
) {
  const timestamp = new Date().toISOString();
  console.log(`📊 AI Stats [${timestamp}]:`, {
    type,
    success,
    processingTime: `${processingTime}ms`,
    tokensUsed: tokensUsed || "unknown",
    status: success ? "✅ Success" : "❌ Failed",
  });
}

// الرد التلقائي على الاستشارات
export const autoReplyConsultationProcedure = publicProcedure
  .input(
    z.object({
      consultationId: z.number(),
      petType: z.string(),
      question: z.string(),
      attachments: z.string().optional(),
      userId: z.number(), // The user who created the consultation
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log("Auto-replying to consultation:", input.consultationId);

      const aiSettings = await getAiSettingsFromDb("consultations");

      if (!aiSettings.isEnabled) {
        console.log("AI auto-reply is disabled for consultations");
        return {
          success: false,
          message: "الرد التلقائي معطل حالياً",
        };
      }

      const messages = [
        {
          role: "system",
          content: aiSettings.systemPrompt,
        },
        {
          role: "user",
          content: `نوع الحيوان: ${input.petType}
السؤال: ${input.question}

${input.attachments ? "ملاحظة: تم إرفاق صور/فيديو مع الاستشارة" : ""}

يرجى تقديم رد مفيد ومهني:`,
        },
      ];

      console.log(`⏱️ Waiting ${aiSettings.responseDelay} seconds before AI response...`);
      await new Promise((resolve) => setTimeout(resolve, aiSettings.responseDelay * 1000));

      const aiResult = await callAI(messages, aiSettings.maxResponseLength);

      logAiStats("consultations", aiResult.success, aiResult.processingTime || 0, aiResult.tokensUsed);

      if (!aiResult.success) {
        console.error("❌ AI failed to generate response for consultation:", input.consultationId);
        return {
          success: false,
          message: "فشل في إنتاج الرد التلقائي. سيتم إشعار المشرفين.",
        };
      }

      console.log("✅ AI response generated for consultation:", input.consultationId);
      console.log("📝 Response preview:", aiResult.response.substring(0, 100) + "...");

      // Save the AI-generated reply to the database
      const newReply = await db
        .insert(consultationReplies)
        .values({
          consultationId: input.consultationId,
          userId: input.userId, // Associate with the user who initiated the consultation, or a generic AI user ID
          content: aiResult.response,
          isFromAdmin: false, // AI is not a vet in this context
          isAiGenerated: true,
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        response: newReply[0],
        message: "تم إرسال الرد التلقائي بنجاح",
      };
    } catch (error) {
      console.error("Error in auto-reply consultation:", error);

      if (error instanceof Error) {
        throw new Error(`فشل في الرد التلقائي: ${error.message}`);
      }
      throw new Error("فشل في الرد التلقائي");
    }
  });

// الرد التلقائي على الاستفسارات
export const autoReplyInquiryProcedure = publicProcedure
  .input(
    z.object({
      inquiryId: z.number(),
      title: z.string(),
      content: z.string(),
      category: z.string(),
      attachments: z.string().optional(),
      userId: z.number(), // The user who created the inquiry
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log("Auto-replying to inquiry:", input.inquiryId);

      const aiSettings = await getAiSettingsFromDb("inquiries");

      if (!aiSettings.isEnabled) {
        console.log("AI auto-reply is disabled for inquiries");
        return {
          success: false,
          message: "الرد التلقائي معطل حالياً",
        };
      }

      const messages = [
        {
          role: "system",
          content: aiSettings.systemPrompt,
        },
        {
          role: "user",
          content: `عنوان الاستفسار: ${input.title}
الفئة: ${input.category}
محتوى الاستفسار: ${input.content}

${input.attachments ? "ملاحظة: تم إرفاق مواد مرجعية مع الاستفسار" : ""}

يرجى تقديم رد مهني ودقيق:`,
        },
      ];

      console.log(`⏱️ Waiting ${aiSettings.responseDelay} seconds before AI response...`);
      await new Promise((resolve) => setTimeout(resolve, aiSettings.responseDelay * 1000));

      const aiResult = await callAI(messages, aiSettings.maxResponseLength);

      logAiStats("inquiries", aiResult.success, aiResult.processingTime || 0, aiResult.tokensUsed);

      if (!aiResult.success) {
        console.error("❌ AI failed to generate response for inquiry:", input.inquiryId);
        return {
          success: false,
          message: "فشل في إنتاج الرد التلقائي. سيتم إشعار المشرفين.",
        };
      }

      console.log("✅ AI response generated for inquiry:", input.inquiryId);
      console.log("📝 Response preview:", aiResult.response.substring(0, 100) + "...");

      // Save the AI-generated reply to the database
      const newReply = await db
        .insert(inquiryReplies)
        .values({
          inquiryId: input.inquiryId,
          userId: input.userId, // Associate with the user who initiated the inquiry, or a generic AI user ID
          content: aiResult.response,
          isFromAdmin: false, // AI is not an admin in this context
          isAiGenerated: true,
          createdAt: new Date(),
        })
        .returning();

      return {
        success: true,
        response: newReply[0],
        message: "تم إرسال الرد التلقائي بنجاح",
      };
    } catch (error) {
      console.error("Error in auto-reply inquiry:", error);

      if (error instanceof Error) {
        throw new Error(`فشل في الرد التلقائي: ${error.message}`);
      }
      throw new Error("فشل في الرد التلقائي");
    }
  });

// فحص حالة الذكاء الاصطناعي المحسن
export const checkAiStatusProcedure = publicProcedure
  .input(
    z.object({
      type: z.enum(["consultations", "inquiries"]),
    })
  )
  .query(async ({ input }) => {
    try {
      const aiSettings = await getAiSettingsFromDb(input.type);

      // فحص اتصال API
      const healthCheck = await fetch("https://toolkit.rork.com/text/llm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "test" }],
        }),
      })
        .then((res) => res.ok)
        .catch(() => false);

      return {
        success: true,
        isEnabled: aiSettings.isEnabled,
        responseDelay: aiSettings.responseDelay,
        maxResponseLength: aiSettings.maxResponseLength,
        // priority: aiSettings.priority, // These fields are not in the new schema
        // autoApprove: aiSettings.autoApprove, // These fields are not in the new schema
        apiHealthy: healthCheck,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error checking AI status:", error);

      return {
        success: false,
        isEnabled: false,
        apiHealthy: false,
        message: "فشل في فحص حالة الذكاء الاصطناعي",
      };
    }
  });

// إحصائيات الذكاء الاصطناعي
export const getAiStatsProcedure = publicProcedure
  .input(
    z.object({
      type: z.enum(["consultations", "inquiries"]).optional(),
      timeRange: z.enum(["today", "week", "month"]).default("today"),
    })
  )
  .query(async ({ input }) => {
    try {
      // No mock statistics here. Implement actual database query for stats if needed.
      // For now, return a default empty structure or handle as per requirements.
      console.log("Getting AI stats for:", input.type, " Time range:", input.timeRange);

      // Placeholder for actual stats
      const stats = {
        consultations: {
          totalResponses: 0,
          successRate: 0,
          averageResponseTime: 0,
          totalTokensUsed: 0,
          topCategories: [],
        },
        inquiries: {
          totalResponses: 0,
          successRate: 0,
          averageResponseTime: 0,
          totalTokensUsed: 0,
          topCategories: [],
        },
      };

      return {
        success: true,
        stats: input.type
          ? stats[input.type]
          : { total: 0, consultations: stats.consultations, inquiries: stats.inquiries },
        timeRange: input.timeRange,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting AI stats:", error);

      return {
        success: false,
        message: "فشل في جلب إحصائيات الذكاء الاصطناعي",
      };
    }
  });

// تشغيل اختبار للذكاء الاصطناعي
export const testAiProcedure = publicProcedure
  .input(
    z.object({
      type: z.enum(["consultations", "inquiries"]),
      testPrompt: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const aiSettings = await getAiSettingsFromDb(input.type);

      if (!aiSettings.isEnabled) {
        return {
          success: false,
          message: "الذكاء الاصطناعي معطل حالياً",
        };
      }

      const testPrompt =
        input.testPrompt ||
        (input.type === "consultations"
          ? "قطتي لا تأكل منذ يومين، ما السبب؟"
          : "ما هي أفضل طريقة لتشخيص التهاب المفاصل في الكلاب؟");

      const messages = [
        {
          role: "system",
          content: aiSettings.systemPrompt + "\n\nهذا اختبار للنظام، قدم رداً مختصراً ومفيداً.",
        },
        {
          role: "user",
          content: testPrompt,
        },
      ];

      const aiResult = await callAI(messages, 500); // رد مختصر للاختبار

      return {
        success: aiResult.success,
        testResponse: aiResult.response,
        processingTime: aiResult.processingTime,
        tokensUsed: aiResult.tokensUsed,
        message: aiResult.success ? "تم اختبار الذكاء الاصطناعي بنجاح" : "فشل في اختبار الذكاء الاصطناعي",
      };
    } catch (error) {
      console.error("Error testing AI:", error);

      return {
        success: false,
        message: "فشل في اختبار الذكاء الاصطناعي",
      };
    }
  });
