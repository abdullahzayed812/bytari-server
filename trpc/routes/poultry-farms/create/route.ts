import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { poultryFarms } from '../../../../db/schema';

const createPoultryFarmSchema = z.object({
  name: z.string().min(1, 'اسم الحقل مطلوب'),
  description: z.string().optional(),
  address: z.string().min(1, 'العنوان مطلوب'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  farmType: z.enum(['broiler', 'layer', 'breeder', 'mixed']),
  capacity: z.number().int().positive().optional(),
  licenseNumber: z.string().optional(),
  licenseImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  ownerId: z.number().int().positive(),
});

export const createPoultryFarmProcedure = publicProcedure
  .input(createPoultryFarmSchema)
  .mutation(async ({ input }) => {
    console.log('Creating poultry farm:', input);
    
    try {
      const [farm] = await db.insert(poultryFarms).values({
        ownerId: input.ownerId,
        name: input.name,
        description: input.description,
        address: input.address,
        phone: input.phone,
        email: input.email,
        latitude: input.latitude,
        longitude: input.longitude,
        farmType: input.farmType,
        capacity: input.capacity,
        licenseNumber: input.licenseNumber,
        licenseImage: input.licenseImage,
        images: input.images ? JSON.stringify(input.images) : null,
        isActive: true,
        isVerified: false,
      }).returning();
      
      console.log('Poultry farm created successfully:', farm);
      return {
        success: true,
        farm,
        message: 'تم إنشاء حقل الدواجن بنجاح'
      };
    } catch (error) {
      console.error('Error creating poultry farm:', error);
      throw new Error('فشل في إنشاء حقل الدواجن');
    }
  });