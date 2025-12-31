import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { inquiries, aiSettings, inquiryReplies } from "../../../../db/schema";
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
 * 🤖 Helper Function: Call External AI API
 * -----------------------------------------------------*/
async function callAI(messages: any[], maxLength: number = 1500): Promise<{
  success: boolean;
  response: string;
  tokensUsed?: number;
  processingTime?: number;
}> {
  const startTime = Date.now();
  try {
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      console.error('❌ AI API error:', response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    let aiResponse = data.completion || 'عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.';
    if (aiResponse.length > maxLength) {
      aiResponse = aiResponse.substring(0, maxLength - 3) + '...';
    }
    return { success: true, response: aiResponse, tokensUsed: data.tokensUsed || 0, processingTime };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error calling AI:', error);
    return { success: false, response: 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.', processingTime };
  }
}

/* -------------------------------------------------------
 * 🤖 Function 2: Trigger Auto-Reply for Inquiry
 * -----------------------------------------------------*/
async function triggerAutoReplyInquiry(inquiry: { id: number; title: string; content: string; category: string; userId: number }) {
  try {
    const settings = await db.query.aiSettings.findFirst({
      where: eq(aiSettings.type, 'inquiries'),
    });

    if (!settings?.isEnabled) {
      console.log('AI auto-reply is disabled for inquiries');
      return;
    }

    const messages = [
      {
        role: 'system',
        content: settings.systemPrompt,
      },
      {
        role: 'user',
        content: `عنوان الاستفسار: ${inquiry.title}\nالفئة: ${inquiry.category}\nمحتوى الاستفسار: ${inquiry.content}\n\nيرجى تقديم رد مهني ودقيق:`, 
      },
    ];

    await new Promise(resolve => setTimeout(resolve, (settings.responseDelay || 15) * 1000));

    const aiResult = await callAI(messages, settings.maxResponseLength || 1500);

    if (aiResult.success) {
      await db.insert(inquiryReplies).values({
        inquiryId: inquiry.id,
        userId: inquiry.userId,
        content: aiResult.response,
        isFromAdmin: false, // AI is not an admin in this context
        isAiGenerated: true,
        createdAt: new Date(),
      });
      // Update inquiry status to "answered"
      await db.update(inquiries).set({
        status: 'answered',
        updatedAt: new Date(),
      }).where(eq(inquiries.id, inquiry.id));
      console.log('✅ AI auto-reply generated and saved for inquiry:', inquiry.id);
    } else {
      console.error('❌ Failed to generate AI auto-reply for inquiry:', inquiry.id, aiResult.response);
    }
  } catch (error) {
    console.error('❌ Error in triggerAutoReplyInquiry:', error);
  }
}

/* -------------------------------------------------------
 * 🚀 TRPC Procedure
 * -----------------------------------------------------*/
export const createInquiryProcedure = protectedProcedure.input(createInquirySchema).mutation(async ({ input }) => {
  try {
    // Step 1: Create inquiry in DB
    const inquiry = await createInquiryInDB(input);

    // Step 2: Trigger AI reply generation in the background
    if (inquiry) {
      // Do not await this, let it run in the background
      triggerAutoReplyInquiry(inquiry).catch(err => console.error("Background AI auto-reply failed:", err));
    }

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
