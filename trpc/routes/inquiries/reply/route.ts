import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db, inquiries, inquiryResponses, notifications } from "../../../../db";
import { eq } from "drizzle-orm";

const replyInquirySchema = z.object({
  inquiryId: z.number(),
  responderId: z.number(), // المشرف المجيب
  content: z.string().min(1),
  attachments: z.string().optional(),
  keepConversationOpen: z.boolean().default(false), // هل يبقى المحادثة مفتوحة للرد
});

export const replyInquiryProcedure = publicProcedure
  .input(replyInquirySchema)
  .mutation(async ({ input }: { input: z.infer<typeof replyInquirySchema> }) => {
    try {
      // التحقق من وجود الاستفسار
      const inquiry = await db.select().from(inquiries).where(eq(inquiries.id, input.inquiryId)).limit(1);

      if (inquiry.length === 0) {
        throw new Error("Inquiry not found");
      }

      const currentInquiry = inquiry[0];

      // إضافة الرد
      const [newResponse] = await db
        .insert(inquiryResponses)
        .values({
          inquiryId: input.inquiryId,
          userId: input.responderId,
          content: input.content,
          attachments: input.attachments,
          // isOfficial: true,
          // keepConversationOpen: input.keepConversationOpen,
        })
        .returning();

      // تحديث حالة الاستشارة
      const newStatus = input.keepConversationOpen ? "answered" : "closed";

      // تحديث حالة الاستفسار
      await db
        .update(inquiries)
        .set({
          status: newStatus,
          // answeredAt: new Date(),
          // isConversationOpen: input.keepConversationOpen, // تحديد ما إذا كانت المحادثة ستبقى مفتوحة
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, input.inquiryId));

      // إرسال إشعار للطبيب صاحب الاستفسار
      await db.insert(notifications).values({
        userId: currentInquiry.userId,
        title: "تم الرد على استفسارك",
        message: input.keepConversationOpen
          ? "تم الرد على استفسارك. يمكنك الرد مرة أخرى إذا كان لديك استفسارات إضافية."
          : "تم الرد على استفسارك. تم إغلاق المحادثة.",
        type: "inquiry",
        data: JSON.stringify({
          inquiryId: input.inquiryId,
          responseId: newResponse.id,
          conversationOpen: input.keepConversationOpen,
        }),
      });

      return {
        success: true,
        response: newResponse,
        conversationOpen: input.keepConversationOpen,
      };
    } catch (error) {
      console.error("Error replying to inquiry:", error);
      throw new Error("Failed to reply to inquiry");
    }
  });
