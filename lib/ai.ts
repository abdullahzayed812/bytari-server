
/* -------------------------------------------------------
 * 🤖 Helper Function: Call External AI API
 * -----------------------------------------------------*/
export async function callAI(
  messages: any[],
): Promise<{
  success: boolean;
  response: string;
  tokensUsed?: number;
  processingTime?: number;
}> {
  const startTime = Date.now();
  try {
    const response = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      console.error("❌ AI API error:", response.status, response.statusText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;
    const aiResponse = data.completion || "عذراً، لم أتمكن من تقديم رد مناسب في الوقت الحالي.";
    return { success: true, response: aiResponse, tokensUsed: data.tokensUsed || 0, processingTime };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Error calling AI:", error);
    return {
      success: false,
      response: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى لاحقاً.",
      processingTime,
    };
  }
}
