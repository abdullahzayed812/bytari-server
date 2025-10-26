import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { inquiries } from "../../../../db/schema";
import { eq } from "drizzle-orm";

/* -------------------------------------------------------
 * 🧩 Zod Validation Schema
 * -----------------------------------------------------*/
const createInquirySchema = z.object({
  userId: z.number(),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  attachments: z.string().optional(),
});

/* -------------------------------------------------------
 * 📦 Function 1: Create Inquiry in DB
 * -----------------------------------------------------*/
async function createInquiryInDB(input: {
  userId: number;
  title: string;
  content: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  attachments?: string;
}) {
  const urgency =
    input.priority === "urgent"
      ? "high"
      : input.priority === "high"
      ? "high"
      : input.priority === "low"
      ? "low"
      : "medium";

  const [inquiry] = await db
    .insert(inquiries)
    .values({
      userId: input.userId,
      title: input.title,
      content: input.content,
      category: input.category,
      priority: urgency,
      attachments: input.attachments ? JSON.parse(input.attachments) : null,
      status: "pending",
    })
    .returning();

  console.log("✅ Inquiry saved in DB:", inquiry);
  return inquiry;
}

/* -------------------------------------------------------
 * 🤖 Function 2: AI Inquiry Reply Generator
 * -----------------------------------------------------*/
async function generateAIInquiryReply(inquiry: { id: number; category: string; content: string; title: string }) {
  try {
    console.log("🤖 Generating AI reply for inquiry:", inquiry.id);

    const aiResponse = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "أنت مساعد ذكي متخصص في الرد على استفسارات الأطباء البيطريين والطلاب. قدم إجابات دقيقة ومهنية وعلمية حول الطب البيطري.",
          },
          {
            role: "user",
            content: `عنوان الاستفسار: ${inquiry.title}\nالفئة: ${inquiry.category}\nمحتوى الاستفسار: ${inquiry.content}\n\nيرجى تقديم رد مهني ودقيق:`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) throw new Error("AI API request failed");

    const aiData = await aiResponse.json();
    const aiReply = aiData.completion || "عذراً، لم أتمكن من توليد إجابة مناسبة في الوقت الحالي.";

    // 💾 Update inquiry with AI reply and mark as answered
    await db
      .update(inquiries)
      .set({
        status: "answered",
        content: aiReply, // Overwrite content with AI reply (or add a response column if preferred)
        updatedAt: new Date(),
      })
      .where(eq(inquiries.id, inquiry.id));

    console.log("✅ AI reply saved for inquiry:", inquiry.id);
    return aiReply;
  } catch (err) {
    console.error("❌ Error generating AI reply:", err);
    return null;
  }
}

/* -------------------------------------------------------
 * 🚀 TRPC Procedure
 * -----------------------------------------------------*/
export const createInquiryProcedure = publicProcedure.input(createInquirySchema).mutation(async ({ input }) => {
  try {
    // Step 1: Create inquiry in DB
    const inquiry = await createInquiryInDB(input);

    // Step 2: Generate AI reply in the background
    // setTimeout(() => generateAIInquiryReply(inquiry), 5000);

    // Step 3: Respond to client immediately
    return {
      success: true,
      inquiry,
      message: "تم إرسال الاستفسار بنجاح. سيتم الرد عليه قريباً.",
    };
  } catch (error) {
    console.error("❌ Error creating inquiry:", error);
    throw new Error("فشل في إرسال الاستفسار. يرجى المحاولة مرة أخرى.");
  }
});
