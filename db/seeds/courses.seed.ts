import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { courses } from "../schema";
import { logStep } from "./helpers";

export async function seedCourses(db: NodePgDatabase<any>, superAdmin: any, vetUsers: any[]) {
  console.log("🎓 Seeding courses...");

  const coursesData = [
    {
      instructorId: vetUsers[0]?.id || superAdmin.id,
      title: "أساسيات الإسعافات الأولية للحيوانات الأليفة",
      description: "دورة شاملة تعلمك كيفية التعامل مع حالات الطوارئ الشائعة للحيوانات الأليفة",
      content: "تغطي الدورة: الجروح والنزيف، الاختناق، الكسور، التسمم، ضربات الشمس، والإنعاش القلبي الرئوي",
      category: "emergency",
      level: "beginner",
      duration: 8,
      price: 150000,
      thumbnailImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400",
      videoUrl: "https://example.com/courses/first-aid-basics",
      materials: JSON.stringify(["دليل PDF", "فيديوهات تعليمية", "اختبارات تفاعلية"]),
      prerequisites: JSON.stringify(["لا يوجد"]),
      isPublished: true,
      enrollmentCount: 234,
      rating: 4.8,
    },
    {
      instructorId: vetUsers[1]?.id || superAdmin.id,
      title: "التغذية المثالية للقطط والكلاب",
      description: "تعلم كيفية اختيار الطعام المناسب وإعداد وجبات صحية لحيواناتك",
      content: "تشمل الدورة: احتياجات التغذية، قراءة ملصقات الطعام، الحميات الخاصة، والمكملات الغذائية",
      category: "nutrition",
      level: "intermediate",
      duration: 12,
      price: 200000,
      thumbnailImage: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=400",
      videoUrl: "https://example.com/courses/pet-nutrition",
      materials: JSON.stringify(["كتاب إلكتروني", "جداول تغذية", "وصفات صحية"]),
      prerequisites: JSON.stringify(["معرفة أساسية برعاية الحيوانات"]),
      isPublished: true,
      enrollmentCount: 189,
      rating: 4.7,
    },
    {
      instructorId: vetUsers[2]?.id || superAdmin.id,
      title: "تدريب الكلاب - المستوى الأول",
      description: "دورة عملية في تدريب الكلاب على الأوامر الأساسية والسلوكيات المرغوبة",
      content: "تعلم: أوامر الطاعة الأساسية، التدريب على النظافة، التعامل مع السلوك السيء",
      category: "training",
      level: "beginner",
      duration: 10,
      price: 175000,
      thumbnailImage: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=400",
      videoUrl: "https://example.com/courses/dog-training-101",
      materials: JSON.stringify(["دليل التدريب", "فيديوهات توضيحية", "خطط تدريب أسبوعية"]),
      prerequisites: JSON.stringify(["امتلاك كلب"]),
      isPublished: true,
      enrollmentCount: 312,
      rating: 4.9,
    },
    {
      instructorId: vetUsers[3]?.id || superAdmin.id,
      title: "العناية بالحيوانات المسنة",
      description: "كيفية رعاية الحيوانات الأليفة في مراحلها العمرية المتقدمة",
      content: "تغطي: التغيرات العمرية، الأمراض الشائعة، التغذية الخاصة، وتحسين جودة الحياة",
      category: "care",
      level: "intermediate",
      duration: 6,
      price: 125000,
      thumbnailImage: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400",
      videoUrl: "https://example.com/courses/senior-pet-care",
      materials: JSON.stringify(["دليل رعاية شامل", "قوائم مراجعة صحية"]),
      prerequisites: JSON.stringify(["خبرة في رعاية الحيوانات الأليفة"]),
      isPublished: true,
      enrollmentCount: 156,
      rating: 4.6,
    },
    {
      instructorId: vetUsers[4]?.id || superAdmin.id,
      title: "فهم لغة جسد القطط",
      description: "تعلم كيفية فهم سلوك القطط وتفسير إشاراتها",
      content: "تشمل: حركات الذيل، الأذنين، أصوات المواء، وضعيات الجسم المختلفة",
      category: "behavior",
      level: "beginner",
      duration: 5,
      price: 100000,
      thumbnailImage: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400",
      videoUrl: "https://example.com/courses/cat-body-language",
      materials: JSON.stringify(["دليل مصور", "رسوم توضيحية", "اختبارات تفاعلية"]),
      prerequisites: JSON.stringify(["لا يوجد"]),
      isPublished: true,
      enrollmentCount: 267,
      rating: 4.5,
    },
  ];

  const createdCourses = await db.insert(courses).values(coursesData).returning();

  logStep(`Created ${createdCourses.length} courses\n`);
  return createdCourses;
}
