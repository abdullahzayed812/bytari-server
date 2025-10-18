import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../../../create-context';
import { db, vetStores, approvalRequests, users } from '../../../../db';
import { eq } from 'drizzle-orm';

export const createWarehouseProcedure = publicProcedure
  .input(z.object({
    name: z.string().min(1, 'اسم المذخر مطلوب'),
    description: z.string().optional(),
    address: z.string().min(1, 'عنوان المذخر مطلوب'),
    phone: z.string().min(1, 'رقم الهاتف مطلوب'),
    email: z.string().email('البريد الإلكتروني غير صحيح').optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    workingHours: z.string().optional(),
    licenseNumber: z.string().min(1, 'رقم الترخيص مطلوب'),
    licenseImages: z.array(z.string()).min(1, 'صور الترخيص مطلوبة'),
    identityImages: z.array(z.string()).min(1, 'صور الهوية مطلوبة'),
    officialDocuments: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      console.log('Creating warehouse registration request:', input.name);
      
      // Mock user ID for development - in production, get from authentication
      const userId = 1;
      
      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!user) {
        throw new Error('المستخدم غير موجود');
      }
      
      // Create the warehouse record first (inactive)
      const [warehouse] = await db
        .insert(vetStores)
        .values({
          ownerId: userId,
          name: input.name,
          description: input.description,
          address: input.address,
          phone: input.phone,
          email: input.email,
          latitude: input.latitude,
          longitude: input.longitude,
          workingHours: input.workingHours ? JSON.stringify(input.workingHours) : null,
          licenseNumber: input.licenseNumber,
          licenseImage: input.licenseImages[0], // Store first license image
          images: input.images ? JSON.stringify(input.images) : null,
          isActive: false, // Will be activated after approval
          isVerified: false,
          subscriptionStatus: 'pending',
        })
        .returning();
      
      // Create approval request
      const [approvalRequest] = await db
        .insert(approvalRequests)
        .values({
          requestType: 'store_activation',
          requesterId: userId,
          resourceId: warehouse.id,
          title: `طلب تفعيل مذخر: ${input.name}`,
          description: `طلب تفعيل مذخر بيطري جديد باسم ${input.name} في ${input.address}`,
          licenseImages: JSON.stringify(input.licenseImages),
          identityImages: JSON.stringify(input.identityImages),
          officialDocuments: input.officialDocuments ? JSON.stringify(input.officialDocuments) : null,
          paymentStatus: 'not_required', // Warehouse activation doesn't require payment
          status: 'pending',
        })
        .returning();
      
      console.log('Warehouse registration request created successfully:', approvalRequest.id);
      
      return {
        success: true,
        message: 'تم إرسال طلب تسجيل المذخر بنجاح. سيتم مراجعته من قبل الإدارة.',
        warehouseId: warehouse.id,
        requestId: approvalRequest.id,
      };
      
    } catch (error) {
      console.error('Error creating warehouse registration:', error);
      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'حدث خطأ أثناء تسجيل المذخر'
      );
    }
  });

export const updateWarehouseActivationProcedure = protectedProcedure
  .input(z.object({
    warehouseId: z.number(),
    activationStartDate: z.date(),
    activationEndDate: z.date(),
    isActive: z.boolean().optional(),
  }))
  .mutation(async ({ input }) => {
    const now = new Date();
    const needsRenewal = input.activationEndDate <= now;
    
    const updatedWarehouse = await db.update(vetStores)
      .set({
        activationStartDate: input.activationStartDate,
        activationEndDate: input.activationEndDate,
        isActive: input.isActive ?? (input.activationEndDate > now),
        needsRenewal,
        subscriptionStatus: input.activationEndDate > now ? 'active' : 'expired',
        updatedAt: now,
      })
      .where(eq(vetStores.id, input.warehouseId))
      .returning();

    return updatedWarehouse[0];
  });

export const renewWarehouseActivationProcedure = protectedProcedure
  .input(z.object({
    warehouseId: z.number(),
    newEndDate: z.date(),
  }))
  .mutation(async ({ input }) => {
    const now = new Date();
    
    const updatedWarehouse = await db.update(vetStores)
      .set({
        activationEndDate: input.newEndDate,
        isActive: true,
        needsRenewal: false,
        subscriptionStatus: 'active',
        updatedAt: now,
      })
      .where(eq(vetStores.id, input.warehouseId))
      .returning();

    return updatedWarehouse[0];
  });