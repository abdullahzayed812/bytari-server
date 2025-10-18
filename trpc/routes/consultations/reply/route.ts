import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, consultations, consultationResponses, notifications } from '../../../../db';
import { eq } from 'drizzle-orm';

const replyConsultationSchema = z.object({
  consultationId: z.number(),
  responderId: z.number(), // المشرف المجيب
  content: z.string().min(1),
  attachments: z.string().optional(),
  keepConversationOpen: z.boolean().default(false), // هل يبقى المحادثة مفتوحة للرد
});

export const replyConsultationProcedure = publicProcedure
  .input(replyConsultationSchema)
  .mutation(async ({ input }: { input: z.infer<typeof replyConsultationSchema> }) => {
    try {
      // التحقق من وجود الاستشارة
      const consultation = await db
        .select()
        .from(consultations)
        .where(eq(consultations.id, input.consultationId))
        .limit(1);

      if (consultation.length === 0) {
        throw new Error('Consultation not found');
      }

      const currentConsultation = consultation[0];

      // التحقق من أن المحادثة مفتوحة للرد
      if (!currentConsultation.isConversationOpen) {
        throw new Error('Conversation is closed for replies');
      }

      // إضافة الرد
      const [newResponse] = await db.insert(consultationResponses).values({
        consultationId: input.consultationId,
        responderId: input.responderId,
        content: input.content,
        attachments: input.attachments,
        isOfficial: true,
        keepConversationOpen: input.keepConversationOpen,
      }).returning();

      // تحديث حالة الاستشارة
      await db
        .update(consultations)
        .set({
          status: 'answered',
          answeredAt: new Date(),
          isConversationOpen: input.keepConversationOpen, // تحديد ما إذا كانت المحادثة ستبقى مفتوحة
          updatedAt: new Date(),
        })
        .where(eq(consultations.id, input.consultationId));

      // إرسال إشعار لصاحب الحيوان
      await db.insert(notifications).values({
        userId: currentConsultation.userId,
        title: 'تم الرد على استشارتك',
        content: input.keepConversationOpen 
          ? 'تم الرد على استشارتك. يمكنك الرد مرة أخرى إذا كان لديك استفسارات إضافية.'
          : 'تم الرد على استشارتك. تم إغلاق المحادثة.',
        type: 'consultation',
        data: JSON.stringify({ 
          consultationId: input.consultationId, 
          responseId: newResponse.id,
          conversationOpen: input.keepConversationOpen 
        }),
      });

      return {
        success: true,
        response: newResponse,
        conversationOpen: input.keepConversationOpen,
      };
    } catch (error) {
      console.error('Error replying to consultation:', error);
      throw new Error('Failed to reply to consultation');
    }
  });