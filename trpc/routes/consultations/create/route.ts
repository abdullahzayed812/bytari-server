import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { consultations, aiSettings, consultationReplies } from "../../../../db/schema";
import { eq } from "drizzle-orm";

/* -------------------------------------------------------
 * 🧩 Zod Validation Schema
 * -----------------------------------------------------*/
const createConsultationSchema = z.object({
  userId: z.number(),
  petType: z.string().min(1),
  question: z.string().min(1),
  attachments: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

/* -------------------------------------------------------
 * 📦 Function 1: Create Consultation in DB
 * -----------------------------------------------------*/
async function createConsultationInDB(input: {
  userId: number;
  petType: string;
  question: string;
  attachments?: string;
  priority: "low" | "normal" | "high" | "urgent";
}) {
  const urgency =
    input.priority === "urgent"
      ? "emergency"
      : input.priority === "high"
        ? "high"
        : input.priority === "low"
          ? "low"
          : "medium";

  const [consultation] = await db
    .insert(consultations)
    .values({
      userId: input.userId,
      title: `استشارة ${input.petType}`,
      description: input.question,
      category: input.petType,
      urgencyLevel: urgency,
      attachments: input.attachments ? JSON.parse(input.attachments) : null,
      status: "pending",
    })
    .returning();

  console.log("✅ Consultation saved in DB:", consultation);
  return consultation;
}

/* -------------------------------------------------------
 * 🤖 Helper Function: Call External AI API
 * -----------------------------------------------------*/
async function callAI(messages: any[]): Promise<{
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
    const aiResponse = data.completion || 'عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.';
    return { success: true, response: aiResponse, tokensUsed: data.tokensUsed || 0, processingTime };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Error calling AI:', error);
    return { success: false, response: 'عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.', processingTime };
  }
}

/* -------------------------------------------------------
 * 🤖 Function 2: Trigger Auto-Reply for Consultation
 * -----------------------------------------------------*/
async function triggerAutoReplyConsultation(consultation: { id: number; category: string; description: string; userId: number }) {
  try {
    const settings = await db.query.aiSettings.findFirst({
      where: eq(aiSettings.type, 'consultations'),
    });

    if (!settings?.isEnabled) {
      console.log('AI auto-reply is disabled for consultations');
      return;
    }

    const messages = [
      {
        role: 'system',
        content: settings.systemPrompt,
      },
      {
        role: 'user',
        content: `نوع الحيوان: ${consultation.category}\nالسؤال: ${consultation.description}\n\nيرجى تقديم رد مفيد ومهني:`,
      },
    ];

    await new Promise(resolve => setTimeout(resolve, (settings.responseDelay || 15) * 1000));

    const aiResult = await callAI(messages);

    if (aiResult.success) {
      await db.insert(consultationReplies).values({
        consultationId: consultation.id,
        userId: consultation.userId,
        content: aiResult.response,
        isFromAdmin: false,
        isAiGenerated: true,
        createdAt: new Date(),
      });
      // Update consultation status to "answered"
      await db.update(consultations).set({
        status: 'answered',
        updatedAt: new Date(),
      }).where(eq(consultations.id, consultation.id));
      console.log('✅ AI auto-reply generated and saved for consultation:', consultation.id);
    } else {
      console.error('❌ Failed to generate AI auto-reply for consultation:', consultation.id, aiResult.response);
    }
  } catch (error) {
    console.error('❌ Error in triggerAutoReplyConsultation:', error);
  }
}

/* -------------------------------------------------------
 * 🚀 TRPC Procedure
 * -----------------------------------------------------*/
export const createConsultationProcedure = protectedProcedure
  .input(createConsultationSchema)
  .mutation(async ({ input }) => {
    try {
      // Step 1: Create consultation in DB
      const consultation = await createConsultationInDB(input);

      // Step 2: Trigger AI reply generation in the background
      if (consultation) {
        // Do not await this, let it run in the background
        triggerAutoReplyConsultation(consultation).catch(err => console.error("Background AI auto-reply failed:", err));
      }

      // Step 3: Respond to mobile client
      return {
        success: true,
        consultation,
        message: "تم إرسال الاستشارة بنجاح. سيتم الرد عليها قريباً.",
      };
    } catch (error) {
      console.error("❌ Error creating consultation:", error);
      throw new Error("فشل في إرسال الاستشارة. يرجى المحاولة مرة أخرى.");
    }
  });
