import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

const createConsultationSchema = z.object({
  userId: z.number(),
  petType: z.string().min(1),
  question: z.string().min(1),
  attachments: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

export const createConsultationProcedure = publicProcedure
  .input(createConsultationSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('✅ Creating consultation with input:', input);
      
      const mockConsultation = {
        id: Date.now(),
        userId: input.userId,
        petType: input.petType,
        question: input.question,
        attachments: input.attachments,
        priority: input.priority,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      
      console.log('✅ Mock consultation created successfully:', mockConsultation);

      // تشغيل الرد التلقائي بالذكاء الاصطناعي في الخلفية
      setTimeout(async () => {
        try {
          console.log('🤖 Triggering AI auto-reply for consultation:', mockConsultation.id);
          
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
                  content: 'أنت طبيب بيطري خبير ومساعد ذكي متخصص في الاستشارات البيطرية. قدم نصائح طبية مفيدة ومهنية ودقيقة للمستخدمين حول رعاية الحيوانات الأليفة وعلاج الأمراض. اجعل ردك شاملاً وعملياً ومطمئناً لصاحب الحيوان.',
                },
                {
                  role: 'user',
                  content: `نوع الحيوان: ${input.petType}\nالسؤال: ${input.question}\n\nيرجى تقديم رد مفيد ومهني:`,
                },
              ],
            }),
          });
          
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const aiReply = aiData.completion || 'عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.';
            
            console.log('✅ AI auto-reply generated for consultation:', mockConsultation.id);
            console.log('🤖 AI Reply Preview:', aiReply.substring(0, 150) + '...');
            console.log('📝 Full AI Reply:', aiReply);
            
            // إشعار للمستخدم بوصول الرد (بدون ذكر الذكاء الاصطناعي)
            console.log('📱 User Notification: تم الرد على استشارتك');
            // إشعار للأدمن فقط بأن الرد من الذكاء الاصطناعي
            console.log('🤖 Admin Log: تم الرد على الاستشارة رقم', mockConsultation.id, 'من قبل الذكاء الاصطناعي');
            
          } else {
            console.log('⚠️ AI auto-reply API failed for consultation:', mockConsultation.id);
          }
        } catch (error) {
          console.error('❌ Error in AI auto-reply for consultation:', error);
        }
      }, 5000); // تأخير 5 ثواني قبل الرد التلقائي

      return {
        success: true,
        consultation: mockConsultation,
        message: 'تم إرسال الاستشارة بنجاح. سيتم الرد عليها قريباً.',
      };
    } catch (error) {
      console.error('❌ Error creating consultation:', error);
      throw new Error('فشل في إرسال الاستشارة. يرجى المحاولة مرة أخرى.');
    }
  });