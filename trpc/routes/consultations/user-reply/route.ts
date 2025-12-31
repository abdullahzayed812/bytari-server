import { z } from "zod";
import { protectedProcedure } from "../../../create-context"; // Changed to protectedProcedure assuming user must be logged in
import { db, consultations, consultationResponses, notifications, aiSettings } from "../../../../db"; // Added aiSettings
import { eq } from "drizzle-orm";

const userReplyConsultationSchema = z.object({
  consultationId: z.number(),
  userId: z.number(), // صاحب الاستشارة الأصلي
  content: z.string().min(1),
  attachments: z.string().optional(),
});

/* -------------------------------------------------------
 * 🤖 Helper Function: Call External AI API (duplicated)
 * -----------------------------------------------------*/
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
    const response = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      console.error("❌ AI API error:", response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    let aiResponse = data.completion || "عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.";
    if (aiResponse.length > maxLength) {
      aiResponse = aiResponse.substring(0, maxLength - 3) + "...";
    }
    return { success: true, response: aiResponse, tokensUsed: data.tokensUsed || 0, processingTime };
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

/* -------------------------------------------------------
 * 🤖 Function: Trigger Auto-Reply from User Consultation
 * -----------------------------------------------------*/
async function triggerAutoReplyForUserConsultation(
  consultationId: number,
  originalConsultation: any,
  userReplyContent: string
) {
  try {
    const settings = await db.query.aiSettings.findFirst({
      where: eq(aiSettings.type, "consultations"),
    });

    if (!settings?.isEnabled) {
      console.log("AI auto-reply is disabled for consultations");
      return;
    }

    const messages = [
      {
        role: "system",
        content: settings.systemPrompt,
      },
      {
        role: "user",
        content: `تم إرسال استشارة جديدة بـ:
نوع الحيوان: ${originalConsultation.category}
السؤال الأصلي: ${originalConsultation.description}

المستخدم أرسل الرد التالي: ${userReplyContent}

بناءً على هذا الرد، يرجى تقديم إجابة مهنية مفصلة ومتابعة للاستشارة.
`,
      },
    ];

    await new Promise((resolve) => setTimeout(resolve, (settings.responseDelay || 15) * 1000));

    const aiResult = await callAI(messages, settings.maxResponseLength || 1500);

    if (aiResult.success) {
      await db.insert(consultationResponses).values({
        consultationId: consultationId,
        userId: originalConsultation.userId, // Associate with the original user
        content: aiResult.response,
        isFromVet: false,
        isAiGenerated: true,
        createdAt: new Date(),
      });
      // Update consultation status to "answered"
      await db
        .update(consultations)
        .set({
          status: "answered",
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, consultationId));
      console.log("✅ AI auto-reply generated and saved for user consultation reply:", consultationId);
    } else {
      console.error(
        "❌ Failed to generate AI auto-reply for user consultation reply:",
        consultationId,
        aiResult.response
      );
    }
  } catch (error) {
    console.error("❌ Error in triggerAutoReplyForUserConsultation:", error);
  }
}

export const userReplyConsultationProcedure = protectedProcedure // Changed to protectedProcedure
  .input(userReplyConsultationSchema)
  .mutation(async ({ input }: { input: z.infer<typeof userReplyConsultationSchema> }) => {
    try {
      // التحقق من وجود الاستشارة
      const consultation = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, input.consultationId))
        .limit(1);

      if (consultation.length === 0) {
        throw new Error("Consultation not found");
      }

      const currentConsultation = consultation[0];

      // التحقق من أن المستخدم هو صاحب الاستشارة الأصلي
      if (currentConsultation.userId !== input.userId) {
        throw new Error("Unauthorized: You can only reply to your own consultations");
      }

      // التحقق من أن المحادثة مفتوحة للرد
      if (currentConsultation.status === "closed") {
        // Fixed typo stauts -> status
        throw new Error("المحادثة مغلقة ولا يمكن الرد عليها. تم إغلاق المحادثة من قبل المشرف.");
      }

      // إضافة الرد
      const [newResponse] = await db
        .insert(consultationResponses)
        .values({
          consultationId: input.consultationId,
          userId: input.userId,
          content: input.content,
          attachments: input.attachments,
          isFromVet: false, // User reply, not from vet/admin
          isAiGenerated: false, // User reply is not AI generated
          createdAt: new Date(),
        })
        .returning();

      // تحديث حالة الاستشارة إلى "في الانتظار" لأن المستخدم رد
      await db
        .update(consultations)
        .set({
          status: "pending", // العودة إلى حالة الانتظار لرد المشرف
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, input.consultationId));

      // Trigger AI auto-reply for the user's reply in the background
      triggerAutoReplyForUserConsultation(input.consultationId, currentConsultation, input.content).catch((err) =>
        console.error("Background AI auto-reply for user consultation reply failed:", err)
      );

      // إرسال إشعار للمشرف المختص
      // (This part might need to be adjusted based on who should be notified when a user replies and AI auto-responds)
      // For now, if there's a moderatorId, notify them that the user replied.
      if (currentConsultation.moderatorId) {
        // Assuming consultation might have a moderatorId
        await db.insert(notifications).values({
          userId: currentConsultation.moderatorId,
          title: "رد جديد على استشارة",
          message: `تم إضافة رد جديد على استشارة رقم ${input.consultationId} تم تعيينها لك من قبل المستخدم.`,
          type: "consultation",
          data: JSON.stringify({
            consultationId: input.consultationId,
            responseId: newResponse.id,
            isUserReply: true,
          }),
        });
      }

      return {
        success: true,
        response: newResponse,
      };
    } catch (error) {
      console.error("Error replying to consultation:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Failed to reply to consultation");
    }
  });
