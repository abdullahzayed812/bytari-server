import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../../create-context';

// Schema for course data
const CourseSchema = z.object({
  title: z.string().min(1, 'عنوان الدورة مطلوب'),
  organizer: z.string().min(1, 'اسم المنظم مطلوب'),
  date: z.string().min(1, 'تاريخ الدورة مطلوب'),
  location: z.string().min(1, 'مكان الدورة مطلوب'),
  type: z.enum(['course', 'seminar']),
  duration: z.string().min(1, 'مدة الدورة مطلوبة'),
  capacity: z.number().min(1, 'عدد المقاعد يجب أن يكون أكبر من صفر'),
  price: z.string().min(1, 'سعر الدورة مطلوب'),
  description: z.string().min(1, 'وصف الدورة مطلوب'),
  courseUrl: z.string().optional(),
  registrationType: z.enum(['link', 'internal']),
  status: z.enum(['active', 'inactive', 'completed']).default('active'),
});

const CourseRegistrationSchema = z.object({
  courseId: z.string().min(1, 'معرف الدورة مطلوب'),
  courseName: z.string().min(1, 'اسم الدورة مطلوب'),
  participantName: z.string().min(1, 'اسم المشارك مطلوب'),
  participantEmail: z.string().email('البريد الإلكتروني غير صحيح'),
  participantPhone: z.string().min(1, 'رقم الهاتف مطلوب'),
});

// Mock data for development
const mockCourses = [
  {
    id: '1',
    title: 'دورة الطب البيطري الحديث',
    organizer: 'الجمعية السعودية للأطباء البيطريين',
    date: '15 أغسطس 2024',
    location: 'الرياض - مركز المؤتمرات',
    type: 'course' as const,
    duration: '3 أيام',
    capacity: 50,
    registered: 35,
    price: '1500 ريال',
    description: 'دورة شاملة تغطي أحدث التطورات في مجال الطب البيطري والتقنيات الحديثة',
    courseUrl: 'https://vetcourse.com/modern-veterinary',
    registrationType: 'link' as const,
    status: 'active' as const,
    createdAt: '2024-07-01',
  },
  {
    id: '2',
    title: 'ندوة: مستقبل الطب البيطري في المملكة',
    organizer: 'وزارة البيئة والمياه والزراعة',
    date: '22 أغسطس 2024',
    location: 'جدة - فندق الريتز كارلتون',
    type: 'seminar' as const,
    duration: 'يوم واحد',
    capacity: 100,
    registered: 78,
    price: 'مجاني',
    description: 'ندوة تناقش التحديات والفرص في مجال الطب البيطري ودوره في التنمية المستدامة',
    registrationType: 'internal' as const,
    status: 'active' as const,
    createdAt: '2024-07-05',
  },
];

const mockRegistrations: Array<{
  id: string;
  courseId: string;
  courseName: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  registrationDate: string;
  status: 'pending' | 'approved' | 'rejected';
}> = [
  {
    id: '1',
    courseId: '2',
    courseName: 'ندوة: مستقبل الطب البيطري في المملكة',
    participantName: 'د. أحمد محمد',
    participantEmail: 'ahmed@example.com',
    participantPhone: '0501234567',
    registrationDate: '2024-07-20',
    status: 'pending',
  },
  {
    id: '2',
    courseId: '2',
    courseName: 'ندوة: مستقبل الطب البيطري في المملكة',
    participantName: 'د. فاطمة علي',
    participantEmail: 'fatima@example.com',
    participantPhone: '0507654321',
    registrationDate: '2024-07-21',
    status: 'approved',
  },
];

// Get all courses
export const getCoursesListProcedure = publicProcedure
  .input(z.object({
    type: z.enum(['all', 'course', 'seminar']).optional().default('all'),
    status: z.enum(['all', 'active', 'inactive', 'completed']).optional().default('all'),
    search: z.string().optional(),
  }))
  .query(async ({ input }) => {
    console.log('Getting courses list with filters:', input);
    
    let filteredCourses = [...mockCourses];
    
    // Filter by type
    if (input.type !== 'all') {
      filteredCourses = filteredCourses.filter(course => course.type === input.type);
    }
    
    // Filter by status
    if (input.status !== 'all') {
      filteredCourses = filteredCourses.filter(course => course.status === input.status);
    }
    
    // Filter by search
    if (input.search) {
      const searchLower = input.search.toLowerCase();
      filteredCourses = filteredCourses.filter(course => 
        course.title.toLowerCase().includes(searchLower) ||
        course.organizer.toLowerCase().includes(searchLower)
      );
    }
    
    return {
      success: true,
      courses: filteredCourses,
      total: filteredCourses.length,
    };
  });

// Get course by ID
export const getCourseProcedure = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input }) => {
    console.log('Getting course by ID:', input.id);
    
    const course = mockCourses.find(c => c.id === input.id);
    
    if (!course) {
      throw new Error('الدورة غير موجودة');
    }
    
    return {
      success: true,
      course,
    };
  });

// Create new course
export const createCourseProcedure = protectedProcedure
  .input(CourseSchema)
  .mutation(async ({ input, ctx }) => {
    console.log('Creating new course:', input);
    console.log('User ID:', ctx.userId);
    
    // In a real app, you would save to database
    const newCourse = {
      id: Date.now().toString(),
      ...input,
      registered: 0,
      createdAt: new Date().toISOString().split('T')[0],
    } as any;
    
    mockCourses.push(newCourse);
    
    return {
      success: true,
      courseId: newCourse.id,
      message: 'تم إنشاء الدورة بنجاح',
    };
  });

// Update course
export const updateCourseProcedure = protectedProcedure
  .input(z.object({
    id: z.string(),
    data: CourseSchema,
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('Updating course:', input.id, input.data);
    console.log('User ID:', ctx.userId);
    
    const courseIndex = mockCourses.findIndex(c => c.id === input.id);
    
    if (courseIndex === -1) {
      throw new Error('الدورة غير موجودة');
    }
    
    // In a real app, you would update in database
    mockCourses[courseIndex] = {
      ...mockCourses[courseIndex],
      ...input.data,
    } as any;
    
    return {
      success: true,
      message: 'تم تحديث الدورة بنجاح',
    };
  });

// Delete course
export const deleteCourseProcedure = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ input, ctx }) => {
    console.log('Deleting course:', input.id);
    console.log('User ID:', ctx.userId);
    
    const courseIndex = mockCourses.findIndex(c => c.id === input.id);
    
    if (courseIndex === -1) {
      throw new Error('الدورة غير موجودة');
    }
    
    // In a real app, you would delete from database
    mockCourses.splice(courseIndex, 1);
    
    return {
      success: true,
      message: 'تم حذف الدورة بنجاح',
    };
  });

// Register for course
export const registerForCourseProcedure = publicProcedure
  .input(CourseRegistrationSchema)
  .mutation(async ({ input }) => {
    console.log('Registering for course:', input);
    
    const course = mockCourses.find(c => c.id === input.courseId);
    
    if (!course) {
      throw new Error('الدورة غير موجودة');
    }
    
    if (course.registered >= course.capacity) {
      throw new Error('الدورة مكتملة العدد');
    }
    
    if (course.status !== 'active') {
      throw new Error('الدورة غير متاحة للتسجيل حالياً');
    }
    
    // In a real app, you would save to database
    const newRegistration = {
      id: Date.now().toString(),
      ...input,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'pending' as const,
    };
    
    mockRegistrations.push(newRegistration as any);
    
    return {
      success: true,
      registrationId: newRegistration.id,
      message: 'تم تسجيل طلبك بنجاح. سيتم مراجعته من قبل الإدارة.',
    };
  });

// Get course registrations
export const getCourseRegistrationsProcedure = protectedProcedure
  .input(z.object({
    courseId: z.string().optional(),
    status: z.enum(['all', 'pending', 'approved', 'rejected']).optional().default('all'),
    search: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    console.log('Getting course registrations:', input);
    console.log('User ID:', ctx.userId);
    
    let filteredRegistrations = [...mockRegistrations];
    
    // Filter by course ID
    if (input.courseId) {
      filteredRegistrations = filteredRegistrations.filter(reg => reg.courseId === input.courseId);
    }
    
    // Filter by status
    if (input.status !== 'all') {
      filteredRegistrations = filteredRegistrations.filter(reg => reg.status === input.status);
    }
    
    // Filter by search
    if (input.search) {
      const searchLower = input.search.toLowerCase();
      filteredRegistrations = filteredRegistrations.filter(reg => 
        reg.participantName.toLowerCase().includes(searchLower) ||
        reg.courseName.toLowerCase().includes(searchLower) ||
        reg.participantEmail.toLowerCase().includes(searchLower)
      );
    }
    
    return {
      success: true,
      registrations: filteredRegistrations,
      total: filteredRegistrations.length,
    };
  });

// Update registration status
export const updateRegistrationStatusProcedure = protectedProcedure
  .input(z.object({
    registrationId: z.string(),
    status: z.enum(['approved', 'rejected']),
    notes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('Updating registration status:', input);
    console.log('User ID:', ctx.userId);
    
    const registrationIndex = mockRegistrations.findIndex(r => r.id === input.registrationId);
    
    if (registrationIndex === -1) {
      throw new Error('التسجيل غير موجود');
    }
    
    // In a real app, you would update in database
    (mockRegistrations[registrationIndex] as any).status = input.status;
    
    // Update course registered count if approved
    if (input.status === 'approved') {
      const courseId = mockRegistrations[registrationIndex].courseId;
      const courseIndex = mockCourses.findIndex(c => c.id === courseId);
      if (courseIndex !== -1) {
        mockCourses[courseIndex].registered += 1;
      }
    }
    
    return {
      success: true,
      message: `تم ${input.status === 'approved' ? 'قبول' : 'رفض'} التسجيل بنجاح`,
    };
  });