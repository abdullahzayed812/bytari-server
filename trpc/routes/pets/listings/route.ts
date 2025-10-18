import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { petListings, petListingNotifications, adminNotifications, users } from '../../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Create pet listing (adoption, breeding, lost)
export const createPetListingProcedure = protectedProcedure
  .input(z.object({
    petId: z.number().optional(),
    name: z.string().min(1),
    type: z.enum(['dog', 'cat', 'bird', 'rabbit', 'other']),
    breed: z.string().optional(),
    age: z.number().optional(),
    weight: z.number().optional(),
    color: z.string().optional(),
    gender: z.enum(['male', 'female']),
    image: z.string().optional(),
    location: z.string().min(1),
    description: z.string().min(1),
    listingType: z.enum(['adoption', 'breeding', 'lost']),
    
    // Breeding specific
    breedingHistory: z.string().optional(),
    healthCertificates: z.string().optional(),
    studFee: z.string().optional(),
    availabilityPeriod: z.string().optional(),
    contactPreference: z.enum(['phone', 'message', 'both']).optional(),
    specialRequirements: z.string().optional(),
    
    // Lost pet specific
    lastSeenDate: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    reward: z.number().optional(),
    contactInfo: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    try {
      // Create the pet listing
      const [listing] = await db.insert(petListings).values({
        ownerId: userId,
        petId: input.petId,
        name: input.name,
        type: input.type,
        breed: input.breed,
        age: input.age,
        weight: input.weight,
        color: input.color,
        gender: input.gender,
        image: input.image,
        location: input.location,
        description: input.description,
        listingType: input.listingType,
        breedingHistory: input.breedingHistory,
        healthCertificates: input.healthCertificates,
        studFee: input.studFee,
        availabilityPeriod: input.availabilityPeriod,
        contactPreference: input.contactPreference,
        specialRequirements: input.specialRequirements,
        lastSeenDate: input.lastSeenDate ? new Date(input.lastSeenDate) : undefined,
        latitude: input.latitude,
        longitude: input.longitude,
        reward: input.reward,
        contactInfo: input.contactInfo,
        status: 'pending',
      }).returning();

      // Send notification to user
      await db.insert(petListingNotifications).values({
        listingId: listing.id,
        recipientId: userId,
        type: 'approval_request',
        title: 'تم إرسال طلب الموافقة',
        content: `تم إرسال طلب الموافقة على ${getListingTypeText(input.listingType)} "${input.name}" للإدارة. سيتم إشعارك عند الموافقة أو الرفض.`,
      });

      // Get all admin users to send notifications
      const adminUsers = await db.select()
        .from(users)
        .where(eq(users.userType, 'admin'));

      // Send notifications to all admins
      for (const admin of adminUsers) {
        await db.insert(adminNotifications).values({
          recipientId: admin.id,
          type: 'approval_request',
          title: `طلب موافقة جديد - ${getListingTypeText(input.listingType)}`,
          content: `طلب موافقة جديد على ${getListingTypeText(input.listingType)} "${input.name}" من المستخدم`,
          relatedResourceType: 'pet_listing',
          relatedResourceId: listing.id,
          actionUrl: `/admin-pet-listings?id=${listing.id}`,
          priority: 'normal',
        });
      }

      return {
        success: true,
        message: 'تم إرسال الطلب بنجاح وسيتم مراجعته من قبل الإدارة',
        listingId: listing.id,
      };
    } catch (error) {
      console.error('Error creating pet listing:', error);
      throw new Error('حدث خطأ أثناء إنشاء القائمة');
    }
  });

// Get pet listings (approved only for public, all for admin)
export const getPetListingsProcedure = publicProcedure
  .input(z.object({
    listingType: z.enum(['adoption', 'breeding', 'lost']).optional(),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    isAdmin: z.boolean().default(false),
  }))
  .query(async ({ input }) => {
    try {
      let whereConditions = [];
      
      if (input.listingType) {
        whereConditions.push(eq(petListings.listingType, input.listingType));
      }
      
      if (input.isAdmin && input.status) {
        whereConditions.push(eq(petListings.status, input.status));
      } else if (!input.isAdmin) {
        // Only show approved listings for public
        whereConditions.push(eq(petListings.status, 'approved'));
        whereConditions.push(eq(petListings.isActive, true));
      }

      const listings = await db.select({
        id: petListings.id,
        name: petListings.name,
        type: petListings.type,
        breed: petListings.breed,
        age: petListings.age,
        weight: petListings.weight,
        color: petListings.color,
        gender: petListings.gender,
        image: petListings.image,
        location: petListings.location,
        description: petListings.description,
        listingType: petListings.listingType,
        status: petListings.status,
        createdAt: petListings.createdAt,
        ownerName: users.name,
        ownerPhone: users.phone,
      })
      .from(petListings)
      .leftJoin(users, eq(petListings.ownerId, users.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(petListings.createdAt));

      return listings;
    } catch (error) {
      console.error('Error fetching pet listings:', error);
      throw new Error('حدث خطأ أثناء جلب القوائم');
    }
  });

// Approve pet listing (admin only)
export const approvePetListingProcedure = protectedProcedure
  .input(z.object({
    listingId: z.number(),
    adminNotes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new Error('غير مصرح لك بهذا الإجراء');
    }

    try {
      // Update listing status
      const [updatedListing] = await db.update(petListings)
        .set({
          status: 'approved',
          approvedBy: userId,
          approvedAt: new Date(),
          adminNotes: input.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(petListings.id, input.listingId))
        .returning();

      if (!updatedListing) {
        throw new Error('القائمة غير موجودة');
      }

      // Send approval notification to owner
      await db.insert(petListingNotifications).values({
        listingId: input.listingId,
        recipientId: updatedListing.ownerId,
        type: 'approved',
        title: 'تم الموافقة على طلبك',
        content: `تم الموافقة على ${getListingTypeText(updatedListing.listingType)} "${updatedListing.name}" وأصبح متاحاً للعرض في التطبيق.`,
      });

      return {
        success: true,
        message: 'تم الموافقة على القائمة بنجاح',
      };
    } catch (error) {
      console.error('Error approving pet listing:', error);
      throw new Error('حدث خطأ أثناء الموافقة على القائمة');
    }
  });

// Reject pet listing (admin only)
export const rejectPetListingProcedure = protectedProcedure
  .input(z.object({
    listingId: z.number(),
    rejectionReason: z.string().min(1),
    adminNotes: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new Error('غير مصرح لك بهذا الإجراء');
    }

    try {
      // Update listing status
      const [updatedListing] = await db.update(petListings)
        .set({
          status: 'rejected',
          approvedBy: userId,
          approvedAt: new Date(),
          rejectionReason: input.rejectionReason,
          adminNotes: input.adminNotes,
          updatedAt: new Date(),
        })
        .where(eq(petListings.id, input.listingId))
        .returning();

      if (!updatedListing) {
        throw new Error('القائمة غير موجودة');
      }

      // Send rejection notification to owner
      await db.insert(petListingNotifications).values({
        listingId: input.listingId,
        recipientId: updatedListing.ownerId,
        type: 'rejected',
        title: 'تم رفض طلبك',
        content: `تم رفض ${getListingTypeText(updatedListing.listingType)} "${updatedListing.name}". السبب: ${input.rejectionReason}`,
      });

      return {
        success: true,
        message: 'تم رفض القائمة بنجاح',
      };
    } catch (error) {
      console.error('Error rejecting pet listing:', error);
      throw new Error('حدث خطأ أثناء رفض القائمة');
    }
  });

// Get user's pet listings
export const getUserPetListingsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    try {
      const listings = await db.select()
        .from(petListings)
        .where(eq(petListings.ownerId, userId))
        .orderBy(desc(petListings.createdAt));

      return listings;
    } catch (error) {
      console.error('Error fetching user pet listings:', error);
      throw new Error('حدث خطأ أثناء جلب قوائمك');
    }
  });

// Get pet listing notifications
export const getPetListingNotificationsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    const userId = ctx.userId;
    if (!userId) {
      throw new Error('المستخدم غير مسجل الدخول');
    }

    try {
      const notifications = await db.select({
        id: petListingNotifications.id,
        type: petListingNotifications.type,
        title: petListingNotifications.title,
        content: petListingNotifications.content,
        isRead: petListingNotifications.isRead,
        createdAt: petListingNotifications.createdAt,
        listingName: petListings.name,
        listingType: petListings.listingType,
      })
      .from(petListingNotifications)
      .leftJoin(petListings, eq(petListingNotifications.listingId, petListings.id))
      .where(eq(petListingNotifications.recipientId, userId))
      .orderBy(desc(petListingNotifications.createdAt));

      return notifications;
    } catch (error) {
      console.error('Error fetching pet listing notifications:', error);
      throw new Error('حدث خطأ أثناء جلب الإشعارات');
    }
  });

// Helper function to get listing type text in Arabic
function getListingTypeText(listingType: string): string {
  switch (listingType) {
    case 'adoption':
      return 'حيوان للتبني';
    case 'breeding':
      return 'حيوان للتزاوج';
    case 'lost':
      return 'حيوان مفقود';
    default:
      return 'حيوان';
  }
}