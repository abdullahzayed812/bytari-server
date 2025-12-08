import { publicProcedure, createTRPCRouter, protectedProcedure } from "../../create-context";
import { db, tips, vetMagazines, vetBooks, users, comments, likes } from "../../../db";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

export const contentRouter = createTRPCRouter({
  // ==================== TIPS ====================
  getTipById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const tip = await db.select().from(tips).where(eq(tips.id, input.id));

    if (!tip[0]) {
      throw new Error("Tip not found");
    }

    // Increment view count
    await db
      .update(tips)
      .set({ viewCount: sql`${tips.viewCount} + 1` })
      .where(eq(tips.id, input.id));

    return {
      success: true,
      tip: tip[0],
    };
  }),

  listTips: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          isPublished: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { category, isPublished } = input;

      const conditions = [];

      if (isPublished) conditions.push(eq(vetMagazines.isPublished, isPublished));
      if (category) conditions.push(eq(vetMagazines.category, category));

      const tipsList = await db
        .select()
        .from(tips)
        .where(and(...conditions))
        .orderBy(desc(tips.createdAt));

      return {
        success: true,
        tips: tipsList,
      };
    }),

  likeTip: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db
      .update(tips)
      .set({ likeCount: sql`${tips.likeCount} + 1` })
      .where(eq(tips.id, input.id));

    return { success: true };
  }),

  toggleTipHomeVisibility: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const tip = await db.select().from(tips).where(eq(tips.id, input.id));

    if (!tip[0]) {
      throw new Error("Tip not found");
    }

    await db.update(tips).set({ isPublished: !tip[0].isPublished }).where(eq(tips.id, input.id));

    return { success: true };
  }),

  deleteTip: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(tips).where(eq(tips.id, input.id));
    return { success: true };
  }),

  createTip: publicProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        summary: z.string().optional(),
        category: z.string(),
        tags: z.array(z.string()).optional(),
        images: z.array(z.string()).optional(),
        isPublished: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newTip] = await db
        .insert(tips)
        .values({
          ...input,
          authorId: ctx.user?.id || null,
          tags: input.tags ? JSON.stringify(input.tags) : null,
          images: input.images ? JSON.stringify(input.images) : null,
        })
        .returning();

      return {
        success: true,
        tip: newTip,
      };
    }),

  updateTip: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        summary: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        images: z.array(z.string()).optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const dataToUpdate: any = { ...updateData };
      if (input.tags) {
        dataToUpdate.tags = JSON.stringify(input.tags);
      }
      if (input.images) {
        dataToUpdate.images = JSON.stringify(input.images);
      }

      const [updatedTip] = await db.update(tips).set(dataToUpdate).where(eq(tips.id, id)).returning();

      return {
        success: true,
        tip: updatedTip,
      };
    }),

  // ==================== MAGAZINE ARTICLES ====================
  getArticleById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const article = await db.select().from(vetMagazines).where(eq(vetMagazines.id, input.id));

    if (!article[0]) {
      throw new Error("Article not found");
    }

    // Increment download count (used as view count)
    await db
      .update(vetMagazines)
      .set({ downloadCount: sql`${vetMagazines.downloadCount} + 1` })
      .where(eq(vetMagazines.id, input.id));

    return {
      success: true,
      article: article[0],
    };
  }),

  listMagazineArticles: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          isPublished: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { category, isPublished } = input;

      const conditions = [];

      if (isPublished) conditions.push(eq(vetMagazines.isPublished, isPublished));
      if (category) conditions.push(eq(vetMagazines.category, category));

      const articles = await db
        .select()
        .from(vetMagazines)
        .where(and(...conditions))
        .orderBy(desc(vetMagazines.createdAt));

      const articlesWithStats = await Promise.all(
        articles.map(async (article) => {
          const likeCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(likes)
            .where(eq(likes.articleId, article.id));

          const commentCountResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(comments)
            .where(eq(comments.articleId, article.id));

          return {
            ...article,
            author: article.author || "مؤلف غير معروف",
            authorTitle: article.authorTitle || "كاتب",
            image: article.coverImage || "",
            likes: Number(likeCountResult[0]?.count || 0),
            comments: Number(commentCountResult[0]?.count || 0),
            isSelectedForHome: article.isPublished,
          };
        })
      );

      return {
        success: true,
        articles: articlesWithStats,
      };
    }),

  toggleArticleHomeVisibility: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const article = await db.select().from(vetMagazines).where(eq(vetMagazines.id, input.id));

    if (!article[0]) {
      throw new Error("Article not found");
    }

    await db.update(vetMagazines).set({ isPublished: !article[0].isPublished }).where(eq(vetMagazines.id, input.id));

    return { success: true };
  }),

  deleteArticle: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(vetMagazines).where(eq(vetMagazines.id, input.id));
    return { success: true };
  }),

  createArticle: publicProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.string(),
        issueNumber: z.number().optional(),
        volume: z.number().optional(),
        publishedDate: z.date().optional(),
        coverImage: z.string().optional(),
        author: z.string().optional(),
        authorTitle: z.string().optional(),
        filePath: z.string().optional(),
        language: z.string().optional().default("ar"),
        pageCount: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isPublished: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newArticle] = await db
        .insert(vetMagazines)
        .values({
          ...input,
          uploadedBy: ctx.user?.id || null,
          tags: input.tags ? JSON.stringify(input.tags) : null,
        })
        .returning();

      return {
        success: true,
        article: newArticle,
      };
    }),

  updateArticle: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        issueNumber: z.number().optional(),
        volume: z.number().optional(),
        publishedDate: z.date().optional(),
        coverImage: z.string().optional(),
        author: z.string().optional(),
        authorTitle: z.string().optional(),
        filePath: z.string().optional(),
        language: z.string().optional(),
        pageCount: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const dataToUpdate: any = { ...updateData };
      if (input.tags) {
        dataToUpdate.tags = JSON.stringify(input.tags);
      }

      const [updatedArticle] = await db
        .update(vetMagazines)
        .set(dataToUpdate)
        .where(eq(vetMagazines.id, id))
        .returning();

      return {
        success: true,
        article: updatedArticle,
      };
    }),

  getAvailableArticles: publicProcedure.input(z.object({}).optional()).query(async () => {
    // This would return articles that are published but not yet selected for home
    // In a real implementation, you might have a separate field or table for home selection
    const articles = await db
      .select()
      .from(vetMagazines)
      .where(eq(vetMagazines.isPublished, true))
      .orderBy(desc(vetMagazines.createdAt));

    return {
      success: true,
      articles: articles.map((article) => ({
        ...article,
        author: article.uploadedBy?.toString() || "مؤلف غير معروف",
        authorTitle: "كاتب",
        image: article.coverImage || "",
        likes: 0,
        comments: 0,
        isSelectedForHome: false,
      })),
    };
  }),

  // ==================== BOOKS ====================
  getBookById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const book = await db.select().from(vetBooks).where(eq(vetBooks.id, input.id));

    if (!book[0]) {
      throw new Error("Book not found");
    }

    return {
      success: true,
      book: book[0],
    };
  }),

  listVetBooks: publicProcedure
    .input(
      z
        .object({
          category: z.string().optional(),
          isPublished: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { isPublished } = input;

      const conditions = [];

      if (isPublished) conditions.push(eq(vetMagazines.isPublished, isPublished));
      // if (category) conditions.push(eq(vetMagazines.category, category));

      const books = await db
        .select()
        .from(vetBooks)
        .where(and(...conditions))
        .orderBy(desc(vetBooks.createdAt));

      return {
        success: true,
        books,
      };
    }),

  downloadBook: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db
      .update(vetBooks)
      .set({ downloadCount: sql`${vetBooks.downloadCount} + 1` })
      .where(eq(vetBooks.id, input.id));

    const book = await db.select().from(vetBooks).where(eq(vetBooks.id, input.id));

    return {
      success: true,
      book: book[0],
    };
  }),

  createBook: publicProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        author: z.string().optional(),
        category: z.string(),
        isbn: z.string().optional(),
        filePath: z.string().optional(),
        coverImage: z.string().optional(),
        language: z.string().optional().default("ar"),
        pageCount: z.number().optional(),
        publishedYear: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isPublished: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const [newBook] = await db
        .insert(vetBooks)
        .values({
          ...input,
          uploadedBy: ctx.user.id || null,
          tags: input.tags ? JSON.stringify(input.tags) : null,
        })
        .returning();

      return {
        success: true,
        book: newBook,
      };
    }),

  updateBook: publicProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        author: z.string().optional(),
        category: z.string().optional(),
        isbn: z.string().optional(),
        filePath: z.string().optional(),
        coverImage: z.string().optional(),
        language: z.string().optional(),
        pageCount: z.number().optional(),
        publishedYear: z.number().optional(),
        tags: z.array(z.string()).optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      const dataToUpdate: any = { ...updateData };
      if (input.tags) {
        dataToUpdate.tags = JSON.stringify(input.tags);
      }

      const [updatedBook] = await db.update(vetBooks).set(dataToUpdate).where(eq(vetBooks.id, id)).returning();

      return {
        success: true,
        book: updatedBook,
      };
    }),

  toggleBookHomeVisibility: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const book = await db.select().from(vetBooks).where(eq(vetBooks.id, input.id));

    if (!book[0]) {
      throw new Error("Book not found");
    }

    await db.update(vetBooks).set({ isPublished: !book[0].isPublished }).where(eq(vetBooks.id, input.id));

    return { success: true };
  }),

  // ==================== COMMENTS & LIKES ====================
  addComment: protectedProcedure
    .input(
      z.object({
        articleId: z.number(),
        content: z.string(),
        parentId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx?.user?.id) return { success: false, message: "Unauthorized" };

      const [comment] = await db
        .insert(comments)
        .values({
          userId: ctx.user?.id,
          articleId: input.articleId,
          content: input.content,
          parentId: input.parentId,
        })
        .returning();

      return { success: true, comment };
    }),

  getComments: publicProcedure.input(z.object({ articleId: z.number() })).query(async ({ input }) => {
    const commentsList = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        parentId: comments.parentId,
        user: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.articleId, input.articleId))
      .orderBy(desc(comments.createdAt));

    return { success: true, comments: commentsList };
  }),

  deleteComment: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    // Check ownership
    const comment = await db.select().from(comments).where(eq(comments.id, input.id));
    if (!comment[0]) throw new Error("Comment not found");

    // Allow admin or owner to delete
    // if (comment[0].userId !== ctx.user?.id && !ctx.user?.isAdmin) {
    //   throw new Error("Unauthorized");
    // }

    await db.delete(comments).where(eq(comments.id, input.id));
    return { success: true };
  }),

  toggleLike: publicProcedure.input(z.object({ articleId: z.number() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id || 1;
    const existingLike = await db
      .select()
      .from(likes)
      .where(and(eq(likes.articleId, input.articleId), eq(likes.userId, userId)));

    let isLiked = false;

    if (existingLike.length > 0) {
      await db.delete(likes).where(eq(likes.id, existingLike[0].id));
      isLiked = false;
    } else {
      await db.insert(likes).values({
        userId: userId,
        articleId: input.articleId,
      });
      isLiked = true;
    }

    // Update rating/like count on article for sorting/display
    // We can use a subquery or just increment/decrement
    if (isLiked) {
      await db
        .update(vetMagazines)
        .set({ rating: sql`COALESCE(${vetMagazines.rating}, 0) + 1` })
        .where(eq(vetMagazines.id, input.articleId));
    } else {
      await db
        .update(vetMagazines)
        .set({ rating: sql`GREATEST(COALESCE(${vetMagazines.rating}, 0) - 1, 0)` })
        .where(eq(vetMagazines.id, input.articleId));
    }

    return { success: true, isLiked };
  }),

  getArticleStats: publicProcedure.input(z.object({ articleId: z.number() })).query(async ({ input, ctx }) => {
    const userId = ctx.user?.id;

    // Get like count
    const likeCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(likes)
      .where(eq(likes.articleId, input.articleId));

    // Get comment count
    const commentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.articleId, input.articleId));

    // Check if user liked
    let isLiked = false;
    if (userId) {
      const userLike = await db
        .select()
        .from(likes)
        .where(and(eq(likes.articleId, input.articleId), eq(likes.userId, userId)));
      isLiked = userLike.length > 0;
    }

    return {
      success: true,
      likes: Number(likeCountResult[0]?.count || 0),
      comments: Number(commentCountResult[0]?.count || 0),
      isLiked,
    };
  }),

  deleteBook: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(vetBooks).where(eq(vetBooks.id, input.id));
    return { success: true };
  }),
});
