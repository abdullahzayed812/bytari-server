import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, consultations, consultationResponses, notifications } from "../../../../db";
import { eq } from "drizzle-orm";

const replyConsultationSchema = z.object({
  consultationId: z.number(),
  responderId: z.number(), // المشرف المجيب
  content: z.string().min(1, "يجب إدخال محتوى الرد"),
  attachments: z.string().optional(),
  isFromVet: z.boolean().default(true), // هل الرد من طبيب بيطري
  keepConversationOpen: z.boolean().default(false), // هل يبقى المحادثة مفتوحة للرد
});

export const replyConsultationProcedure = publicProcedure.input(replyConsultationSchema).mutation(async ({ input }) => {
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

    // إضافة الرد
    const [newResponse] = await db
      .insert(consultationResponses)
      .values({
        consultationId: input.consultationId,
        userId: input.responderId,
        content: input.content,
        attachments: input.attachments ? JSON.parse(input.attachments) : null,
        isFromVet: input.isFromVet,
        isAiGenerated: false,
      })
      .returning();

    // تحديث حالة الاستشارة - دائماً "answered" عند الرد
    await db
      .update(consultations)
      .set({
        status: "answered",
        updatedAt: new Date(),
      })
      .where(eq(consultations.id, input.consultationId));

    // إرسال إشعار لصاحب الحيوان
    await db.insert(notifications).values({
      userId: currentConsultation.userId,
      title: "تم الرد على استشارتك",
      message: input.keepConversationOpen
        ? "تم الرد على استشارتك. يمكنك الرد مرة أخرى إذا كان لديك استفسارات إضافية."
        : "تم الرد على استشارتك. تم إغلاق المحادثة.",
      type: "consultation",
      data: JSON.stringify({
        consultationId: input.consultationId,
        responseId: newResponse.id,
        conversationOpen: input.keepConversationOpen,
      }),
    });

    return {
      success: true,
      response: newResponse,
      conversationOpen: input.keepConversationOpen,
      message: "تم إرسال الرد بنجاح",
    };
  } catch (error) {
    console.error("Error replying to consultation:", error);
    throw new Error("Failed to reply to consultation");
  }
});
