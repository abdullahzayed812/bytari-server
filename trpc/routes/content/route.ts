import { publicProcedure, createTRPCRouter } from "../../create-context";
import { db, tips, vetMagazines, vetBooks } from "../../../db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const contentRouter = createTRPCRouter({
  getTipById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const tip = await db.select().from(tips).where(eq(tips.id, input.id));
    return {
      success: true,
      tip: tip[0],
    };
  }),

  likeTip: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // In a real app, you would update the database here
    console.log(`Liking tip with id ${input.id}`);
    return { success: true };
  }),

  getArticleById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const article = await db.select().from(vetMagazines).where(eq(vetMagazines.id, input.id));
    return {
      success: true,
      article: article[0],
    };
  }),

  likeArticle: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // In a real app, you would update the database here
    console.log(`Liking article with id ${input.id}`);
    return { success: true };
  }),

  getBookById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const book = await db.select().from(vetBooks).where(eq(vetBooks.id, input.id));
    return {
      success: true,
      book: book[0],
    };
  }),

  downloadBook: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // In a real app, you would handle the download logic here
    console.log(`Downloading book with id ${input.id}`);
    return { success: true };
  }),

  toggleArticleHomeVisibility: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // In a real app, you would update the database here
    console.log(`Toggling home visibility for article with id ${input.id}`);
    return { success: true };
  }),

  deleteArticle: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // In a real app, you would delete the article from the database here
    console.log(`Deleting article with id ${input.id}`);
    return { success: true };
  }),

  toggleTipHomeVisibility: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // In a real app, you would update the database here
    console.log(`Toggling home visibility for tip with id ${input.id}`);
    return { success: true };
  }),

  deleteTip: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    // In a real app, you would delete the tip from the database here
    console.log(`Deleting tip with id ${input.id}`);
    return { success: true };
  }),

  listTips: publicProcedure.query(async () => {
    const tipsList = await db
      .select()
      .from(tips)
      .where(eq(tips.isPublished, true))
      .orderBy(desc(tips.createdAt))
      .limit(10);
    return {
      success: true,
      tips: tipsList,
    };
  }),

  listMagazineArticles: publicProcedure.query(async () => {
    const articles = await db
      .select()
      .from(vetMagazines)
      .where(eq(vetMagazines.isPublished, true))
      .orderBy(desc(vetMagazines.createdAt))
      .limit(10);

    return {
      success: true,
      articles,
    };
  }),

  listVetBooks: publicProcedure.query(async () => {
    const books = await db
      .select()
      .from(vetBooks)
      .where(eq(vetBooks.isPublished, true))
      .orderBy(desc(vetBooks.createdAt))
      .limit(10);
    return {
      success: true,
      books,
    };
  }),
});
