import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, users } from '../../../../db';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  userType: z.enum(['user', 'vet', 'admin']).default('user'),
  avatar: z.string().optional(),
});

export const createUserProcedure = publicProcedure
  .input(createUserSchema)
  .mutation(async ({ input }) => {
    try {
      const [newUser] = await db.insert(users).values({
        email: input.email,
        name: input.name,
        phone: input.phone,
        userType: input.userType,
        avatar: input.avatar,
      }).returning();

      return {
        success: true,
        user: newUser,
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  });