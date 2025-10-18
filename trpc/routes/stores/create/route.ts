import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, vetStores } from '../../../../db';

const createStoreSchema = z.object({
  name: z.string().min(1, 'اسم المذخر مطلوب'),
  description: z.string().optional(),
  address: z.string().min(1, 'العنوان مطلوب'),
  phone: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  workingHours: z.string().optional(),
  licenseImage: z.string().min(1, 'صورة الترخيص مطلوبة'),
  licenseNumber: z.string().min(1, 'رقم الترخيص مطلوب'),
  images: z.array(z.string()).optional(),
});

export const createStoreProcedure = publicProcedure
  .input(createStoreSchema)
  .mutation(async ({ input }: { input: z.infer<typeof createStoreSchema> }) => {
    try {
      const userId = 1; // TODO: Get from auth context
      
      const [store] = await db.insert(vetStores).values({
        ownerId: userId,
        name: input.name,
        description: input.description,
        address: input.address,
        phone: input.phone,
        email: input.email,
        latitude: input.latitude,
        longitude: input.longitude,
        workingHours: input.workingHours,
        licenseImage: input.licenseImage,
        licenseNumber: input.licenseNumber,
        images: input.images ? JSON.stringify(input.images) : null,
        subscriptionStatus: 'pending',
        isActive: false,
        isVerified: false,
      }).returning();

      return {
        success: true,
        store,
        message: 'تم إرسال طلب إضافة المذخر بنجاح. سيتم مراجعته من قبل الإدارة.'
      };
    } catch (error) {
      console.error('Error creating store:', error);
      throw new Error('حدث خطأ أثناء إنشاء المذخر');
    }
  });