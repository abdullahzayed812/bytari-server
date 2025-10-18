import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import { db } from '../../../../db';
import { farmMessages, poultryFarms, users } from '../../../../db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

const sendFarmMessageSchema = z.object({
  farmId: z.number().int().positive(),
  senderId: z.number().int().positive(),
  receiverId: z.number().int().positive(),
  messageType: z.enum(['text', 'image', 'video', 'audio', 'file']).default('text'),
  content: z.string().optional(),
  attachmentUrl: z.string().optional(),
  attachmentType: z.enum(['image', 'video', 'audio', 'document']).optional(),
});

export const sendFarmMessageProcedure = publicProcedure
  .input(sendFarmMessageSchema)
  .mutation(async ({ input }) => {
    console.log('Sending farm message:', input);
    
    try {
      // Validate that farm exists
      const [farm] = await db.select()
        .from(poultryFarms)
        .where(eq(poultryFarms.id, input.farmId));
      
      if (!farm) {
        throw new Error('حقل الدواجن غير موجود');
      }

      // Create message
      const [message] = await db.insert(farmMessages).values({
        farmId: input.farmId,
        senderId: input.senderId,
        receiverId: input.receiverId,
        messageType: input.messageType,
        content: input.content,
        attachmentUrl: input.attachmentUrl,
        attachmentType: input.attachmentType,
        isRead: false,
      }).returning();
      
      console.log('Farm message sent successfully:', message);
      return {
        success: true,
        message,
        message_text: 'تم إرسال الرسالة بنجاح'
      };
    } catch (error) {
      console.error('Error sending farm message:', error);
      throw new Error('فشل في إرسال الرسالة');
    }
  });

export const getFarmMessagesProcedure = publicProcedure
  .input(z.object({
    farmId: z.number().int().positive(),
    userId: z.number().int().positive(),
    limit: z.number().int().positive().default(50),
    offset: z.number().int().nonnegative().default(0),
  }))
  .query(async ({ input }) => {
    console.log('Getting farm messages:', input);
    
    try {
      const messages = await db.select({
        id: farmMessages.id,
        messageType: farmMessages.messageType,
        content: farmMessages.content,
        attachmentUrl: farmMessages.attachmentUrl,
        attachmentType: farmMessages.attachmentType,
        isRead: farmMessages.isRead,
        createdAt: farmMessages.createdAt,
        sender: {
          id: users.id,
          name: users.name,
        }
      }).from(farmMessages)
      .leftJoin(users, eq(farmMessages.senderId, users.id))
      .where(
        and(
          eq(farmMessages.farmId, input.farmId),
          or(
            eq(farmMessages.senderId, input.userId),
            eq(farmMessages.receiverId, input.userId)
          )
        )
      )
      .orderBy(desc(farmMessages.createdAt))
      .limit(input.limit)
      .offset(input.offset);
      
      console.log('Farm messages retrieved successfully:', messages.length);
      return {
        success: true,
        messages
      };
    } catch (error) {
      console.error('Error getting farm messages:', error);
      throw new Error('فشل في جلب الرسائل');
    }
  });

export const markFarmMessageAsReadProcedure = publicProcedure
  .input(z.object({
    messageId: z.number().int().positive(),
    userId: z.number().int().positive(),
  }))
  .mutation(async ({ input }) => {
    console.log('Marking farm message as read:', input);
    
    try {
      await db.update(farmMessages)
        .set({ 
          isRead: true,
          readAt: new Date()
        })
        .where(
          and(
            eq(farmMessages.id, input.messageId),
            eq(farmMessages.receiverId, input.userId)
          )
        );
      
      console.log('Farm message marked as read successfully');
      return {
        success: true,
        message: 'تم تحديد الرسالة كمقروءة'
      };
    } catch (error) {
      console.error('Error marking farm message as read:', error);
      throw new Error('فشل في تحديد الرسالة كمقروءة');
    }
  });

export const getFarmConversationsProcedure = publicProcedure
  .input(z.object({
    userId: z.number().int().positive(),
  }))
  .query(async ({ input }) => {
    console.log('Getting farm conversations:', input);
    
    try {
      // Get all farms where user is involved (as owner, assigned vet, or supervisor)
      const conversations = await db.select({
        farmId: poultryFarms.id,
        farmName: poultryFarms.name,
        farmType: poultryFarms.farmType,
        ownerId: poultryFarms.ownerId,
        assignedVetId: poultryFarms.assignedVetId,
        assignedSupervisorId: poultryFarms.assignedSupervisorId,
      }).from(poultryFarms)
      .where(
        or(
          eq(poultryFarms.ownerId, input.userId),
          eq(poultryFarms.assignedSupervisorId, input.userId)
        )
      );
      
      console.log('Farm conversations retrieved successfully:', conversations.length);
      return {
        success: true,
        conversations
      };
    } catch (error) {
      console.error('Error getting farm conversations:', error);
      throw new Error('فشل في جلب المحادثات');
    }
  });