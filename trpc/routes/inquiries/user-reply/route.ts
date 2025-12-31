import { z } from "zod";
import { protectedProcedure } from "../../../create-context"; // Changed to protectedProcedure
import { db, inquiries, inquiryResponses, notifications, aiSettings } from "../../../../db"; // Added aiSettings
import { eq } from "drizzle-orm";

const userReplyInquirySchema = z.object({
  inquiryId: z.number(),
  userId: z.number(), // صاحب الاستفسار الأصلي
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
 * 🤖 Function: Trigger Auto-Reply from User Inquiry
 * -----------------------------------------------------*/
async function triggerAutoReplyForUserInquiry(inquiryId: number, originalInquiry: any, userReplyContent: string) {
  try {
    const settings = await db.query.aiSettings.findFirst({
      where: eq(aiSettings.type, "inquiries"),
    });

    if (!settings?.isEnabled) {
      console.log("AI auto-reply is disabled for inquiries");
      return;
    }

    const messages = [
      {
        role: "system",
        content: settings.systemPrompt,
      },
      {
        role: "user",
        content: `تم إرسال استفسار جديد بـ:
عنوان الاستفسار: ${originalInquiry.title}
الفئة: ${originalInquiry.category}
المحتوى الأصلي: ${originalInquiry.content}

المستخدم أرسل الرد التالي: ${userReplyContent}

بناءً على هذا الرد، يرجى تقديم إجابة مهنية مفصلة ومتابعة للاستفسار.
`,
      },
    ];

    await new Promise((resolve) => setTimeout(resolve, (settings.responseDelay || 15) * 1000));

    const aiResult = await callAI(messages, settings.maxResponseLength || 1500);

    if (aiResult.success) {
      await db.insert(inquiryResponses).values({
        inquiryId: inquiryId,
        userId: originalInquiry.userId, // Associate with the original user
        content: aiResult.response,
        isFromAdmin: false,
        isAiGenerated: true,
        createdAt: new Date(),
      });
      // Update inquiry status to "answered"
      await db
        .update(inquiries)
        .set({
          status: "answered",
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, inquiryId));
      console.log("✅ AI auto-reply generated and saved for user inquiry reply:", inquiryId);
    } else {
      console.error("❌ Failed to generate AI auto-reply for user inquiry reply:", inquiryId, aiResult.response);
    }
  } catch (error) {
    console.error("❌ Error in triggerAutoReplyForUserInquiry:", error);
  }
}

export const userReplyInquiryProcedure = protectedProcedure // Changed to protectedProcedure
  .input(userReplyInquirySchema)
  .mutation(async ({ input }: { input: z.infer<typeof userReplyInquirySchema> }) => {
    try {
      // التحقق من وجود الاستفسار
      const inquiry = await db.select().from(inquiries).where(eq(inquiries.id, input.inquiryId)).limit(1);

      if (inquiry.length === 0) {
        throw new Error("Inquiry not found");
      }

      const currentInquiry = inquiry[0];

      // التحقق من أن المستخدم هو صاحب الاستفسار الأصلي
      if (currentInquiry.userId !== input.userId) {
        throw new Error("Unauthorized: You can only reply to your own inquiries");
      }

      // التحقق من أن المحادثة مفتوحة للرد
      if (currentInquiry.status === "closed") {
        throw new Error("المحادثة مغلقة ولا يمكن الرد عليها. تم إغلاق المحادثة من قبل المشرف.");
      }

      // إضافة الرد
      const [newResponse] = await db
        .insert(inquiryResponses)
        .values({
          inquiryId: input.inquiryId,
          userId: input.userId,
          content: input.content,
          attachments: input.attachments,
          isFromAdmin: false, // User reply, not from admin
          isAiGenerated: false, // User reply is not AI generated
          createdAt: new Date(),
        })
        .returning();

      // تحديث حالة الاستفسار إلى "في الانتظار" لأن المستخدم رد
      await db
        .update(inquiries)
        .set({
          status: "pending", // العودة إلى حالة الانتظار لرد المشرف
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, input.inquiryId));

      // Trigger AI auto-reply for the user's reply in the background
      triggerAutoReplyForUserInquiry(input.inquiryId, currentInquiry, input.content).catch((err) =>
        console.error("Background AI auto-reply for user inquiry reply failed:", err)
      );

      // إرسال إشعار للمشرف المختص
      // (This part might need to be adjusted based on who should be notified when a user replies and AI auto-responds)
      // For now, if there's a moderatorId, notify them that the user replied.
      if (currentInquiry.moderatorId) {
        // Assuming inquiry might have a moderatorId
        await db.insert(notifications).values({
          userId: currentInquiry.moderatorId,
          title: "رد جديد على استفسار",
          message: `تم إضافة رد جديد على استفسار رقم ${input.inquiryId} تم تعيينه لك من قبل المستخدم.`,
          type: "inquiry",
          data: JSON.stringify({
            inquiryId: input.inquiryId,
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
      console.error("Error replying to inquiry:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Failed to reply to inquiry");
    }
  });
