import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

// دالة محسنة لإرسال طلب للذكاء الاصطناعي
async function callAI(messages: any[], maxLength: number = 1500): Promise<{
  success: boolean;
  response: string;
  tokensUsed?: number;
  processingTime?: number;
}> {
  const startTime = Date.now();
  
  try {
    console.log('🤖 Calling AI with messages:', messages.length);
    
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      console.error('❌ AI API error:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    
    console.log('✅ AI response received in', processingTime, 'ms');
    
    // تحديد طول الرد
    let aiResponse = data.completion || 'عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.';
    if (aiResponse.length > maxLength) {
      aiResponse = aiResponse.substring(0, maxLength - 3) + '...';
      console.log('✂️ AI response truncated to', maxLength, 'characters');
    }
    
    return {
      success: true,
      response: aiResponse,
      tokensUsed: data.tokensUsed || 0,
      processingTime,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error calling AI:', error);
    
    return {
      success: false,
      response: 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.',
      processingTime,
    };
  }
}

// دالة محسنة للحصول على إعدادات الذكاء الاصطناعي
function getAiSettings(type: 'consultations' | 'inquiries') {
  const settings = {
    consultations: {
      isEnabled: true, // مفعل افتراضياً
      systemPrompt: `أنت طبيب بيطري خبير ومساعد ذكي متخصص في الاستشارات البيطرية. قدم نصائح طبية مفيدة ومهنية ودقيقة للمستخدمين حول رعاية الحيوانات الأليفة وعلاج الأمراض.
      
      إرشادات مهمة:
      - قدم نصائح عملية ومفيدة بناءً على خبرتك الطبية
      - اشرح الأعراض والأسباب المحتملة بوضوح
      - قدم خطوات العلاج والرعاية المنزلية عند الإمكان
      - انصح بزيارة الطبيب البيطري فوراً في الحالات الطارئة
      - استخدم لغة عربية واضحة ومفهومة للجميع
      - كن مهذباً ومتفهماً ومطمئناً
      - اذكر علامات الخطر التي تستدعي التدخل الطبي العاجل
      - ابدأ ردك بـ "شكراً لك على استشارتك" وانته بـ "أتمنى الشفاء العاجل لحيوانك الأليف"
      
      اجعل ردك شاملاً وعملياً ومطمئناً لصاحب الحيوان.`,
      responseDelay: 8, // تقليل وقت التأخير أكثر
      maxResponseLength: 1800, // زيادة طول الرد
      priority: 'high', // أولوية عالية للاستشارات
      autoApprove: true, // موافقة تلقائية على الردود
    },
    inquiries: {
      isEnabled: true, // مفعل افتراضياً
      systemPrompt: `أنت مساعد ذكي متخصص في الرد على استفسارات الأطباء البيطريين والطلاب. قدم إجابات دقيقة ومهنية وعلمية حول الطب البيطري والممارسات المهنية.
      
      إرشادات مهمة:
      - قدم معلومات علمية دقيقة ومحدثة
      - استخدم المصطلحات الطبية المناسبة مع الشرح
      - اذكر المراجع العلمية والدراسات عند الإمكان
      - قدم بروتوكولات العلاج والتشخيص المعتمدة
      - اشرح الآليات البيولوجية والفسيولوجية
      - كن محدداً وواضحاً في الإجابة العلمية
      - استخدم لغة عربية مهنية وعلمية
      - قدم نصائح عملية للممارسة المهنية
      - ابدأ ردك بـ "شكراً لاستفسارك المهني" وانته بـ "أتمنى أن تكون الإجابة مفيدة لممارستك المهنية"
      
      اجعل ردك مفيداً وعلمياً للطبيب البيطري أو الطالب.`,
      responseDelay: 8, // تقليل وقت التأخير أكثر
      maxResponseLength: 1800, // زيادة طول الرد
      priority: 'normal', // أولوية عادية للاستفسارات
      autoApprove: true, // موافقة تلقائية على الردود
    },
  };
  
  return settings[type];
}

// دالة لتسجيل إحصائيات الذكاء الاصطناعي
function logAiStats(type: 'consultations' | 'inquiries', success: boolean, processingTime: number, tokensUsed?: number) {
  const timestamp = new Date().toISOString();
  console.log(`📊 AI Stats [${timestamp}]:`, {
    type,
    success,
    processingTime: `${processingTime}ms`,
    tokensUsed: tokensUsed || 'unknown',
    status: success ? '✅ Success' : '❌ Failed'
  });
}

// الرد التلقائي على الاستشارات
export const autoReplyConsultationProcedure = publicProcedure
  .input(z.object({
    consultationId: z.number(),
    petType: z.string(),
    question: z.string(),
    attachments: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log('Auto-replying to consultation:', input.consultationId);
      
      const aiSettings = getAiSettings('consultations');
      
      if (!aiSettings.isEnabled) {
        console.log('AI auto-reply is disabled for consultations');
        return {
          success: false,
          message: 'الرد التلقائي معطل حالياً',
        };
      }

      // إنشاء رسائل للذكاء الاصطناعي بتنسيق محسن
      const messages = [
        {
          role: 'system',
          content: aiSettings.systemPrompt,
        },
        {
          role: 'user',
          content: `نوع الحيوان: ${input.petType}
السؤال: ${input.question}

${input.attachments ? 'ملاحظة: تم إرفاق صور/فيديو مع الاستشارة' : ''}

يرجى تقديم رد مفيد ومهني:`,
        },
      ];

      // تأخير الرد حسب الإعدادات
      console.log(`⏱️ Waiting ${aiSettings.responseDelay} seconds before AI response...`);
      await new Promise(resolve => setTimeout(resolve, aiSettings.responseDelay * 1000));

      // استدعاء الذكاء الاصطناعي
      const aiResult = await callAI(messages, aiSettings.maxResponseLength);
      
      // تسجيل الإحصائيات
      logAiStats('consultations', aiResult.success, aiResult.processingTime || 0, aiResult.tokensUsed);

      if (!aiResult.success) {
        console.error('❌ AI failed to generate response for consultation:', input.consultationId);
        return {
          success: false,
          message: 'فشل في إنتاج الرد التلقائي. سيتم إشعار المشرفين.',
        };
      }

      console.log('✅ AI response generated for consultation:', input.consultationId);
      console.log('📝 Response preview:', aiResult.response.substring(0, 100) + '...');

      // هنا يمكن حفظ الرد في قاعدة البيانات
      const mockResponse = {
        id: Date.now(),
        consultationId: input.consultationId,
        content: aiResult.response,
        isOfficial: true,
        isAiGenerated: true, // تمييز الردود المولدة بالذكاء الاصطناعي
        responderId: 0, // AI system user
        aiStats: {
          processingTime: aiResult.processingTime,
          tokensUsed: aiResult.tokensUsed,
          model: 'gpt-4',
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      };

      return {
        success: true,
        response: mockResponse,
        message: 'تم إرسال الرد التلقائي بنجاح',
      };
    } catch (error) {
      console.error('Error in auto-reply consultation:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في الرد التلقائي: ${error.message}`);
      }
      throw new Error('فشل في الرد التلقائي');
    }
  });

// الرد التلقائي على الاستفسارات
export const autoReplyInquiryProcedure = publicProcedure
  .input(z.object({
    inquiryId: z.number(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    attachments: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log('Auto-replying to inquiry:', input.inquiryId);
      
      const aiSettings = getAiSettings('inquiries');
      
      if (!aiSettings.isEnabled) {
        console.log('AI auto-reply is disabled for inquiries');
        return {
          success: false,
          message: 'الرد التلقائي معطل حالياً',
        };
      }

      // إنشاء رسائل للذكاء الاصطناعي بتنسيق محسن
      const messages = [
        {
          role: 'system',
          content: aiSettings.systemPrompt,
        },
        {
          role: 'user',
          content: `عنوان الاستفسار: ${input.title}
الفئة: ${input.category}
محتوى الاستفسار: ${input.content}

${input.attachments ? 'ملاحظة: تم إرفاق مواد مرجعية مع الاستفسار' : ''}

يرجى تقديم رد مهني ودقيق:`,
        },
      ];

      // تأخير الرد حسب الإعدادات
      console.log(`⏱️ Waiting ${aiSettings.responseDelay} seconds before AI response...`);
      await new Promise(resolve => setTimeout(resolve, aiSettings.responseDelay * 1000));

      // استدعاء الذكاء الاصطناعي
      const aiResult = await callAI(messages, aiSettings.maxResponseLength);
      
      // تسجيل الإحصائيات
      logAiStats('inquiries', aiResult.success, aiResult.processingTime || 0, aiResult.tokensUsed);

      if (!aiResult.success) {
        console.error('❌ AI failed to generate response for inquiry:', input.inquiryId);
        return {
          success: false,
          message: 'فشل في إنتاج الرد التلقائي. سيتم إشعار المشرفين.',
        };
      }

      console.log('✅ AI response generated for inquiry:', input.inquiryId);
      console.log('📝 Response preview:', aiResult.response.substring(0, 100) + '...');

      // هنا يمكن حفظ الرد في قاعدة البيانات
      const mockResponse = {
        id: Date.now(),
        inquiryId: input.inquiryId,
        content: aiResult.response,
        isOfficial: true,
        isAiGenerated: true, // تمييز الردود المولدة بالذكاء الاصطناعي
        responderId: 0, // AI system user
        aiStats: {
          processingTime: aiResult.processingTime,
          tokensUsed: aiResult.tokensUsed,
          model: 'gpt-4',
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      };

      return {
        success: true,
        response: mockResponse,
        message: 'تم إرسال الرد التلقائي بنجاح',
      };
    } catch (error) {
      console.error('Error in auto-reply inquiry:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في الرد التلقائي: ${error.message}`);
      }
      throw new Error('فشل في الرد التلقائي');
    }
  });

// فحص حالة الذكاء الاصطناعي المحسن
export const checkAiStatusProcedure = publicProcedure
  .input(z.object({
    type: z.enum(['consultations', 'inquiries']),
  }))
  .query(async ({ input }) => {
    try {
      const aiSettings = getAiSettings(input.type);
      
      // فحص اتصال API
      const healthCheck = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }]
        })
      }).then(res => res.ok).catch(() => false);
      
      return {
        success: true,
        isEnabled: aiSettings.isEnabled,
        responseDelay: aiSettings.responseDelay,
        maxResponseLength: aiSettings.maxResponseLength,
        priority: aiSettings.priority,
        autoApprove: aiSettings.autoApprove,
        apiHealthy: healthCheck,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error checking AI status:', error);
      
      return {
        success: false,
        isEnabled: false,
        apiHealthy: false,
        message: 'فشل في فحص حالة الذكاء الاصطناعي',
      };
    }
  });

// إحصائيات الذكاء الاصطناعي
export const getAiStatsProcedure = publicProcedure
  .input(z.object({
    type: z.enum(['consultations', 'inquiries']).optional(),
    timeRange: z.enum(['today', 'week', 'month']).default('today'),
  }))
  .query(async ({ input }) => {
    try {
      // Mock statistics - في التطبيق الحقيقي يجب جلبها من قاعدة البيانات
      const mockStats = {
        consultations: {
          totalResponses: 45,
          successRate: 98.5,
          averageResponseTime: 12.3,
          totalTokensUsed: 15420,
          topCategories: ['أمراض', 'تغذية', 'سلوك'],
        },
        inquiries: {
          totalResponses: 28,
          successRate: 96.8,
          averageResponseTime: 15.7,
          totalTokensUsed: 9850,
          topCategories: ['جراحة', 'تشخيص', 'أدوية'],
        },
      };
      
      const stats = input.type ? mockStats[input.type] : {
        total: mockStats.consultations.totalResponses + mockStats.inquiries.totalResponses,
        consultations: mockStats.consultations,
        inquiries: mockStats.inquiries,
      };
      
      return {
        success: true,
        stats,
        timeRange: input.timeRange,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting AI stats:', error);
      
      return {
        success: false,
        message: 'فشل في جلب إحصائيات الذكاء الاصطناعي',
      };
    }
  });

// تشغيل اختبار للذكاء الاصطناعي
export const testAiProcedure = publicProcedure
  .input(z.object({
    type: z.enum(['consultations', 'inquiries']),
    testPrompt: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      const aiSettings = getAiSettings(input.type);
      
      if (!aiSettings.isEnabled) {
        return {
          success: false,
          message: 'الذكاء الاصطناعي معطل حالياً',
        };
      }
      
      const testPrompt = input.testPrompt || (input.type === 'consultations' 
        ? 'قطتي لا تأكل منذ يومين، ما السبب؟'
        : 'ما هي أفضل طريقة لتشخيص التهاب المفاصل في الكلاب؟');
      
      const messages = [
        {
          role: 'system',
          content: aiSettings.systemPrompt + '\n\nهذا اختبار للنظام، قدم رداً مختصراً ومفيداً.',
        },
        {
          role: 'user',
          content: testPrompt,
        },
      ];
      
      const aiResult = await callAI(messages, 500); // رد مختصر للاختبار
      
      return {
        success: aiResult.success,
        testResponse: aiResult.response,
        processingTime: aiResult.processingTime,
        tokensUsed: aiResult.tokensUsed,
        message: aiResult.success ? 'تم اختبار الذكاء الاصطناعي بنجاح' : 'فشل في اختبار الذكاء الاصطناعي',
      };
    } catch (error) {
      console.error('Error testing AI:', error);
      
      return {
        success: false,
        message: 'فشل في اختبار الذكاء الاصطناعي',
      };
    }
  });