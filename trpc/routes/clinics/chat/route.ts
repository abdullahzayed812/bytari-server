import { z } from "zod";
import { eq, and, desc, sql, inArray, count } from "drizzle-orm";
import { protectedProcedure } from "../../../create-context";
import { db, clinicPetChats, clinicPetChatMessages, pets, users, clinicStaff, notifications } from "../../../../db";
import { TRPCError } from "@trpc/server";

// Get or create a chat between a clinic and a pet owner (used by vet side)
export const getOrCreateChatProcedure = protectedProcedure.input(z.object({ petId: z.string(), clinicId: z.number() })).query(async ({ input }) => {
  const [existing] = await db
    .select()
    .from(clinicPetChats)
    .where(and(eq(clinicPetChats.petId, input.petId), eq(clinicPetChats.clinicId, input.clinicId)))
    .limit(1);

  if (existing) return { success: true, chat: existing };

  const [pet] = await db.select({ ownerId: pets.ownerId }).from(pets).where(eq(pets.id, input.petId)).limit(1);

  if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "الحيوان غير موجود" });

  const [created] = await db.insert(clinicPetChats).values({ petId: input.petId, clinicId: input.clinicId, ownerId: pet.ownerId, isActive: false }).returning();

  return { success: true, chat: created };
});

// Fetch chat without creating (used by owner side), includes unread count from clinic
export const getChatProcedure = protectedProcedure.input(z.object({ petId: z.string(), clinicId: z.number() })).query(async ({ input }) => {
  const [chat] = await db
    .select()
    .from(clinicPetChats)
    .where(and(eq(clinicPetChats.petId, input.petId), eq(clinicPetChats.clinicId, input.clinicId)))
    .limit(1);

  if (!chat) return { success: true, chat: null };

  const [unreadRow] = await db
    .select({ count: count() })
    .from(clinicPetChatMessages)
    .where(and(eq(clinicPetChatMessages.chatId, chat.id), eq(clinicPetChatMessages.senderRole, "clinic"), eq(clinicPetChatMessages.isRead, false)));

  return { success: true, chat: { ...chat, unreadCount: unreadRow?.count ?? 0 } };
});

// Flip is_active on a chat (clinic only)
export const toggleActiveProcedure = protectedProcedure.input(z.object({ chatId: z.number(), clinicId: z.number() })).mutation(async ({ input }) => {
  const [chat] = await db
    .select()
    .from(clinicPetChats)
    .where(and(eq(clinicPetChats.id, input.chatId), eq(clinicPetChats.clinicId, input.clinicId)))
    .limit(1);

  if (!chat) throw new TRPCError({ code: "NOT_FOUND", message: "المحادثة غير موجودة" });

  const [updated] = await db.update(clinicPetChats).set({ isActive: !chat.isActive }).where(eq(clinicPetChats.id, input.chatId)).returning();

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
    // Mark messages from the other side as read BEFORE fetching,
    // so the response already reflects the correct read state.
    await db
      .update(clinicPetChatMessages)
      .set({ isRead: true })
      .where(
        and(eq(clinicPetChatMessages.chatId, input.chatId), eq(clinicPetChatMessages.isRead, false), sql`${clinicPetChatMessages.senderId} != ${ctx.user.id}`),
      );

    const rows = await db
      .select({
        id: clinicPetChatMessages.id,
        chatId: clinicPetChatMessages.chatId,
        senderId: clinicPetChatMessages.senderId,
        senderRole: clinicPetChatMessages.senderRole,
        message: clinicPetChatMessages.message,
        mediaUrl: clinicPetChatMessages.mediaUrl,
        mediaType: clinicPetChatMessages.mediaType,
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

    return { success: true, messages, nextCursor };
  });

// Send a message (with optional image/video)
export const sendMessageProcedure = protectedProcedure
  .input(
    z.object({
      chatId: z.number(),
      message: z.string(),
      senderRole: z.enum(["owner", "clinic"]),
      mediaUrl: z.string().optional(),
      mediaType: z.enum(["image", "video", "file"]).optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    if (!input.message.trim() && !input.mediaUrl) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "الرسالة لا يمكن أن تكون فارغة" });
    }

    const [msg] = await db
      .insert(clinicPetChatMessages)
      .values({
        chatId: input.chatId,
        senderId: ctx.user.id,
        senderRole: input.senderRole,
        message: input.message,
        mediaUrl: input.mediaUrl ?? null,
        mediaType: input.mediaType ?? null,
        isRead: false,
      })
      .returning();

    // Send notification to recipient(s)
    try {
      const [chat] = await db
        .select({ ownerId: clinicPetChats.ownerId, clinicId: clinicPetChats.clinicId })
        .from(clinicPetChats)
        .where(eq(clinicPetChats.id, input.chatId))
        .limit(1);

      if (chat) {
        const isMedia = !!input.mediaUrl;
        const mediaLabel = input.mediaType === "video" ? "فيديو" : "صورة";
        const notifMessage = isMedia
          ? `أرسل ${mediaLabel}${input.message.trim() ? `: ${input.message.trim().substring(0, 60)}` : ""}`
          : input.message.trim().substring(0, 80);

        if (input.senderRole === "clinic") {
          // Notify the pet owner
          await db.insert(notifications).values({
            userId: chat.ownerId,
            title: "رسالة جديدة من العيادة",
            message: notifMessage,
            type: "clinic_chat",
            data: { chatId: input.chatId, recipientRole: "owner", clinicId: chat.clinicId },
          });
        } else {
          // Notify all clinic staff
          const staff = await db.select({ userId: clinicStaff.userId }).from(clinicStaff).where(eq(clinicStaff.clinicId, chat.clinicId));

          if (staff.length > 0) {
            await db.insert(notifications).values(
              staff.map((s) => ({
                userId: s.userId,
                title: "رسالة جديدة من صاحب الحيوان",
                message: notifMessage,
                type: "clinic_chat",
                data: { chatId: input.chatId, recipientRole: "clinic", clinicId: chat.clinicId },
              })),
            );
          }
        }
      }
    } catch {
      // Notification failure should not block message delivery
    }

    return { success: true, message: msg };
  });

// List all chats for a clinic with last message + unread count
export const getClinicChatsProcedure = protectedProcedure.input(z.object({ clinicId: z.number() })).query(async ({ input }) => {
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
        .where(and(eq(clinicPetChatMessages.chatId, chat.id), eq(clinicPetChatMessages.senderRole, "owner"), eq(clinicPetChatMessages.isRead, false)));

      return {
        ...chat,
        lastMessage: lastMsg?.message ?? null,
        lastMessageAt: lastMsg?.createdAt ?? chat.createdAt,
        unreadCount: unreadRow?.count ?? 0,
      };
    }),
  );

  enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return { success: true, chats: enriched };
});

// Mark all messages from the other party as read (works for both owner and vet)
export const markAsReadProcedure = protectedProcedure.input(z.object({ chatId: z.number() })).mutation(async ({ input, ctx }) => {
  await db
    .update(clinicPetChatMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(clinicPetChatMessages.chatId, input.chatId),
        // sql`${clinicPetChatMessages.senderId} != ${ctx.user.id}`,
        eq(clinicPetChatMessages.isRead, false),
      ),
    );
  return { success: true };
});

// Total unread message count for a clinic (from owner side)
export const getUnreadCountProcedure = protectedProcedure.input(z.object({ clinicId: z.number() })).query(async ({ input }) => {
  const chatIds = await db.select({ id: clinicPetChats.id }).from(clinicPetChats).where(eq(clinicPetChats.clinicId, input.clinicId));

  if (chatIds.length === 0) return { success: true, count: 0 };

  const ids = chatIds.map((c) => c.id);

  const [result] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(clinicPetChatMessages)
    .where(and(inArray(clinicPetChatMessages.chatId, ids), eq(clinicPetChatMessages.senderRole, "owner"), eq(clinicPetChatMessages.isRead, false)));

  return { success: true, count: result?.count ?? 0 };
});
