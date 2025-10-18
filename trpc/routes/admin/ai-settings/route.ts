import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

const aiSettingsSchema = z.object({
  type: z.enum(['consultations', 'inquiries']),
  isEnabled: z.boolean(),
  systemPrompt: z.string().min(1),
  responseDelay: z.number().min(5).max(300), // 5 seconds to 5 minutes
  maxResponseLength: z.number().min(100).max(2000),
  adminId: z.number(),
});

const getAiSettingsSchema = z.object({
  type: z.enum(['consultations', 'inquiries']).optional(),
});

// إنشاء أو تحديث إعدادات الذكاء الاصطناعي
export const updateAiSettingsProcedure = publicProcedure
  .input(aiSettingsSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('Updating AI settings with input:', input);
      
      // For now, return a mock response
      const mockSettings = {
        id: Date.now(),
        type: input.type,
        isEnabled: input.isEnabled,
        systemPrompt: input.systemPrompt,
        responseDelay: input.responseDelay,
        maxResponseLength: input.maxResponseLength,
        enabledBy: input.adminId,
        updatedBy: input.adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log(`AI settings updated for type: ${input.type}`);

      return {
        success: true,
        settings: mockSettings,
        message: `تم تحديث إعدادات الذكاء الاصطناعي للـ${input.type === 'consultations' ? 'استشارات' : 'استفسارات'} بنجاح`,
      };
    } catch (error) {
      console.error('Error updating AI settings:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في تحديث إعدادات الذكاء الاصطناعي: ${error.message}`);
      }
      throw new Error('فشل في تحديث إعدادات الذكاء الاصطناعي');
    }
  });

// جلب إعدادات الذكاء الاصطناعي
export const getAiSettingsProcedure = publicProcedure
  .input(getAiSettingsSchema)
  .query(async ({ input }) => {
    try {
      console.log('Getting AI settings with input:', input);
      
      // Mock settings data
      const mockSettings = [
        {
          id: 1,
          type: 'consultations',
          isEnabled: true,
          systemPrompt: 'أنت مساعد ذكي متخصص في الاستشارات البيطرية. قدم نصائح مفيدة ومهنية للمستخدمين حول رعاية الحيوانات الأليفة.',
          responseDelay: 30,
          maxResponseLength: 1000,
          enabledBy: 1,
          updatedBy: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          type: 'inquiries',
          isEnabled: true,
          systemPrompt: 'أنت مساعد ذكي متخصص في الرد على استفسارات الأطباء البيطريين. قدم إجابات دقيقة ومهنية.',
          responseDelay: 30,
          maxResponseLength: 1000,
          enabledBy: 1,
          updatedBy: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      let filteredSettings = mockSettings;
      if (input.type) {
        filteredSettings = mockSettings.filter(s => s.type === input.type);
      }
      
      console.log(`Found ${filteredSettings.length} AI settings`);

      return {
        success: true,
        settings: filteredSettings,
      };
    } catch (error) {
      console.error('Error getting AI settings:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في جلب إعدادات الذكاء الاصطناعي: ${error.message}`);
      }
      throw new Error('فشل في جلب إعدادات الذكاء الاصطناعي');
    }
  });

// تفعيل/إيقاف الذكاء الاصطناعي بسرعة
export const toggleAiProcedure = publicProcedure
  .input(z.object({
    type: z.enum(['consultations', 'inquiries']),
    isEnabled: z.boolean(),
    adminId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log('Toggling AI with input:', input);
      
      console.log(`AI ${input.isEnabled ? 'enabled' : 'disabled'} for type: ${input.type}`);

      return {
        success: true,
        message: `تم ${input.isEnabled ? 'تفعيل' : 'إيقاف'} الذكاء الاصطناعي للـ${input.type === 'consultations' ? 'استشارات' : 'استفسارات'} بنجاح`,
      };
    } catch (error) {
      console.error('Error toggling AI:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في تغيير حالة الذكاء الاصطناعي: ${error.message}`);
      }
      throw new Error('فشل في تغيير حالة الذكاء الاصطناعي');
    }
  });