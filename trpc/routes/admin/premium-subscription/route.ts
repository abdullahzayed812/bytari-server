import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../../../create-context';
import { db, premiumSubscriptionSettings } from '../../../../db';
import { eq } from 'drizzle-orm';
import type { AuthenticatedContext } from '../../../create-context';

// Get premium subscription settings (public)
export const getPremiumSubscriptionSettings = publicProcedure
  .query(async () => {
    console.log('Getting premium subscription settings');
    
    try {
      const settings = await db.select().from(premiumSubscriptionSettings).limit(1);
      
      if (settings.length === 0) {
        // Create default settings if none exist
        const defaultFeatures = [
          'خصومات حصرية في المتجر تصل إلى 25%',
          'خصومات على الاستشارات البيطرية',
          'أولوية في الرد على الاستشارات',
          'إشعارات مخصصة للتذكير بالمواعيد',
          'تقارير صحية مفصلة للحيوانات الأليفة',
          'دعم فني مميز على مدار الساعة',
        ];
        
        const [newSettings] = await db.insert(premiumSubscriptionSettings).values({
          isVisible: true,
          title: 'العضوية المميزة',
          description: 'احصل على مزايا حصرية وخصومات مميزة',
          price: 20,
          currency: 'USD',
          period: 'شهر',
          features: JSON.stringify(defaultFeatures),
          updatedBy: 1, // System
        }).returning();
        
        return {
          ...newSettings,
          features: JSON.parse(newSettings.features),
        };
      }
      
      const setting = settings[0];
      return {
        ...setting,
        features: JSON.parse(setting.features),
      };
    } catch (error) {
      console.error('Error getting premium subscription settings:', error);
      throw new Error('Failed to get premium subscription settings');
    }
  });

// Update premium subscription settings (admin only)
export const updatePremiumSubscriptionSettings = protectedProcedure
  .input(z.object({
    isVisible: z.boolean(),
    title: z.string().min(1),
    description: z.string().min(1),
    price: z.number().positive(),
    currency: z.string().min(1),
    period: z.string().min(1),
    features: z.array(z.string()),
  }))
  .mutation(async ({ input, ctx }: { input: { isVisible: boolean; title: string; description: string; price: number; currency: string; period: string; features: string[] }; ctx: AuthenticatedContext }) => {
    console.log('Updating premium subscription settings:', input);
    
    // Check if user is admin (simplified check)
    if (!ctx.user || ctx.user.userType !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }
    
    try {
      const settings = await db.select().from(premiumSubscriptionSettings).limit(1);
      
      if (settings.length === 0) {
        // Create new settings
        const [newSettings] = await db.insert(premiumSubscriptionSettings).values({
          isVisible: input.isVisible,
          title: input.title,
          description: input.description,
          price: input.price,
          currency: input.currency,
          period: input.period,
          features: JSON.stringify(input.features),
          updatedBy: ctx.user.id,
        }).returning();
        
        return {
          ...newSettings,
          features: JSON.parse(newSettings.features),
        };
      } else {
        // Update existing settings
        const [updatedSettings] = await db.update(premiumSubscriptionSettings)
          .set({
            isVisible: input.isVisible,
            title: input.title,
            description: input.description,
            price: input.price,
            currency: input.currency,
            period: input.period,
            features: JSON.stringify(input.features),
            updatedBy: ctx.user.id,
            updatedAt: new Date(),
          })
          .where(eq(premiumSubscriptionSettings.id, settings[0].id))
          .returning();
        
        return {
          ...updatedSettings,
          features: JSON.parse(updatedSettings.features),
        };
      }
    } catch (error) {
      console.error('Error updating premium subscription settings:', error);
      throw new Error('Failed to update premium subscription settings');
    }
  });

// Toggle premium subscription visibility (admin only)
export const togglePremiumSubscriptionVisibility = protectedProcedure
  .input(z.object({
    isVisible: z.boolean(),
  }))
  .mutation(async ({ input, ctx }: { input: { isVisible: boolean }; ctx: AuthenticatedContext }) => {
    console.log('Toggling premium subscription visibility:', input);
    
    // Check if user is admin (simplified check)
    if (!ctx.user || ctx.user.userType !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }
    
    try {
      const settings = await db.select().from(premiumSubscriptionSettings).limit(1);
      
      if (settings.length === 0) {
        throw new Error('Premium subscription settings not found');
      }
      
      const [updatedSettings] = await db.update(premiumSubscriptionSettings)
        .set({
          isVisible: input.isVisible,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(premiumSubscriptionSettings.id, settings[0].id))
        .returning();
      
      return {
        ...updatedSettings,
        features: JSON.parse(updatedSettings.features),
      };
    } catch (error) {
      console.error('Error toggling premium subscription visibility:', error);
      throw new Error('Failed to toggle premium subscription visibility');
    }
  });