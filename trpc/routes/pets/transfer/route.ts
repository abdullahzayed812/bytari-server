import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../../create-context";
import { db, pets, users, petOwnershipTransfers, notifications } from "../../../../db";
import { eq, and, desc, or } from "drizzle-orm";

export const initiateTransferProcedure = protectedProcedure
  .input(
    z.object({
      petId: z.string(),
      toEmail: z.string().email(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const currentUserId = ctx.user.id;

    // Verify pet belongs to current user
    const [pet] = await db.select().from(pets).where(eq(pets.id, input.petId));
    if (!pet) throw new TRPCError({ code: "NOT_FOUND", message: "الحيوان غير موجود" });
    if (pet.ownerId !== currentUserId) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية نقل هذا الحيوان" });

    // Find recipient by email
    const [recipient] = await db.select().from(users).where(eq(users.email, input.toEmail));
    if (!recipient) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على مستخدم بهذا البريد الإلكتروني" });
    if (recipient.id === currentUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن نقل الحيوان إلى نفسك" });

    // Check for existing pending transfer
    const [existing] = await db
      .select()
      .from(petOwnershipTransfers)
      .where(and(eq(petOwnershipTransfers.petId, input.petId), eq(petOwnershipTransfers.status, "pending")));
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "يوجد طلب نقل ملكية معلق لهذا الحيوان بالفعل" });

    // Get sender info
    const [sender] = await db.select().from(users).where(eq(users.id, currentUserId));

    // Create transfer record
    const [transfer] = await db
      .insert(petOwnershipTransfers)
      .values({
        petId: input.petId,
        fromUserId: currentUserId,
        toUserId: recipient.id,
        status: "pending",
      })
      .returning();

    // Notify recipient
    await db.insert(notifications).values({
      userId: recipient.id,
      title: "طلب نقل ملكية حيوان",
      message: `يريد ${sender.name} نقل ملكية الحيوان "${pet.name}" إليك. يمكنك قبول أو رفض الطلب.`,
      type: "system",
      data: { transferId: transfer.id, petId: pet.id, petName: pet.name, fromUserName: sender.name },
      isRead: false,
    });

    return { success: true, transferId: transfer.id };
  });

export const respondToTransferProcedure = protectedProcedure
  .input(
    z.object({
      transferId: z.number(),
      action: z.enum(["approve", "reject"]),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const currentUserId = ctx.user.id;

    const [transfer] = await db.select().from(petOwnershipTransfers).where(eq(petOwnershipTransfers.id, input.transferId));

    if (!transfer) throw new TRPCError({ code: "NOT_FOUND", message: "طلب النقل غير موجود" });
    if (transfer.toUserId !== currentUserId) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية الرد على هذا الطلب" });
    if (transfer.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "تم الرد على هذا الطلب مسبقاً" });

    const newStatus = input.action === "approve" ? "approved" : "rejected";

    await db.update(petOwnershipTransfers).set({ status: newStatus, updatedAt: new Date() }).where(eq(petOwnershipTransfers.id, input.transferId));

    if (input.action === "approve") {
      await db.update(pets).set({ ownerId: currentUserId, updatedAt: new Date() }).where(eq(pets.id, transfer.petId));
    }

    // Get pet name and recipient info for notification
    const [pet] = await db.select().from(pets).where(eq(pets.id, transfer.petId));
    const [recipient] = await db.select().from(users).where(eq(users.id, currentUserId));

    await db.insert(notifications).values({
      userId: transfer.fromUserId,
      title: input.action === "approve" ? "تم قبول نقل الملكية" : "تم رفض نقل الملكية",
      message:
        input.action === "approve"
          ? `قبل ${recipient.name} طلب نقل ملكية "${pet?.name}". تم نقل الحيوان بنجاح.`
          : `رفض ${recipient.name} طلب نقل ملكية "${pet?.name}".`,
      type: "system",
      data: { transferId: transfer.id, petId: transfer.petId, petName: pet?.name },
      isRead: false,
    });

    return { success: true, status: newStatus };
  });

export const getSentTransfersProcedure = protectedProcedure.query(async ({ ctx }) => {
  const rows = await db
    .select({
      id: petOwnershipTransfers.id,
      status: petOwnershipTransfers.status,
      createdAt: petOwnershipTransfers.createdAt,
      petId: pets.id,
      petName: pets.name,
      petImage: pets.image,
      petType: pets.type,
      toUserName: users.name,
      toUserEmail: users.email,
    })
    .from(petOwnershipTransfers)
    .innerJoin(pets, eq(pets.id, petOwnershipTransfers.petId))
    .innerJoin(users, eq(users.id, petOwnershipTransfers.toUserId))
    .where(eq(petOwnershipTransfers.fromUserId, ctx.user.id))
    .orderBy(desc(petOwnershipTransfers.createdAt));

  return { transfers: rows };
});

export const getReceivedTransfersProcedure = protectedProcedure.query(async ({ ctx }) => {
  const fromUsers = db.select({ id: users.id, name: users.name, email: users.email }).from(users).as("from_users");

  const rows = await db
    .select({
      id: petOwnershipTransfers.id,
      status: petOwnershipTransfers.status,
      createdAt: petOwnershipTransfers.createdAt,
      petId: pets.id,
      petName: pets.name,
      petImage: pets.image,
      petType: pets.type,
      fromUserName: fromUsers.name,
      fromUserEmail: fromUsers.email,
    })
    .from(petOwnershipTransfers)
    .innerJoin(pets, eq(pets.id, petOwnershipTransfers.petId))
    .innerJoin(fromUsers, eq(fromUsers.id, petOwnershipTransfers.fromUserId))
    .where(eq(petOwnershipTransfers.toUserId, ctx.user.id))
    .orderBy(desc(petOwnershipTransfers.createdAt));

  return { transfers: rows };
});

export const cancelTransferProcedure = protectedProcedure.input(z.object({ transferId: z.number() })).mutation(async ({ input, ctx }) => {
  const [transfer] = await db.select().from(petOwnershipTransfers).where(eq(petOwnershipTransfers.id, input.transferId));

  if (!transfer) throw new TRPCError({ code: "NOT_FOUND", message: "طلب النقل غير موجود" });
  if (transfer.fromUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية إلغاء هذا الطلب" });
  if (transfer.status !== "pending") throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن إلغاء طلب غير معلق" });

  await db.update(petOwnershipTransfers).set({ status: "rejected", updatedAt: new Date() }).where(eq(petOwnershipTransfers.id, input.transferId));

  return { success: true };
});
