import { z } from "zod";
import { publicProcedure, protectedProcedure } from '../../../create-context';
import { db, adminUsers, systemSettings } from '../../../../db';
import { eq } from "drizzle-orm";

// Get subscription settings
export const getSubscriptionSettingsProcedure = protectedProcedure
  .input(z.object({
    adminId: z.number()
  }))
  .query(async ({ input }: { input: { adminId: number } }) => {
    console.log('Getting subscription settings for admin:', input.adminId);
    
    try {
      // Check if admin exists
      const admin = await db.select().from(adminUsers).where(eq(adminUsers.id, input.adminId)).limit(1);
      if (!admin.length) {
        throw new Error('Admin not found');
      }

      // Get subscription settings from system_settings table
      const settings = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, 'premium_subscription_enabled'))
        .limit(1);

      const isEnabled = settings.length > 0 ? settings[0].settingValue === 'true' : false;

      console.log('Subscription settings retrieved:', { isEnabled });
      
      return {
        isEnabled,
        lastUpdated: settings.length > 0 ? settings[0].updatedAt : null
      };
    } catch (error) {
      console.error('Error getting subscription settings:', error);
      throw new Error('Failed to get subscription settings');
    }
  });

// Update subscription settings
export const updateSubscriptionSettingsProcedure = protectedProcedure
  .input(z.object({
    adminId: z.number(),
    isEnabled: z.boolean()
  }))
  .mutation(async ({ input }: { input: { adminId: number; isEnabled: boolean } }) => {
    console.log('Updating subscription settings:', input);
    
    try {
      // Check if admin exists
      const admin = await db.select().from(adminUsers).where(eq(adminUsers.id, input.adminId)).limit(1);
      if (!admin.length) {
        throw new Error('Admin not found');
      }

      // Check if setting exists
      const existingSetting = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, 'premium_subscription_enabled'))
        .limit(1);

      const settingValue = input.isEnabled ? 'true' : 'false';
      const now = new Date();

      if (existingSetting.length > 0) {
        // Update existing setting
        await db.update(systemSettings)
          .set({
            settingValue,
            updatedAt: now
          })
          .where(eq(systemSettings.settingKey, 'premium_subscription_enabled'));
      } else {
        // Create new setting
        await db.insert(systemSettings).values({
          settingKey: 'premium_subscription_enabled',
          settingValue,
          settingDescription: 'Enable or disable premium subscription feature',
          createdAt: now,
          updatedAt: now
        });
      }

      console.log('Subscription settings updated successfully');
      
      return {
        success: true,
        isEnabled: input.isEnabled,
        updatedAt: now
      };
    } catch (error) {
      console.error('Error updating subscription settings:', error);
      throw new Error('Failed to update subscription settings');
    }
  });

// Get subscription status (public endpoint for checking if feature is enabled)
export const getSubscriptionStatusProcedure = publicProcedure
  .query(async () => {
    console.log('Getting public subscription status');
    
    try {
      const settings = await db.select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, 'premium_subscription_enabled'))
        .limit(1);

      const isEnabled = settings.length > 0 ? settings[0].settingValue === 'true' : false;

      console.log('Public subscription status:', { isEnabled });
      
      return {
        isEnabled
      };
    } catch (error) {
      console.error('Error getting public subscription status:', error);
      throw new Error('Failed to get subscription status');
    }
  });