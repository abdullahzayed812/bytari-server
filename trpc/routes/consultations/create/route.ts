import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { db } from "../../../../db";
import { consultations } from "../../../../db/schema";
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
 * 🤖 Function 2: AI Consultation Reply Generator
 * -----------------------------------------------------*/
async function generateAIConsultationReply(consultation: { id: number; category: string; description: string }) {
  try {
    console.log("🤖 Generating AI reply for consultation:", consultation.id);

    const aiResponse = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "أنت طبيب بيطري خبير ومساعد ذكي متخصص في الاستشارات البيطرية. قدم نصائح دقيقة ومهنية وشاملة حول رعاية الحيوانات الأليفة.",
          },
          {
            role: "user",
            content: `نوع الحيوان: ${consultation.category}\nالسؤال: ${consultation.description}\n\nيرجى تقديم إجابة مهنية ومفصلة.`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) throw new Error("AI API request failed");

    const aiData = await aiResponse.json();
    const aiReply = aiData.completion || "عذراً، لم أتمكن من توليد إجابة مناسبة في الوقت الحالي.";

    // 💾 Update consultation with AI reply and mark as answered
    await db
      .update(consultations)
      .set({
        status: "answered",
        symptoms: aiReply, // Temporary: use this field until you add a `response` column
        updatedAt: new Date(),
      })
      .where(eq(consultations.id, consultation.id));

    console.log("✅ AI reply saved for consultation:", consultation.id);
    return aiReply;
  } catch (err) {
    console.error("❌ Error generating AI reply:", err);
    return null;
  }
}

/* -------------------------------------------------------
 * 🚀 TRPC Procedure
 * -----------------------------------------------------*/
export const createConsultationProcedure = publicProcedure
  .input(createConsultationSchema)
  .mutation(async ({ input }) => {
    try {
      // Step 1: Create consultation in DB
      const consultation = await createConsultationInDB(input);

      // Step 2: Generate AI reply in the background
      // setTimeout(() => generateAIConsultationReply(consultation), 5000);

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
