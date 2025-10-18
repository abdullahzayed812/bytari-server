import { db } from './index';
import { premiumSubscriptionSettings } from './schema';

async function addPremiumSubscriptionSettingsTable() {
  console.log('Adding premium subscription settings table...');
  
  try {
    // Create default premium subscription settings
    const defaultFeatures = [
      'خصومات حصرية في المتجر تصل إلى 25%',
      'خصومات على الاستشارات البيطرية',
      'أولوية في الرد على الاستشارات',
      'إشعارات مخصصة للتذكير بالمواعيد',
      'تقارير صحية مفصلة للحيوانات الأليفة',
      'دعم فني مميز على مدار الساعة',
    ];
    
    await db.insert(premiumSubscriptionSettings).values({
      isVisible: true,
      title: 'العضوية المميزة',
      description: 'احصل على مزايا حصرية وخصومات مميزة',
      price: 20,
      currency: 'USD',
      period: 'شهر',
      features: JSON.stringify(defaultFeatures),
      updatedBy: 1, // System
    });
    
    console.log('✅ Premium subscription settings table created successfully');
  } catch (error) {
    console.error('❌ Error creating premium subscription settings table:', error);
  }
}

// Run the migration
addPremiumSubscriptionSettingsTable();