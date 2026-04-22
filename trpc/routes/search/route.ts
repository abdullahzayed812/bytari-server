import { z } from "zod";
import { publicProcedure } from "../../create-context";
import { db } from "../../../db";
import { sql } from "drizzle-orm";

type SearchRow = {
  type: "clinic" | "store" | "tip" | "magazine" | "book";
  id: string;
  title: string;
  subtitle: string | null;
  extra: string | null;
};

export const searchProcedure = publicProcedure
  .input(z.object({ query: z.string().min(2).max(100) }))
  .query(async ({ input }) => {
    const q = `%${input.query.trim()}%`;

    // Single round-trip via UNION ALL — each branch limited to 8 rows
    const rows = await db.execute<SearchRow>(sql`
      (
        SELECT 'clinic' AS type, id::text, name AS title, address AS subtitle, phone AS extra
        FROM clinics
        WHERE is_active = true AND (name ILIKE ${q} OR address ILIKE ${q})
        ORDER BY
          CASE WHEN name ILIKE ${q} THEN 0 ELSE 1 END,
          name
        LIMIT 8
      )
      UNION ALL
      (
        SELECT 'store', id::text, name, description, logo
        FROM stores
        WHERE is_active = true AND (name ILIKE ${q} OR description ILIKE ${q})
        ORDER BY
          CASE WHEN name ILIKE ${q} THEN 0 ELSE 1 END,
          name
        LIMIT 8
      )
      UNION ALL
      (
        SELECT 'tip', id::text, title, summary, category
        FROM tips
        WHERE is_published = true
          AND (title ILIKE ${q} OR summary ILIKE ${q} OR category ILIKE ${q})
        ORDER BY
          CASE WHEN title ILIKE ${q} THEN 0 ELSE 1 END,
          title
        LIMIT 8
      )
      UNION ALL
      (
        SELECT 'magazine', id::text, title, description, author
        FROM vet_magazines
        WHERE is_published = true
          AND (title ILIKE ${q} OR description ILIKE ${q} OR category ILIKE ${q} OR author ILIKE ${q})
        ORDER BY
          CASE WHEN title ILIKE ${q} THEN 0 ELSE 1 END,
          title
        LIMIT 8
      )
      UNION ALL
      (
        SELECT 'book', id::text, title, description, author
        FROM vet_books
        WHERE is_published = true
          AND (title ILIKE ${q} OR description ILIKE ${q} OR category ILIKE ${q} OR author ILIKE ${q})
        ORDER BY
          CASE WHEN title ILIKE ${q} THEN 0 ELSE 1 END,
          title
        LIMIT 8
      )
    `);

    const clinics: any[] = [];
    const stores: any[] = [];
    const tips: any[] = [];
    const magazines: any[] = [];
    const books: any[] = [];

    for (const row of rows) {
      if (row.type === "clinic") {
        clinics.push({ id: row.id, name: row.title, address: row.subtitle, phone: row.extra });
      } else if (row.type === "store") {
        stores.push({ id: row.id, name: row.title, description: row.subtitle, logo: row.extra });
      } else if (row.type === "tip") {
        tips.push({ id: row.id, title: row.title, summary: row.subtitle, category: row.extra });
      } else if (row.type === "magazine") {
        magazines.push({ id: row.id, title: row.title, description: row.subtitle, author: row.extra });
      } else {
        books.push({ id: row.id, title: row.title, description: row.subtitle, author: row.extra });
      }
    }

    return { clinics, stores, tips, magazines, books };
  });
