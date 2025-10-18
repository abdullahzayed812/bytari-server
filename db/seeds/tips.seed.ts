import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { tips } from "../schema";
import { logStep } from "./helpers";

export async function seedTips(db: NodePgDatabase<any>, superAdmin: any) {
  console.log("💡 Seeding tips...");

  const tipsData = [
    {
      authorId: superAdmin.id,
      title: "كيفية العناية بالقطط في فصل الشتاء",
      content:
        "القطط تحتاج إلى عناية خاصة في فصل الشتاء. تأكد من توفير مكان دافئ وجاف للقطة، وقدم لها طعاماً غنياً بالسعرات الحرارية. احرص على فحص أذنيها وكفوفها بانتظام للتأكد من عدم إصابتها بقضمة الصقيع.",
      summary: "نصائح للعناية بالقطط خلال فصل الشتاء البارد",
      category: "cats",
      tags: JSON.stringify(["قطط", "شتاء", "عناية"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400"]),
      isPublished: true,
      viewCount: 1245,
      likeCount: 342,
    },
    {
      authorId: superAdmin.id,
      title: "التطعيمات الأساسية للكلاب",
      content:
        "التطعيمات ضرورية لحماية كلبك من الأمراض الخطيرة. التطعيمات الأساسية تشمل: السعار، والبارفو، والديستمبر. يجب أن يبدأ جدول التطعيم عندما يكون الجرو بعمر 6-8 أسابيع، مع جرعات معززة كل 3-4 أسابيع حتى عمر 16 أسبوعاً.",
      summary: "دليل شامل للتطعيمات الضرورية للكلاب",
      category: "dogs",
      tags: JSON.stringify(["كلاب", "تطعيمات", "صحة"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1552053831-71594a27632d?w=400"]),
      isPublished: true,
      viewCount: 2134,
      likeCount: 567,
    },
    {
      authorId: superAdmin.id,
      title: "التغذية السليمة للأرانب",
      content:
        "الأرانب تحتاج إلى نظام غذائي متوازن يعتمد بشكل أساسي على التبن (القش). يجب أن يشكل التبن 80% من النظام الغذائي، مع إضافة الخضروات الطازجة والكريات المخصصة للأرانب. تجنب إطعامها الخضروات الغنية بالسكر بكميات كبيرة.",
      summary: "كيفية تغذية الأرانب بشكل صحي ومتوازن",
      category: "rabbits",
      tags: JSON.stringify(["أرانب", "تغذية", "رعاية"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=400"]),
      isPublished: true,
      viewCount: 876,
      likeCount: 198,
    },
    {
      authorId: superAdmin.id,
      title: "علامات المرض في الطيور الأليفة",
      content:
        "راقب هذه العلامات التي تدل على مرض الطائر: فقدان الشهية، الريش المنفوش، الخمول، التنفس الصعب، تغير لون البراز. إذا لاحظت أياً من هذه الأعراض، استشر الطبيب البيطري فوراً.",
      summary: "كيفية اكتشاف المرض في الطيور المنزلية",
      category: "birds",
      tags: JSON.stringify(["طيور", "صحة", "أعراض"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400"]),
      isPublished: true,
      viewCount: 654,
      likeCount: 145,
    },
    {
      authorId: superAdmin.id,
      title: "كيفية تنظيف أسنان الكلاب",
      content:
        "صحة الأسنان مهمة جداً للكلاب. استخدم فرشاة أسنان خاصة بالكلاب ومعجون أسنان مصمم لها (لا تستخدم معجون الأسنان البشري أبداً). ابدأ ببطء وكافئ كلبك بعد كل جلسة. يُنصح بتنظيف الأسنان يومياً أو على الأقل 3 مرات أسبوعياً.",
      summary: "دليل خطوة بخطوة لتنظيف أسنان الكلاب",
      category: "dogs",
      tags: JSON.stringify(["كلاب", "أسنان", "نظافة"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400"]),
      isPublished: true,
      viewCount: 1543,
      likeCount: 423,
    },
    {
      authorId: superAdmin.id,
      title: "التعامل مع القطط العدوانية",
      content:
        "العدوانية في القطط قد تكون ناتجة عن الخوف، الألم، أو الإقليمية. لا تعاقب القطة أبداً، بل حاول فهم سبب السلوك. وفر لها مساحة آمنة، والعب معها بانتظام، واستشر الطبيب البيطري لاستبعاد الأسباب الطبية.",
      summary: "كيفية التعامل مع السلوك العدواني في القطط",
      category: "cats",
      tags: JSON.stringify(["قطط", "سلوك", "تدريب"]),
      images: JSON.stringify(["https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400"]),
      isPublished: true,
      viewCount: 987,
      likeCount: 234,
    },
  ];

  const createdTips = await db.insert(tips).values(tipsData).returning();

  logStep(`Created ${createdTips.length} tips\n`);
  return createdTips;
}
