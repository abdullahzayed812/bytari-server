import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, consultations, consultationResponses, notifications } from "../../../../db";
import { eq } from "drizzle-orm";

const userReplyConsultationSchema = z.object({
  consultationId: z.number(),
  userId: z.number(), // صاحب الاستشارة الأصلي
  content: z.string().min(1),
  attachments: z.string().optional(),
});

export const userReplyConsultationProcedure = publicProcedure
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
      if (currentConsultation.stauts === "closed") {
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
          // isOfficial: false, // رد من المستخدم وليس من المشرف
          // keepConversationOpen: false, // المستخدم لا يحدد هذا
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

      // إرسال إشعار للمشرف المختص
      if (currentConsultation.moderatorId) {
        await db.insert(notifications).values({
          userId: currentConsultation.moderatorId,
          title: "رد جديد على استشارة",
          message: "تم إضافة رد جديد على استشارة تم تعيينها لك",
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
