import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { db, polls, pollOptions, pollVotes, advertisements } from "../../../db";
import { eq, desc, and, sql } from "drizzle-orm";

// Get poll by advertisement ID
export const getByAdId = publicProcedure
  .input(
    z.object({
      adId: z.number(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      // Get poll data
      const pollData = await db.select().from(polls).where(eq(polls.advertisementId, input.adId)).limit(1);

      if (pollData.length === 0) {
        return {};
      }

      const poll = pollData[0];

      // Get poll options with vote counts
      const options = await db
        .select()
        .from(pollOptions)
        .where(eq(pollOptions.pollId, poll.id))
        .orderBy(pollOptions.order);

      return {
        ...poll,
        options,
      };
    } catch (error) {
      console.error("Error getting poll:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get poll");
    }
  });

// Vote on poll
export const vote = publicProcedure
  .input(
    z.object({
      pollId: z.number(),
      optionIds: z.array(z.number()).min(1), // Array to support multiple choice
      userId: z.number().optional(), // Optional for anonymous voting
      deviceId: z.string().optional(),
      ipAddress: z.string().optional(),
    })
  )
  .mutation(async ({ input }: { input: any }) => {
    try {
      // Get poll to check if it's active and allows multiple choice
      const pollData = await db.select().from(polls).where(eq(polls.id, input.pollId)).limit(1);

      if (pollData.length === 0) {
        throw new Error("Poll not found");
      }

      const poll = pollData[0];

      if (!poll.isActive) {
        throw new Error("Poll is not active");
      }

      // Check if poll has ended
      if (poll.endDate && new Date() > new Date(poll.endDate)) {
        throw new Error("Poll has ended");
      }

      // Validate multiple choice
      if (!poll.isMultipleChoice && input.optionIds.length > 1) {
        throw new Error("This poll does not allow multiple choices");
      }

      // Check if user/device has already voted (if not anonymous)
      if (input.userId || input.deviceId || input.ipAddress) {
        const existingVotes = await db
          .select()
          .from(pollVotes)
          .where(
            and(
              eq(pollVotes.pollId, input.pollId),
              input.userId
                ? eq(pollVotes.userId, input.userId)
                : input.deviceId
                ? eq(pollVotes.deviceId, input.deviceId)
                : input.ipAddress
                ? eq(pollVotes.ipAddress, input.ipAddress)
                : undefined
            )
          );

        if (existingVotes.length > 0) {
          throw new Error("You have already voted on this poll");
        }
      }

      // Validate option IDs belong to this poll
      const validOptions = await db
        .select()
        .from(pollOptions)
        .where(and(eq(pollOptions.pollId, input.pollId), sql`${pollOptions.id} IN (${input.optionIds.join(",")})`));

      if (validOptions.length !== input.optionIds.length) {
        throw new Error("Invalid option IDs");
      }

      // Insert votes
      for (const optionId of input.optionIds) {
        await db.insert(pollVotes).values({
          pollId: input.pollId,
          optionId: optionId,
          userId: input.userId,
          deviceId: input.deviceId,
          ipAddress: input.ipAddress,
        });

        // Update option vote count
        await db
          .update(pollOptions)
          .set({
            voteCount: sql`${pollOptions.voteCount} + 1`,
          })
          .where(eq(pollOptions.id, optionId));
      }

      // Update total votes count
      await db
        .update(polls)
        .set({
          totalVotes: sql`${polls.totalVotes} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(polls.id, input.pollId));

      return { success: true };
    } catch (error) {
      console.error("Error voting on poll:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to vote on poll");
    }
  });

// Get poll results
export const getResults = publicProcedure
  .input(
    z.object({
      pollId: z.number(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      // Get poll data
      const pollData = await db.select().from(polls).where(eq(polls.id, input.pollId)).limit(1);

      if (pollData.length === 0) {
        throw new Error("Poll not found");
      }

      const poll = pollData[0];

      // Check if results should be shown
      if (!poll.showResults) {
        throw new Error("Poll results are not available");
      }

      // Get options with vote counts
      const options = await db
        .select()
        .from(pollOptions)
        .where(eq(pollOptions.pollId, input.pollId))
        .orderBy(pollOptions.order);

      // Calculate percentages
      const optionsWithPercentages = options.map((option) => ({
        ...option,
        percentage: poll.totalVotes > 0 ? (option.voteCount / poll.totalVotes) * 100 : 0,
      }));

      return {
        poll,
        options: optionsWithPercentages,
        totalVotes: poll.totalVotes,
      };
    } catch (error) {
      console.error("Error getting poll results:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get poll results");
    }
  });

// Check if user has voted
export const hasVoted = publicProcedure
  .input(
    z.object({
      pollId: z.number(),
      userId: z.number().optional(),
      deviceId: z.string().optional(),
      ipAddress: z.string().optional(),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      if (!input.userId && !input.deviceId && !input.ipAddress) {
        return { hasVoted: false };
      }

      const existingVotes = await db
        .select()
        .from(pollVotes)
        .where(
          and(
            eq(pollVotes.pollId, input.pollId),
            input.userId
              ? eq(pollVotes.userId, input.userId)
              : input.deviceId
              ? eq(pollVotes.deviceId, input.deviceId)
              : input.ipAddress
              ? eq(pollVotes.ipAddress, input.ipAddress)
              : undefined
          )
        )
        .limit(1);

      return { hasVoted: existingVotes.length > 0 };
    } catch (error) {
      console.error("Error checking if user has voted:", error);
      return { hasVoted: false };
    }
  });

// Get active polls
export const getActive = publicProcedure
  .input(
    z.object({
      limit: z.number().default(10),
      offset: z.number().default(0),
    })
  )
  .query(async ({ input }: { input: any }) => {
    try {
      const now = new Date();

      const activePolls = await db
        .select({
          poll: polls,
          advertisement: advertisements,
        })
        .from(polls)
        .innerJoin(advertisements, eq(polls.advertisementId, advertisements.id))
        .where(
          and(
            eq(polls.isActive, true),
            eq(advertisements.isActive, true),
            sql`${polls.endDate} IS NULL OR ${polls.endDate} > ${now}`
          )
        )
        .orderBy(desc(polls.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return activePolls;
    } catch (error) {
      console.error("Error getting active polls:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to get active polls");
    }
  });

export const create = publicProcedure
  .input(
    z.object({
      question: z.string(),
      description: z.string().optional(),
      advertisementId: z.number(),
      isMultipleChoice: z.boolean(),
      showResults: z.boolean(),
      isActive: z.boolean(),
      endDate: z.date().optional(),
      options: z.array(
        z.object({
          optionText: z.string(),
          order: z.number(),
        })
      ),
    })
  )
  .mutation(async ({ input }) => {
    const [poll] = await db
      .insert(polls)
      .values({
        question: input.question,
        description: input.description,
        advertisementId: input.advertisementId,
        isMultipleChoice: input.isMultipleChoice,
        showResults: input.showResults,
        isActive: input.isActive,
        endDate: input.endDate,
      })
      .returning();

    for (const option of input.options) {
      await db.insert(pollOptions).values({
        pollId: poll.id,
        optionText: option.optionText,
        order: option.order,
      });
    }

    return poll;
  });

export const update = publicProcedure
  .input(
    z.object({
      id: z.number(),
      question: z.string(),
      description: z.string().optional(),
      advertisementId: z.number(),
      isMultipleChoice: z.boolean(),
      showResults: z.boolean(),
      isActive: z.boolean(),
      endDate: z.date().optional(),
      options: z.array(
        z.object({
          id: z.number().optional(),
          optionText: z.string(),
          order: z.number(),
        })
      ),
    })
  )
  .mutation(async ({ input }) => {
    const [poll] = await db
      .update(polls)
      .set({
        question: input.question,
        description: input.description,
        advertisementId: input.advertisementId,
        isMultipleChoice: input.isMultipleChoice,
        showResults: input.showResults,
        isActive: input.isActive,
        endDate: input.endDate,
      })
      .where(eq(polls.id, input.id))
      .returning();

    const existingOptions = await db.select().from(pollOptions).where(eq(pollOptions.pollId, input.id));
    const newOptionIds = input.options.map((o) => o.id).filter((id) => id !== undefined);

    // Delete options that are no longer in the list
    for (const option of existingOptions) {
      if (!newOptionIds.includes(option.id)) {
        await db.delete(pollOptions).where(eq(pollOptions.id, option.id));
      }
    }

    for (const option of input.options) {
      if (option.id) {
        await db
          .update(pollOptions)
          .set({
            optionText: option.optionText,
            order: option.order,
          })
          .where(eq(pollOptions.id, option.id));
      } else {
        await db.insert(pollOptions).values({
          pollId: input.id,
          optionText: option.optionText,
          order: option.order,
        });
      }
    }

    return poll;
  });

export const deletePoll = publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
  await db.delete(pollVotes).where(eq(pollVotes.pollId, input.id));
  await db.delete(pollOptions).where(eq(pollOptions.pollId, input.id));
  await db.delete(polls).where(eq(polls.id, input.id));
  return { success: true };
});

export const getAll = publicProcedure.query(async () => {
  const allPolls = await db.select().from(polls);
  const allOptions = await db.select().from(pollOptions);

  return allPolls.map((poll) => ({
    ...poll,
    options: allOptions.filter((opt) => opt.pollId === poll.id),
  }));
});
