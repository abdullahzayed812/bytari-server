import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

const createInquirySchema = z.object({
  userId: z.number(),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  attachments: z.string().optional(),
});

export const createInquiryProcedure = publicProcedure
  .input(createInquirySchema)
  .mutation(async ({ input }) => {
    try {
      console.log('✅ Creating inquiry with input:', input);
      
      const mockInquiry = {
        id: Date.now(),
        userId: input.userId,
        title: input.title,
        content: input.content,
        category: input.category,
        priority: input.priority,
        attachments: input.attachments,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      
      console.log('✅ Mock inquiry created successfully:', mockInquiry);

      // تشغيل الرد التلقائي بالذكاء الاصطناعي في الخلفية
      setTimeout(async () => {
        try {
          console.log('🤖 Triggering AI auto-reply for inquiry:', mockInquiry.id);
          
          // استدعاء API الذكاء الاصطناعي مباشرة
          const aiResponse = await fetch('https://toolkit.rork.com/text/llm/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'system',
                  content: 'أنت مساعد ذكي متخصص في الرد على استفسارات الأطباء البيطريين والطلاب. قدم إجابات دقيقة ومهنية وعلمية حول الطب البيطري والممارسات المهنية. اجعل ردك مفيداً وعلمياً للطبيب البيطري أو الطالب.',
                },
                {
                  role: 'user',
                  content: `عنوان الاستفسار: ${input.title}\nالفئة: ${input.category}\nمحتوى الاستفسار: ${input.content}\n\nيرجى تقديم رد مهني ودقيق:`,
                },
              ],
            }),
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiReply = aiData.completion || 'عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.';
            
            console.log('✅ AI auto-reply generated for inquiry:', mockInquiry.id);
            console.log('🤖 AI Reply Preview:', aiReply.substring(0, 150) + '...');
            console.log('📝 Full AI Reply:', aiReply);
            
            // إشعار للمستخدم بوصول الرد (بدون ذكر الذكاء الاصطناعي)
            console.log('📱 User Notification: تم الرد على استفسارك');
            // إشعار للأدمن فقط بأن الرد من الذكاء الاصطناعي
            console.log('🤖 Admin Log: تم الرد على الاستفسار رقم', mockInquiry.id, 'من قبل الذكاء الاصطناعي');
            
          } else {
            console.log('⚠️ AI auto-reply API failed for inquiry:', mockInquiry.id);
          }
        } catch (error) {
          console.error('❌ Error in AI auto-reply for inquiry:', error);
        }
      }, 5000); // تأخير 5 ثواني قبل الرد التلقائي

      return {
        success: true,
        inquiry: mockInquiry,
        message: 'تم إرسال الاستفسار بنجاح. سيتم الرد عليه قريباً.',
      };
    } catch (error) {
      console.error('❌ Error creating inquiry:', error);
      throw new Error('فشل في إرسال الاستفسار. يرجى المحاولة مرة أخرى.');
    }
  });