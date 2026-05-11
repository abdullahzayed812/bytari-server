import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { publicProcedure } from '../../../create-context';
import { db, users, userRoles, adminRoles } from '../../../../db';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const verifyPassword = async (inputPassword: string, storedPassword: string): Promise<boolean> => {
  return bcrypt.compare(inputPassword, storedPassword);
};

// دالة لإنشاء توكن آمن أكثر
const generateSecureToken = (userId: number, email: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  // في الإنتاج، استخدم JWT مع secret key
  return `admin_${userId}_${timestamp}_${randomString}`;
};

// إجراء تسجيل دخول الإدارة
export const adminAuthProcedure = publicProcedure
  .input(z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }))
  .mutation(async ({ input }) => {
    const { email, password } = input;

    // البحث عن المستخدم في قاعدة البيانات
    const userRows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        userType: users.userType,
        password: users.password,
        isActive: users.isActive
      })
      .from(users)
      .where(and(
        eq(users.email, email.toLowerCase()),
        eq(users.isActive, true)
      ))
      .limit(1);

    if (!userRows || userRows.length === 0) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
    }

    const foundUser = userRows[0];

    // التحقق من كلمة المرور باستخدام bcrypt
    const isValidPassword = await verifyPassword(password, foundUser.password);
    if (!isValidPassword) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'بيانات الدخول غير صحيحة' });
    }

    // التحقق من أن المستخدم من نوع admin
    if (foundUser.userType !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'المستخدم لا يملك صلاحيات إدارية' });
    }

    // التحقق من الأدوار الإدارية
    const userRoleData = await db
      .select({
        roleId: userRoles.roleId,
        roleName: adminRoles.name,
        roleDisplayName: adminRoles.displayName,
      })
      .from(userRoles)
      .innerJoin(adminRoles, eq(userRoles.roleId, adminRoles.id))
      .where(and(
        eq(userRoles.userId, foundUser.id),
        eq(userRoles.isActive, true),
        eq(adminRoles.isActive, true)
      ));

    const isSuperAdmin = userRoleData.some(r => r.roleName === 'super_admin');

    // إنشاء token
    const token = generateSecureToken(foundUser.id, foundUser.email);

    return {
      success: true,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name,
        userType: foundUser.userType,
        isSuperAdmin,
        roles: userRoleData.map(r => ({ id: r.roleId, name: r.roleName, displayName: r.roleDisplayName }))
      },
      token,
      message: 'تم تسجيل الدخول بنجاح'
    };
  });

export const adminVerifyProcedure = publicProcedure
  .input(z.object({
    token: z.string()
  }))
  .query(async ({ input }) => {
    const { token } = input;
    
    // التحقق من صحة الـ token (تحقق محسن)
    if (!token.startsWith('admin_')) {
      throw new Error('رمز المصادقة غير صحيح');
    }
    
    const parts = token.split('_');
    if (parts.length !== 4) {
      throw new Error('رمز المصادقة غير صحيح');
    }
    
    const userId = parseInt(parts[1]);
    const timestamp = parseInt(parts[2]);
    const randomString = parts[3];
    
    // التحقق من وجود الجزء العشوائي
    if (!randomString || randomString.length < 5) {
      throw new Error('رمز المصادقة غير صحيح');
    }
    
    // التحقق من انتهاء صلاحية الـ token (24 ساعة)
    const now = Date.now();
    const tokenAge = now - timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
    
    if (tokenAge > maxAge) {
      throw new Error('انتهت صلاحية رمز المصادقة');
    }
    
    try {
      // التحقق من وجود المستخدم
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          userType: users.userType,
          isActive: users.isActive
        })
        .from(users)
        .where(and(
          eq(users.id, userId),
          eq(users.isActive, true)
        ))
        .limit(1);
      
      if (!user || user.length === 0) {
        throw new Error('المستخدم غير موجود أو غير مفعل');
      }
      
      return {
        valid: true,
        user: user[0]
      };
      
    } catch (error) {
      console.error('خطأ في التحقق من رمز المصادقة:', error);
      throw new Error('رمز المصادقة غير صحيح');
    }
  });

// إجراء للتحقق من صلاحيات المستخدم الإدارية
export const checkAdminPermissionsProcedure = publicProcedure
  .input(z.object({
    email: z.string().email()
  }))
  .query(async ({ input }) => {
    const { email } = input;
    
    try {
      // التحقق من الأدمن الأساسي
      const adminCredential = ADMIN_CREDENTIALS.find(cred => cred.email === email);
      if (adminCredential && adminCredential.isSuperAdmin) {
        return {
          hasAdminAccess: true,
          isSuperAdmin: true,
          roles: [{ id: 'super', name: 'super_admin', displayName: 'مدير عام' }]
        };
      }
      
      try {
        // البحث عن المستخدم في قاعدة البيانات
        const user = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            userType: users.userType,
            isActive: users.isActive
          })
          .from(users)
          .where(and(
            eq(users.email, email),
            eq(users.isActive, true)
          ))
          .limit(1);
        
        if (!user || user.length === 0) {
          return {
            hasAdminAccess: false,
            isSuperAdmin: false,
            roles: []
          };
        }
        
        const foundUser = user[0];
        
        try {
          // التحقق من الصلاحيات الإدارية
          const userRoleData = await db
            .select({
              roleId: userRoles.roleId,
              roleName: adminRoles.name,
              roleDisplayName: adminRoles.displayName,
              isActive: userRoles.isActive
            })
            .from(userRoles)
            .innerJoin(adminRoles, eq(userRoles.roleId, adminRoles.id))
            .where(and(
              eq(userRoles.userId, foundUser.id),
              eq(userRoles.isActive, true),
              eq(adminRoles.isActive, true)
            ));
          
          const hasAdminAccess = userRoleData && userRoleData.length > 0;
          
          return {
            hasAdminAccess,
            isSuperAdmin: false,
            roles: userRoleData.map((role: any) => ({
              id: role.roleId,
              name: role.roleName,
              displayName: role.roleDisplayName
            }))
          };
        } catch (roleError) {
          console.warn('Admin roles table not ready, user has no admin access:', roleError);
          return {
            hasAdminAccess: false,
            isSuperAdmin: false,
            roles: []
          };
        }
        
      } catch (dbError) {
        console.warn('Database not ready, checking super admin only:', dbError);
        return {
          hasAdminAccess: false,
          isSuperAdmin: false,
          roles: []
        };
      }
      
    } catch (error) {
      console.error('خطأ في التحقق من الصلاحيات:', error);
      return {
        hasAdminAccess: false,
        isSuperAdmin: false,
        roles: []
      };
    }
  });