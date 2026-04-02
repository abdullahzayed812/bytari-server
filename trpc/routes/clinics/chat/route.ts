import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, clinicPetChats, clinicPetChatMessages, pets, users } from "../../../../db";
import { TRPCError } from "@trpc/server";

// Get or create a chat between a clinic and a pet owner (used by vet side)
export const getOrCreateChatProcedure = protectedProcedure
  .input(z.object({ petId: z.string(), clinicId: z.number() }))
  .query(async ({ input }) => {
    const [existing] = await db
      .select()
      .from(clinicPetChats)
      .where(
        and(
          eq(clinicPetChats.petId, input.petId),
          eq(clinicPetChats.clinicId, input.clinicId),
        ),
      )
      .limit(1);

    if (existing) return { success: true, chat: existing };

    const [pet] = await db
      .select({ ownerId: pets.ownerId })
      .from(pets)
      .where(eq(pets.id, input.petId))
      .limit(1);

    if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "الحيوان غير موجود" });

    const [created] = await db
      .insert(clinicPetChats)
      .values({ petId: input.petId, clinicId: input.clinicId, ownerId: pet.ownerId, isActive: true })
      .returning();

    return { success: true, chat: created };
  });

// Fetch chat without creating (used by owner side)
export const getChatProcedure = protectedProcedure
  .input(z.object({ petId: z.string(), clinicId: z.number() }))
  .query(async ({ input }) => {
    const [chat] = await db
      .select()
      .from(clinicPetChats)
      .where(
        and(
          eq(clinicPetChats.petId, input.petId),
          eq(clinicPetChats.clinicId, input.clinicId),
        ),
      )
      .limit(1);

    return { success: true, chat: chat ?? null };
  });

// Flip is_active on a chat (clinic only)
export const toggleActiveProcedure = protectedProcedure
  .input(z.object({ chatId: z.number(), clinicId: z.number() }))
  .mutation(async ({ input }) => {
    const [chat] = await db
      .select()
      .from(clinicPetChats)
      .where(and(eq(clinicPetChats.id, input.chatId), eq(clinicPetChats.clinicId, input.clinicId)))
      .limit(1);

    if (!chat) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة" });

    const [updated] = await db
      .update(clinicPetChats)
      .set({ isActive: !chat.isActive })
      .where(eq(clinicPetChats.id, input.chatId))
      .returning();

    return { success: true, chat: updated };
  });

// Fetch paginated messages and mark other side as read
export const getMessagesProcedure = protectedProcedure
  .input(
    z.object({
      chatId: z.number(),
      cursor: z.number().optional(),
      limit: z.number().default(30),
    }),
  )
  .query(async ({ input, ctx }) => {
    const rows = await db
      .select({
        id: clinicPetChatMessages.id,
        chatId: clinicPetChatMessages.chatId,
        senderId: clinicPetChatMessages.senderId,
        senderRole: clinicPetChatMessages.senderRole,
        message: clinicPetChatMessages.message,
        isRead: clinicPetChatMessages.isRead,
        createdAt: clinicPetChatMessages.createdAt,
        senderName: users.name,
      })
      .from(clinicPetChatMessages)
      .leftJoin(users, eq(clinicPetChatMessages.senderId, users.id))
      .where(eq(clinicPetChatMessages.chatId, input.chatId))
      .orderBy(desc(clinicPetChatMessages.createdAt))
      .limit(input.limit + 1);

    const hasMore = rows.length > input.limit;
    const messages = (hasMore ? rows.slice(0, input.limit) : rows).reverse();
    const nextCursor = hasMore ? messages[0]?.id : undefined;

    // Mark unread messages from the other side as read
    await db
      .update(clinicPetChatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(clinicPetChatMessages.chatId, input.chatId),
          eq(clinicPetChatMessages.isRead, false),
          sql`${clinicPetChatMessages.senderId} != ${ctx.user.id}`,
        ),
      );

    return { success: true, messages, nextCursor };
  });

// Send a message
export const sendMessageProcedure = protectedProcedure
  .input(
    z.object({
      chatId: z.number(),
      message: z.string().min(1),
      senderRole: z.enum(["owner", "clinic"]),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const [msg] = await db
      .insert(clinicPetChatMessages)
      .values({
        chatId: input.chatId,
        senderId: ctx.user.id,
        senderRole: input.senderRole,
        message: input.message,
        isRead: false,
      })
      .returning();

    return { success: true, message: msg };
  });

// List all chats for a clinic with last message + unread count
export const getClinicChatsProcedure = protectedProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    const chats = await db
      .select({
        id: clinicPetChats.id,
        petId: clinicPetChats.petId,
        clinicId: clinicPetChats.clinicId,
        ownerId: clinicPetChats.ownerId,
        isActive: clinicPetChats.isActive,
        createdAt: clinicPetChats.createdAt,
        petName: pets.name,
        petImage: pets.image,
        ownerName: users.name,
      })
      .from(clinicPetChats)
      .innerJoin(pets, eq(clinicPetChats.petId, pets.id))
      .innerJoin(users, eq(clinicPetChats.ownerId, users.id))
      .where(eq(clinicPetChats.clinicId, input.clinicId))
      .orderBy(desc(clinicPetChats.createdAt));

    const enriched = await Promise.all(
      chats.map(async (chat) => {
        const [lastMsg] = await db
          .select({ message: clinicPetChatMessages.message, createdAt: clinicPetChatMessages.createdAt })
          .from(clinicPetChatMessages)
          .where(eq(clinicPetChatMessages.chatId, chat.id))
          .orderBy(desc(clinicPetChatMessages.createdAt))
          .limit(1);

        const [unreadRow] = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(clinicPetChatMessages)
          .where(
            and(
              eq(clinicPetChatMessages.chatId, chat.id),
              eq(clinicPetChatMessages.senderRole, "owner"),
              eq(clinicPetChatMessages.isRead, false),
            ),
          );

        return {
          ...chat,
          lastMessage: lastMsg?.message ?? null,
          lastMessageAt: lastMsg?.createdAt ?? chat.createdAt,
          unreadCount: unreadRow?.count ?? 0,
        };
      }),
    );

    enriched.sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );

    return { success: true, chats: enriched };
  });

// Total unread message count for a clinic (from owner side)
export const getUnreadCountProcedure = protectedProcedure
  .input(z.object({ clinicId: z.number() }))
  .query(async ({ input }) => {
    const chatIds = await db
      .select({ id: clinicPetChats.id })
      .from(clinicPetChats)
      .where(eq(clinicPetChats.clinicId, input.clinicId));

    if (chatIds.length === 0) return { success: true, count: 0 };

    const ids = chatIds.map((c) => c.id);

    const [result] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(clinicPetChatMessages)
      .where(
        and(
          inArray(clinicPetChatMessages.chatId, ids),
          eq(clinicPetChatMessages.senderRole, "owner"),
          eq(clinicPetChatMessages.isRead, false),
        ),
      );

    return { success: true, count: result?.count ?? 0 };
  });
