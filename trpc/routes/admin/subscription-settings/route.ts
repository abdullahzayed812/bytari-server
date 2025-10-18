import { z } from 'zod';
import { publicProcedure } from '../../../create-context';

const subscriptionSettingsSchema = z.object({
  isVisible: z.boolean(),
  price: z.number().min(0),
  currency: z.string().default('USD'),
  features: z.array(z.string()).optional(),
  adminId: z.number(),
});

const getSubscriptionSettingsSchema = z.object({
  adminId: z.number().optional(),
});

// تحديث إعدادات الاشتراك المميز
export const updateSubscriptionSettingsProcedure = publicProcedure
  .input(subscriptionSettingsSchema)
  .mutation(async ({ input }) => {
    try {
      console.log('Updating subscription settings with input:', input);
      
      // For now, return a mock response
      const mockSettings = {
        id: Date.now(),
        isVisible: input.isVisible,
        price: input.price,
        currency: input.currency,
        features: input.features || [
          'عرض المذخر في التطبيق',
          'إضافة المنتجات',
          'إدارة المخزون'
        ],
        updatedBy: input.adminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Subscription settings updated successfully');

      return {
        success: true,
        settings: mockSettings,
        message: 'تم تحديث إعدادات الاشتراك المميز بنجاح',
      };
    } catch (error) {
      console.error('Error updating subscription settings:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في تحديث إعدادات الاشتراك المميز: ${error.message}`);
      }
      throw new Error('فشل في تحديث إعدادات الاشتراك المميز');
    }
  });

// جلب إعدادات الاشتراك المميز
export const getSubscriptionSettingsProcedure = publicProcedure
  .input(getSubscriptionSettingsSchema)
  .query(async ({ input }) => {
    try {
      console.log('Getting subscription settings with input:', input);
      
      // Mock settings data
      const mockSettings = {
        id: 1,
        isVisible: true,
        price: 20,
        currency: 'USD',
        features: [
          'عرض المذخر في التطبيق',
          'إضافة المنتجات',
          'إدارة المخزون',
          'سيتم تفعيل المذخر بعد الموافقة على الطلب ودفع',
          'إدارة المخزون'
        ],
        updatedBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Found subscription settings');

      return {
        success: true,
        settings: mockSettings,
      };
    } catch (error) {
      console.error('Error getting subscription settings:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في جلب إعدادات الاشتراك المميز: ${error.message}`);
      }
      throw new Error('فشل في جلب إعدادات الاشتراك المميز');
    }
  });

// تفعيل/إخفاء الاشتراك المميز بسرعة
export const toggleSubscriptionVisibilityProcedure = publicProcedure
  .input(z.object({
    isVisible: z.boolean(),
    adminId: z.number(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log('Toggling subscription visibility with input:', input);
      
      console.log(`Subscription ${input.isVisible ? 'shown' : 'hidden'}`);

      return {
        success: true,
        message: `تم ${input.isVisible ? 'إظهار' : 'إخفاء'} الاشتراك المميز بنجاح`,
      };
    } catch (error) {
      console.error('Error toggling subscription visibility:', error);
      
      if (error instanceof Error) {
        throw new Error(`فشل في تغيير حالة الاشتراك المميز: ${error.message}`);
      }
      throw new Error('فشل في تغيير حالة الاشتراك المميز');
    }
  });