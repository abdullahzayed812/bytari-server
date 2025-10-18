import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, users, pets } from '../../../../db';
import { eq, like, or } from 'drizzle-orm';

// Get user profile for admin editing
export const getUserProfileProcedure = publicProcedure
  .input(z.object({
    userId: z.number(),
    adminId: z.number(),
  }))
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      if (user.length === 0) {
        throw new Error('المستخدم غير موجود');
      }

      return user[0];
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('فشل في جلب بيانات المستخدم');
    }
  });

// Update user profile by admin
export const updateUserProfileProcedure = publicProcedure
  .input(z.object({
    userId: z.number(),
    adminId: z.number(),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    userType: z.enum(['user', 'vet', 'admin']),
    avatar: z.string().optional(),
    isActive: z.boolean(),
  }))
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const updatedUser = await db
        .update(users)
        .set({
          name: input.name,
          email: input.email,
          phone: input.phone,
          userType: input.userType,
          avatar: input.avatar,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error('فشل في تحديث بيانات المستخدم');
      }

      return updatedUser[0];
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('فشل في تحديث بيانات المستخدم');
    }
  });

// Ban/Unban user
export const banUserProcedure = publicProcedure
  .input(z.object({
    userId: z.number(),
    adminId: z.number(),
    ban: z.boolean(), // true to ban, false to unban
    reason: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const updatedUser = await db
        .update(users)
        .set({
          isActive: !input.ban,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error('فشل في تحديث حالة المستخدم');
      }

      // TODO: Log admin activity
      
      return {
        success: true,
        message: input.ban ? 'تم حظر المستخدم بنجاح' : 'تم إلغاء حظر المستخدم بنجاح',
        user: updatedUser[0],
      };
    } catch (error) {
      console.error('Error banning/unbanning user:', error);
      throw new Error('فشل في تحديث حالة المستخدم');
    }
  });

// Delete user
export const deleteUserProcedure = publicProcedure
  .input(z.object({
    userId: z.number(),
    adminId: z.number(),
    reason: z.string().optional(),
  }))
  .mutation(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      // First, delete user's pets
      await db
        .delete(pets)
        .where(eq(pets.ownerId, input.userId));
      
      // Then delete the user
      const deletedUser = await db
        .delete(users)
        .where(eq(users.id, input.userId))
        .returning();

      if (deletedUser.length === 0) {
        throw new Error('فشل في حذف المستخدم');
      }

      // TODO: Log admin activity
      
      return {
        success: true,
        message: 'تم حذف المستخدم بنجاح',
      };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('فشل في حذف المستخدم');
    }
  });

// List all users for admin
export const listAllUsersProcedure = publicProcedure
  .input(z.object({
    adminId: z.number(),
    userType: z.enum(['user', 'vet', 'admin']).optional(),
    limit: z.number().default(50),
    offset: z.number().default(0),
  }))
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      let allUsers;
      
      if (input.userType) {
        allUsers = await db
          .select()
          .from(users)
          .where(eq(users.userType, input.userType))
          .limit(input.limit)
          .offset(input.offset);
      } else {
        allUsers = await db
          .select()
          .from(users)
          .limit(input.limit)
          .offset(input.offset);
      }

      return {
        success: true,
        users: allUsers,
        count: allUsers.length,
      };
    } catch (error) {
      console.error('Error listing users:', error);
      throw new Error('فشل في جلب قائمة المستخدمين');
    }
  });

// Search users for admin
export const searchUsersProcedure = publicProcedure
  .input(z.object({
    query: z.string(),
    adminId: z.number(),
    limit: z.number().default(20),
    offset: z.number().default(0),
  }))
  .query(async ({ input }) => {
    try {
      // TODO: Check admin permissions here
      
      const searchResults = await db
        .select()
        .from(users)
        .where(
          or(
            like(users.name, `%${input.query}%`),
            like(users.email, `%${input.query}%`),
            like(users.phone, `%${input.query}%`)
          )
        )
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(users.createdAt);

      return searchResults;
    } catch (error) {
      console.error('Error searching users:', error);
      throw new Error('فشل في البحث عن المستخدمين');
    }
  });