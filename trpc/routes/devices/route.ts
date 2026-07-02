import { z } from "zod";
import { protectedProcedure } from "../../create-context";
import { db, deviceTokens } from "../../../db";
import { and, eq } from "drizzle-orm";

/**
 * Register (or refresh) a device token for the authenticated user.
 * Uses upsert so re-registering the same token just updates lastSeen.
 * If a token already belongs to a different user (device handoff), it is
 * reassigned to the current user — FCM tokens are device-scoped, not user-scoped.
 */
export const registerDeviceTokenProcedure = protectedProcedure
  .input(
    z.object({
      token: z.string().min(1),
      platform: z.enum(["android", "ios", "web"]),
    })
  )
  .mutation(async ({ input, ctx }) => {
    await db
      .insert(deviceTokens)
      .values({
        userId: ctx.user.id,
        token: input.token,
        platform: input.platform,
        lastSeen: new Date(),
      })
      .onConflictDoUpdate({
        target: deviceTokens.token,
        set: {
          userId: ctx.user.id,
          lastSeen: new Date(),
        },
      });

    return { success: true };
  });

/**
 * Remove a device token on logout.
 * Only removes tokens owned by the calling user — prevents removing other users' tokens.
 */
export const removeDeviceTokenProcedure = protectedProcedure
  .input(z.object({ token: z.string().min(1) }))
  .mutation(async ({ input, ctx }) => {
    await db
      .delete(deviceTokens)
      .where(
        and(
          eq(deviceTokens.token, input.token),
          eq(deviceTokens.userId, ctx.user.id)
        )
      );

    return { success: true };
  });
