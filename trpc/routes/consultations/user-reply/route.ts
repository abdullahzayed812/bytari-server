import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db, consultations, consultationResponses, notifications, aiSettings } from "../../../../db";
import { eq } from "drizzle-orm";
import { callAI } from "../../../../lib/ai";

const userReplyConsultationSchema = z.object({
  consultationId: z.number(),
  userId: z.number(),
  content: z.string().min(1),
  attachments: z.string().optional(),
});

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
        userId: originalConsultation.userId,
        content: aiResult.response,
        isFromVet: false,
        isAiGenerated: true,
        createdAt: new Date(),
      });
      await db
        .update(consultations)
        .set({
          status: "answered",
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, consultationId));
      console.log("✅ AI auto-reply generated and saved for user consultation reply:", consultationId);

      await db.insert(notifications).values({
        userId: originalConsultation.userId,
        title: "🤖 تم الرد على استشارتك",
        message: `تمت إضافة رد على استشارتك رقم ${consultationId}. يمكنك الاطلاع عليه الآن.`,
        type: "consultation",
        data: JSON.stringify({
          consultationId: consultationId,
        }),
      });
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

export const userReplyConsultationProcedure = protectedProcedure
  .input(userReplyConsultationSchema)
  .mutation(async ({ input }) => {
    try {
      const consultation = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, input.consultationId))
        .limit(1);

      if (consultation.length === 0) {
        throw new Error("Consultation not found");
      }

      const currentConsultation = consultation[0];

      if (currentConsultation.userId !== input.userId) {
        throw new Error("Unauthorized: You can only reply to your own consultations");
      }

      if (currentConsultation.status === "closed") {
        throw new Error("المحادثة مغلقة ولا يمكن الرد عليها. تم إغلاق المحادثة من قبل المشرف.");
      }

      const [newResponse] = await db
        .insert(consultationResponses)
        .values({
          consultationId: input.consultationId,
          userId: input.userId,
          content: input.content,
          attachments: input.attachments,
          isFromVet: false,
          isAiGenerated: false,
          createdAt: new Date(),
        })
        .returning();

      await db
        .update(consultations)
        .set({
          status: "pending",
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, input.consultationId));

      triggerAutoReplyForUserConsultation(input.consultationId, currentConsultation, input.content).catch((err) =>
        console.error("Background AI auto-reply for user consultation reply failed:", err)
      );

      if (currentConsultation?.moderatorId) {
        await db.insert(notifications).values({
          userId: currentConsultation?.moderatorId,
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
