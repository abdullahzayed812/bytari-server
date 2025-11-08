
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { z } from "zod";

export const unionRouter = router({
  getMainInfo: publicProcedure.query(async ({ ctx }) => {
    // Mock data for now
    return {
      name: 'نقابة الأطباء البيطريين العراقية',
      description: 'نقابة الأطباء البيطريين العراقية هي المؤسسة المهنية الرسمية التي تأسست عام 1959...',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Emblem_of_Iraq.svg/200px-Emblem_of_Iraq.svg.png',
      establishedYear: '1959',
      memberCount: '8000',
      phone1: '+964 1 717 6543',
      phone2: '+964 1 717 2891',
      email: 'info@iraqvetunion.org',
      website: 'www.iraqvetunion.org',
      address: 'بغداد - الكرادة الشرقية - شارع أبو نواس - مجمع النقابات المهنية - الطابق الثالث',
      services: [
        { id: '1', title: 'التسجيل والعضوية', description: 'تسجيل الأطباء البيطريين الجدد...', color: '#3B82F6' },
        { id: '2', title: 'إجازة ممارسة المهنة', description: 'استخراج وتجديد إجازات ممارسة المهنة...', color: '#10B981' },
      ]
    };
  }),

  updateMainInfo: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      logoUrl: z.string(),
      establishedYear: z.string(),
      memberCount: z.string(),
      phone1: z.string(),
      phone2: z.string(),
      email: z.string(),
      website: z.string(),
      address: z.string(),
      services: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        color: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log("Updating main union info:", input);
      return { success: true };
    }),

  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        unionName: 'نقابة الأطباء البيطريين',
        unionDescription: 'نقابة مهنية تهدف إلى تطوير مهنة الطب البيطري',
        contactEmail: 'info@vetunion.com',
        contactPhone: '+964 770 123 4567',
        isMaintenanceMode: false,
        allowRegistration: true,
        requireApproval: true,
      };
    }),
    update: protectedProcedure
      .input(z.object({
        unionName: z.string(),
        unionDescription: z.string(),
        contactEmail: z.string(),
        contactPhone: z.string(),
        isMaintenanceMode: z.boolean(),
        allowRegistration: z.boolean(),
        requireApproval: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Updating union settings:", input);
        return { success: true };
      }),
  }),

  notificationSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        newMemberNotifications: true,
        eventNotifications: true,
        emergencyNotifications: true,
        weeklyReports: true,
        monthlyReports: true,
      };
    }),
    update: protectedProcedure
      .input(z.object({
        emailNotifications: z.boolean(),
        pushNotifications: z.boolean(),
        smsNotifications: z.boolean(),
        newMemberNotifications: z.boolean(),
        eventNotifications: z.boolean(),
        emergencyNotifications: z.boolean(),
        weeklyReports: z.boolean(),
        monthlyReports: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Updating notification settings:", input);
        return { success: true };
      }),
  }),

  analytics: router({
    getStats: protectedProcedure.query(async ({ ctx }) => {
        return {
    totalMembers: { value: '8,520', change: '+120', changeType: 'positive' },
    newMembers: { value: '350', change: '+30', changeType: 'positive' },
    events: { value: '42', change: '+5', changeType: 'positive' },
    activityRate: { value: '92%', change: '-1%', changeType: 'negative' },
    chartData: [
      { month: 'Jan', members: 100, events: 5 },
      { month: 'Feb', members: 120, events: 8 },
      { month: 'Mar', members: 150, events: 7 },
      { month: 'Apr', members: 180, events: 10 },
      { month: 'May', members: 220, events: 12 },
      { month: 'Jun', members: 250, events: 15 },
    ],
    topEvents: [
      { name: 'ورشة الطب البيطري الحديث', participants: 145 },
      { name: 'مؤتمر الصحة الحيوانية', participants: 120 },
      { name: 'دورة الجراحة المتقدمة', participants: 98 },
    ],
    regionDistribution: [
      { region: 'بغداد', count: 3250, percentage: 28 },
      { region: 'البصرة', count: 1890, percentage: 16 },
      { region: 'أربيل', count: 1560, percentage: 14 },
    ],
  };
    }),
  }),

  branch: router({
    list: publicProcedure.query(async ({ ctx }) => {
      // Mock data
      return [
        { id: '1', name: 'نقابة الأطباء البيطريين - بغداد', governorate: 'بغداد', region: 'central', membersCount: 1850, rating: 4.9, isFollowing: true },
        { id: '2', name: 'نقابة الأطباء البيطريين - البصرة', governorate: 'البصرة', region: 'southern', membersCount: 680, rating: 4.7, isFollowing: false },
      ];
    }),
    get: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
      // Mock data
      return {
        id: input,
        name: 'نقابة الأطباء البيطريين - بغداد',
        governorate: 'بغداد',
        region: 'central',
        address: 'الكرادة الشرقية - شارع أبو نواس',
        phone: '+964 780 123 4567',
        email: 'baghdad@iraqvetunion.org',
        president: 'د. محمد جاسم العبيدي',
        membersCount: 1850,
        isFollowing: true,
        rating: 4.9,
        description: 'نقابة الأطباء البيطريين في بغداد هي النقابة الرئيسية...',
        establishedYear: 1959,
        services: ['تسجيل وترخيص الأطباء البيطريين', 'برامج التطوير المهني'],
        announcements: [],
      };
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        governorate: z.string(),
        region: z.enum(['central', 'northern', 'southern', 'kurdistan']),
        address: z.string(),
        phone: z.string(),
        email: z.string(),
        president: z.string(),
        membersCount: z.number(),
        rating: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Creating branch:", input);
        return { success: true, branchId: "new_branch_id" };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        name: z.string(),
        governorate: z.string(),
        address: z.string(),
        phone: z.string(),
        email: z.string(),
        president: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Updating branch:", input);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      console.log("Deleting branch:", input);
      return { success: true };
    }),
    follow: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      console.log("Toggling follow for branch:", input);
      return { success: true, isFollowing: true };
    }),
  }),

  announcement: router({
    list: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
      // Mock data
      return [
        { id: '1', title: 'اجتماع الجمعية العمومية', date: '2025-01-15', type: 'meeting', isImportant: true },
        { id: '2', title: 'مؤتمر الطب البيطري الدولي', date: '2025-01-10', type: 'event', isImportant: true },
      ];
    }),
    get: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
      // Mock data
      return {
        id: input,
        title: 'اجتماع الجمعية العمومية السنوي 2025',
        content: 'يسر نقابة الأطباء البيطريين في بغداد دعوة جميع الأعضاء...',
        date: '2025-01-15',
        type: 'meeting',
        isImportant: true,
        image: 'https://example.com/image.jpg',
        link: 'https://example.com',
        linkText: 'رابط التسجيل',
        author: 'إدارة النقابة',
        views: 245,
        branchId: '1',
      };
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        content: z.string(),
        branchId: z.string(),
        type: z.enum(['general', 'urgent', 'event', 'meeting']),
        isImportant: z.boolean(),
        image: z.string().optional(),
        link: z.string().optional(),
        linkText: z.string().optional(),
        author: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Creating announcement:", input);
        return { success: true, announcementId: "new_announcement_id" };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string(),
        content: z.string(),
        type: z.enum(['general', 'urgent', 'event', 'meeting']),
        isImportant: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Updating announcement:", input);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      console.log("Deleting announcement:", input);
      return { success: true };
    }),
  }),

  user: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return [
        { id: '1', name: 'د. أحمد محمد', email: 'ahmed@example.com', role: 'admin', status: 'active', joinDate: '2024-01-15' },
        { id: '2', name: 'د. فاطمة علي', email: 'fatima@example.com', role: 'moderator', status: 'active', joinDate: '2024-02-20' },
      ];
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        email: z.string(),
        role: z.enum(['admin', 'moderator', 'member']),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Creating user:", input);
        return { success: true, userId: "new_user_id" };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.string(),
        role: z.enum(['admin', 'moderator', 'member']),
        status: z.enum(['active', 'inactive']),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log("Updating user:", input);
        return { success: true };
      }),
    delete: protectedProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
      console.log("Deleting user:", input);
      return { success: true };
    }),
  }),
});
