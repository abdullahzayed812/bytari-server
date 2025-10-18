import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, inquiries, inquiryResponses, notifications } from '../../../../db';
import { eq } from 'drizzle-orm';

const userReplyInquirySchema = z.object({
  inquiryId: z.number(),
  userId: z.number(), // صاحب الاستفسار الأصلي
  content: z.string().min(1),
  attachments: z.string().optional(),
});

export const userReplyInquiryProcedure = publicProcedure
  .input(userReplyInquirySchema)
  .mutation(async ({ input }: { input: z.infer<typeof userReplyInquirySchema> }) => {
    try {
      // التحقق من وجود الاستفسار
      const inquiry = await db
        .select()
        .from(inquiries)
        .where(eq(inquiries.id, input.inquiryId))
        .limit(1);

      if (inquiry.length === 0) {
        throw new Error('Inquiry not found');
      }

      const currentInquiry = inquiry[0];

      // التحقق من أن المستخدم هو صاحب الاستفسار الأصلي
      if (currentInquiry.userId !== input.userId) {
        throw new Error('Unauthorized: You can only reply to your own inquiries');
      }

      // التحقق من أن المحادثة مفتوحة للرد
      if (!currentInquiry.isConversationOpen) {
        throw new Error('المحادثة مغلقة ولا يمكن الرد عليها. تم إغلاق المحادثة من قبل المشرف.');
      }

      // إضافة الرد
      const [newResponse] = await db.insert(inquiryResponses).values({
        inquiryId: input.inquiryId,
        responderId: input.userId,
        content: input.content,
        attachments: input.attachments,
        isOfficial: false, // رد من المستخدم وليس من المشرف
        keepConversationOpen: false, // المستخدم لا يحدد هذا
      }).returning();

      // تحديث حالة الاستفسار إلى "في الانتظار" لأن المستخدم رد
      await db
        .update(inquiries)
        .set({
          status: 'pending', // العودة إلى حالة الانتظار لرد المشرف
          updatedAt: new Date(),
        })
        .where(eq(inquiries.id, input.inquiryId));

      // إرسال إشعار للمشرف المختص
      if (currentInquiry.moderatorId) {
        await db.insert(notifications).values({
          userId: currentInquiry.moderatorId,
          title: 'رد جديد على استفسار',
          content: 'تم إضافة رد جديد على استفسار تم تعيينه لك',
          type: 'inquiry',
          data: JSON.stringify({ 
            inquiryId: input.inquiryId, 
            responseId: newResponse.id,
            isUserReply: true
          }),
        });
      }

      return {
        success: true,
        response: newResponse,
      };
    } catch (error) {
      console.error('Error replying to inquiry:', error);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Failed to reply to inquiry');
    }
  });