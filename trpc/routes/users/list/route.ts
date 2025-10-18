import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db, users } from '../../../../db';
import { eq, like, and } from 'drizzle-orm';

const getUsersSchema = z.object({
  userType: z.enum(['user', 'vet', 'admin']).optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const getUsersProcedure = publicProcedure
  .input(getUsersSchema)
  .query(async ({ input }) => {
    try {
      const conditions = [];
      
      if (input.userType) {
        conditions.push(eq(users.userType, input.userType));
      }
      
      if (input.search) {
        conditions.push(like(users.name, `%${input.search}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const usersList = await db
        .select()
        .from(users)
        .where(whereClause)
        .limit(input.limit)
        .offset(input.offset);

      return {
        success: true,
        users: usersList,
        count: usersList.length,
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  });