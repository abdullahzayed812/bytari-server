import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { inquiries, inquiryReplies } from "../schema";
import { logStep } from "./helpers";

export async function seedInquiries(db: NodePgDatabase<any>, users: { id: string }[], vets: { id: string }[]) {
  console.log("📰 Seeding inquiries...");

  const inquiriesData = [
    {
      userId: vets[0].id, // user1@example.com
      title: "استفسار بخصوص قطتي",
      content: "مرحباً، قطتي تعاني من فقدان الشهية منذ يومين، هل هذا طبيعي؟",
      category: "general",
      petName: "مشمش",
      isResolved: false,
      isConversationOpen: true,
    },
    {
      userId: vets[0].id, // user2@example.com
      title: "سؤال عن تطعيمات الكلاب",
      content: "ما هي التطعيمات الضرورية لجرو عمره 3 أشهر؟",
      category: "general",
      petName: "ماكس",
      isResolved: true,
      isConversationOpen: false,
    },
    {
      userId: users[2].id, // user3@example.com
      title: "مشكلة سلوكية مع كلبي",
      content: "كلبي ينبح بشكل مستمر في الليل، ما السبب وكيف يمكنني التعامل معه؟",
      category: "behavior",
      petName: "ريكس",
      isResolved: false,
      isConversationOpen: true,
    },
    {
      userId: users[4].id, // user5@example.com
      title: "تغذية أرنبي الأليف",
      content: "ما هي الأطعمة المناسبة لأرنب يبلغ من العمر 6 أشهر؟",
      category: "nutrition",
      petName: "باني",
      isResolved: false,
      isConversationOpen: true,
    },
    {
      userId: users[5].id, // user6@example.com
      title: "إصابة طارئة لقطتي",
      content: "قطتي سقطت من الشرفة وتعرج الآن، ماذا أفعل؟",
      category: "emergency",
      petName: "لونا",
      isResolved: false,
      isConversationOpen: true,
    },
    {
      userId: users[6].id, // user7@example.com
      title: "مشكلة في عيون كلبي",
      content: "ألاحظ إفرازات في عيون كلبي، هل هذا خطير؟",
      category: "ophthalmology",
      petName: "بيلا",
      isResolved: false,
      isConversationOpen: true,
    },
    {
      userId: users[8].id, // user9@example.com
      title: "أمراض الدجاج",
      content: "لدي دجاجة تبدو مريضة ولا تأكل، ما الذي يمكن أن يكون؟",
      category: "diseases",
      petName: "كوكو",
      isResolved: true,
      isConversationOpen: false,
    },
    {
      userId: users[9].id, // user10@example.com
      title: "جراحة لكلبي",
      content: "كلبي بحاجة إلى جراحة لإزالة ورم، ما هي المخاطر؟",
      category: "surgery",
      petName: "روكي",
      isResolved: false,
      isConversationOpen: true,
    },
    {
      userId: users[10].id, // user11@example.com
      title: "مشكلة أسنان قطتي",
      content: "قطتي تواجه صعوبة في الأكل، هل يمكن أن تكون مشكلة أسنان؟",
      category: "dentistry",
      petName: "سيمبا",
      isResolved: false,
      isConversationOpen: true,
    },
    {
      userId: users[12].id, // user13@example.com
      title: "مشكلة هضمية لدى ببغائي",
      content: "ببغائي يعاني من إسهال، ما الذي يجب أن أفعل؟",
      category: "diseases",
      petName: "زازو",
      isResolved: false,
      isConversationOpen: true,
    },
  ];

  const createdInquiries = await db.insert(inquiries).values(inquiriesData).returning();

  const repliesData = [
    {
      inquiryId: createdInquiries[0].id, // Cat appetite
      userId: vets[0].id, // vet1@example.com
      content: "أهلاً بك، فقدان الشهية قد يكون علامة على مشكلة صحية. يفضل فحص القطة من قبل طبيب بيطري.",
    },
    {
      inquiryId: createdInquiries[1].id, // Dog vaccinations
      userId: vets[1].id, // vet2@example.com
      content: "التطعيمات الأساسية تشمل تطعيم السعار والبارفو. استشر طبيبك البيطري لوضع جدول تطعيمات مناسب.",
    },
    {
      inquiryId: createdInquiries[2].id, // Dog barking
      userId: vets[3].id, // vet4@example.com
      content: "النباح المستمر قد يكون بسبب القلق أو الحاجة إلى التدريب. جرب تهيئة بيئة هادئة واستشر مدرب سلوكي.",
    },
    {
      inquiryId: createdInquiries[2].id, // Dog barking (second reply)
      userId: vets[5].id, // vet6@example.com
      content: "بالإضافة إلى ذلك، تأكد من أن الكلب يحصل على تمارين كافية، فقد يكون النباح بسبب الطبقة المكبوتة.",
    },
    {
      inquiryId: createdInquiries[3].id, // Rabbit nutrition
      userId: vets[4].id, // vet5@example.com
      content: "الأرانب تحتاج إلى نظام غذائي غني بالألياف مثل التبن، مع خضروات طازجة وكمية محدودة من الحبوب.",
    },
    {
      inquiryId: createdInquiries[4].id, // Cat injury
      userId: vets[7].id, // vet8@example.com
      content: "هذه حالة طارئة! خذ القطة إلى عيادة بيطرية فوراً لفحصها وربما إجراء أشعة للتحقق من الكسور.",
    },
    {
      inquiryId: createdInquiries[5].id, // Dog eye issue
      userId: vets[1].id, // vet2@example.com
      content: "الإفرازات قد تشير إلى التهاب أو عدوى. نظف العين بلطف واستشر طبيب بيطري لفحص دقيق.",
    },
    {
      inquiryId: createdInquiries[6].id, // Chicken illness
      userId: vets[0].id, // vet1@example.com
      content: "قد تكون دجاجتك مصابة بعدوى. افصلها عن القطيع واستشر طبيب بيطري لتحديد العلاج المناسب.",
    },
    {
      inquiryId: createdInquiries[7].id, // Dog surgery
      userId: vets[5].id, // vet6@example.com
      content: "مخاطر الجراحة تعتمد على حالة الكلب. ناقش مع الطبيب البيطري التخدير والرعاية بعد الجراحة.",
    },
    {
      inquiryId: createdInquiries[8].id, // Cat dental issue
      userId: vets[3].id, // vet4@example.com
      content: "مشاكل الأسنان شائعة عند القطط. يجب فحصها من قبل طبيب أسنان بيطري لتحديد العلاج.",
    },
    {
      inquiryId: createdInquiries[9].id, // Parrot diarrhea
      userId: vets[4].id, // vet5@example.com
      content: "الإسهال قد يكون بسبب عدوى أو تغذية غير مناسبة. توقف عن إعطاء الفواكه واستشر طبيب بيطري.",
    },
  ];

  await db.insert(inquiryReplies).values(repliesData);

  logStep(`Created ${createdInquiries.length} inquiries and ${repliesData.length} replies\n`);
  return createdInquiries;
}
