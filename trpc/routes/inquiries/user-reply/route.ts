import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, inquiries, inquiryResponses, notifications, aiSettings } from "../../../../db";
import { eq } from "drizzle-orm";
import { callAI } from "../../../../lib/ai";

const userReplyInquirySchema = z.object({
  inquiryId: z.number(),
  userId: z.number(),
  content: z.string().min(1),
  attachments: z.string().optional(),
});

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
        userId: originalInquiry.userId,
        content: aiResult.response,
        isFromAdmin: false,
        isAiGenerated: true,
        createdAt: new Date(),
      });
      await db
        .update(inquiries)
        .set({
          status: "answered",
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, inquiryId));

      console.log("✅ AI auto-reply generated and saved for user inquiry reply:", inquiryId);

      await db.insert(notifications).values({
        userId: originalInquiry.userId,
        title: "🤖 تم الرد على استفسارك",
        message: `تم الرد على استفسارك رقم ${inquiryId}. يمكنك الاطلاع عليه الآن.`,
        type: "inquiry",
        data: JSON.stringify({
          inquiryId: inquiryId,
        }),
      });
    } else {
      console.error("❌ Failed to generate AI auto-reply for user inquiry reply:", inquiryId, aiResult.response);
    }
  } catch (error) {
    console.error("❌ Error in triggerAutoReplyForUserInquiry:", error);
  }
}

export const userReplyInquiryProcedure = protectedProcedure
  .input(userReplyInquirySchema)
  .mutation(async ({ input }) => {
    try {
      const inquiry = await db.select().from(inquiries).where(eq(inquiries.id, input.inquiryId)).limit(1);

      if (inquiry.length === 0) {
        throw new Error("Inquiry not found");
      }

      const currentInquiry = inquiry[0];

      if (currentInquiry.userId !== input.userId) {
        throw new Error("Unauthorized: You can only reply to your own inquiries");
      }

      if (currentInquiry.status === "closed") {
        throw new Error("المحادثة مغلقة ولا يمكن الرد عليها. تم إغلاق المحادثة من قبل المشرف.");
      }

      const [newResponse] = await db
        .insert(inquiryResponses)
        .values({
          inquiryId: input.inquiryId,
          userId: input.userId,
          content: input.content,
          attachments: input.attachments,
          isFromAdmin: false,
          isAiGenerated: false,
          createdAt: new Date(),
        })
        .returning();

      await db
        .update(inquiries)
        .set({
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, input.inquiryId));

      triggerAutoReplyForUserInquiry(input.inquiryId, currentInquiry, input.content).catch((err) =>
        console.error("Background AI auto-reply for user inquiry reply failed:", err)
      );

      if (currentInquiry.moderatorId) {
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
