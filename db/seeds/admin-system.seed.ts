import bcrypt from "bcryptjs";
import {
  adminRoles,
  adminPermissions,
  rolePermissions,
  userRoles,
  appSections,
  adminNotifications,
  users, // Added for users insert
} from "../schema";

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function seedAdminSystem(db) {
  console.log("📝 Seeding admin system...\n");

  // ==================== ADMIN ROLES ====================
  console.log("Creating admin roles...");
  const roles = await db
    .insert(adminRoles)
    .values([
      {
        name: "super_admin",
        displayName: "مدير عام",
        description: "صلاحيات كاملة لإدارة النظام",
        isActive: true,
      },
      {
        name: "vet_moderator",
        displayName: "مشرف أطباء",
        description: "إدارة الأطباء والاستفسارات البيطرية",
        isActive: true,
      },
      {
        name: "user_moderator",
        displayName: "مشرف مستخدمين",
        description: "إدارة المستخدمين والاستشارات",
        isActive: true,
      },
      {
        name: "content_manager",
        displayName: "مدير محتوى",
        description: "إدارة المحتوى والإعلانات",
        isActive: true,
      },
      {
        name: "union_moderator",
        displayName: "مشرف نقابة",
        description: "إدارة إعلانات النقابة",
        isActive: true,
      },
    ])
    .returning();

  const [superAdminRole, vetModeratorRole, userModeratorRole, contentManagerRole, unionModeratorRole] = roles;

  // ==================== ADMIN PERMISSIONS ====================
  console.log("Creating admin permissions...");
  const permissions = await db
    .insert(adminPermissions)
    .values([
      {
        name: "assign_roles",
        displayName: "تعيين الأدوار",
        description: "إدارة وتعيين الأدوار للمستخدمين",
        category: "roles",
      },
      {
        name: "send_messages",
        displayName: "إرسال الرسائل",
        description: "إرسال رسائل عامة للمستخدمين",
        category: "communications",
      },
      {
        name: "manage_ai_settings",
        displayName: "إدارة إعدادات الذكاء الاصطناعي",
        description: "تعديل إعدادات الذكاء الاصطناعي في النظام",
        category: "system",
      },
      {
        name: "manage_approvals",
        displayName: "إدارة الموافقات",
        description: "إدارة جميع أنواع الموافقات (الأطباء، العيادات، المتاجر، التبني، التزاوج)",
        category: "approvals",
      },
      {
        name: "manage_pets",
        displayName: "إدارة الحيوانات",
        description: "إدارة بيانات الحيوانات الأليفة",
        category: "pets",
      },
      {
        name: "manage_clinics",
        displayName: "إدارة العيادات",
        description: "إدارة وتفعيل العيادات البيطرية",
        category: "clinics",
      },
      {
        name: "manage_stores",
        displayName: "إدارة المتاجر",
        description: "إدارة متاجر الأطباء وأصحاب الحيوانات",
        category: "stores",
      },
      {
        name: "manage_hospitals",
        displayName: "إدارة المستشفيات",
        description: "إدارة وتفعيل المستشفيات البيطرية",
        category: "hospitals",
      },
      {
        name: "manage_unions",
        displayName: "إدارة النقابات",
        description: "إدارة النقابات البيطرية",
        category: "unions",
      },
      {
        name: "manage_orders",
        displayName: "إدارة الطلبات",
        description: "إدارة طلبات المنتجات والخدمات",
        category: "orders",
      },
      {
        name: "manage_field_assignments",
        displayName: "إدارة التعيين والإشراف",
        description: "إدارة تعيينات وإشراف الأطباء البيطريين",
        category: "assignments",
      },
      {
        name: "manage_jobs",
        displayName: "إدارة الوظائف",
        description: "إدارة إعلانات الوظائف",
        category: "jobs",
      },
      {
        name: "manage_courses",
        displayName: "إدارة الدورات والندوات",
        description: "إدارة الدورات التعليمية والندوات",
        category: "education",
      },

      // User management
      {
        name: "manage_users",
        displayName: "إدارة المستخدمين",
        description: "إنشاء وتعديل وحذف المستخدمين",
        category: "users",
      },
      {
        name: "view_users",
        displayName: "عرض المستخدمين",
        description: "عرض قائمة المستخدمين وتفاصيلهم",
        category: "users",
      },

      // Inquiry management
      {
        name: "reply_inquiries",
        displayName: "الرد على الاستفسارات",
        description: "الرد على استفسارات الأطباء",
        category: "inquiries",
      },
      {
        name: "assign_inquiries",
        displayName: "تعيين الاستفسارات",
        description: "تعيين الاستفسارات للمشرفين",
        category: "inquiries",
      },
      {
        name: "manage_inquiries",
        displayName: "دارة الاستفسارات",
        description: "ادارة الاستفسارات",
        category: "inquiries",
      },

      // Content management
      {
        name: "manage_ads",
        displayName: "إدارة الإعلانات",
        description: "إنشاء وتعديل وحذف الإعلانات",
        category: "ads",
      },
      {
        name: "manage_content",
        displayName: "إدارة المحتوى",
        description: "إدارة المقالات والنصائح",
        category: "content",
      },

      // Notification management
      {
        name: "send_notifications",
        displayName: "إرسال الإشعارات",
        description: "إرسال الإشعارات للمستخدمين",
        category: "notifications",
      },

      // System management
      {
        name: "manage_settings",
        displayName: "إدارة الإعدادات",
        description: "تعديل إعدادات النظام",
        category: "system",
      },
      {
        name: "view_analytics",
        displayName: "عرض التحليلات",
        description: "عرض تحليلات وإحصائيات النظام",
        category: "system",
      },

      // Consultation management
      {
        name: "reply_consultations",
        displayName: "الرد على الاستشارات",
        description: "الرد على استشارات المستخدمين",
        category: "consultations",
      },
      {
        name: "manage_consultations",
        displayName: "ادارة الاستشارات",
        description: "ادارة الاستشارات",
        category: "consultations",
      },

      // Store management
      {
        name: "manage_vet_stores",
        displayName: "إدارة متاجر الأطباء",
        description: "إدارة وتحديث متاجر الأطباء البيطريين",
        category: "stores",
      },
      {
        name: "manage_user_stores",
        displayName: "إدارة متاجر أصحاب الحيوانات",
        description: "إدارة وتحديث متاجر أصحاب الحيوانات",
        category: "stores",
      },

      // Approval management
      {
        name: "manage_vet_approvals",
        displayName: "إدارة موافقات تسجيل الأطباء",
        description: "مراجعة والموافقة على طلبات تسجيل الأطباء البيطريين",
        category: "approvals",
      },
      {
        name: "manage_clinic_approvals",
        displayName: "إدارة موافقات العيادات",
        description: "مراجعة والموافقة على طلبات تفعيل العيادات البيطرية",
        category: "approvals",
      },
      {
        name: "manage_store_approvals",
        displayName: "إدارة موافقات المذاخر",
        description: "مراجعة والموافقة على طلبات تفعيل المذاخر البيطرية",
        category: "approvals",
      },
      {
        name: "manage_adoption_approvals",
        displayName: "إدارة موافقات حيوانات التبني",
        description: "مراجعة والموافقة على طلبات عرض حيوانات للتبني",
        category: "approvals",
      },
      {
        name: "manage_breeding_approvals",
        displayName: "إدارة موافقات حيوانات التزاوج",
        description: "مراجعة والموافقة على طلبات عرض حيوانات للتزاوج",
        category: "approvals",
      },
    ])
    .returning();

  // ==================== ROLE-PERMISSION MAPPINGS ====================
  console.log("Creating role-permission mappings...");

  // Super admin gets all permissions
  for (const permission of permissions) {
    await db.insert(rolePermissions).values({
      roleId: superAdminRole.id,
      permissionId: permission.id,
    });
  }

  // Vet moderator permissions
  const vetPermissionNames = ["reply_inquiries", "assign_inquiries", "view_users", "reply_consultations"];
  for (const permission of permissions.filter((p) => vetPermissionNames.includes(p.name))) {
    await db.insert(rolePermissions).values({
      roleId: vetModeratorRole.id,
      permissionId: permission.id,
    });
  }

  // User moderator permissions
  const userPermissionNames = ["manage_users", "view_users", "reply_consultations", "send_notifications"];
  for (const permission of permissions.filter((p) => userPermissionNames.includes(p.name))) {
    await db.insert(rolePermissions).values({
      roleId: userModeratorRole.id,
      permissionId: permission.id,
    });
  }

  // Content manager permissions
  const contentPermissionNames = ["manage_ads", "manage_content", "send_notifications", "view_analytics"];
  for (const permission of permissions.filter((p) => contentPermissionNames.includes(p.name))) {
    await db.insert(rolePermissions).values({
      roleId: contentManagerRole.id,
      permissionId: permission.id,
    });
  }

  // Union moderator permissions
  const unionPermissionNames = ["manage_unions", "manage_content"];
  for (const permission of permissions.filter((p) => unionPermissionNames.includes(p.name))) {
    await db.insert(rolePermissions).values({
      roleId: unionModeratorRole.id,
      permissionId: permission.id,
    });
  }

  // ==================== APP SECTIONS ====================
  console.log("Creating app sections...");
  await db.insert(appSections).values([
    {
      name: "home",
      title: "الرئيسية",
      description: "الصفحة الرئيسية للتطبيق",
      icon: "home",
      color: "#007AFF",
      route: "/",
      isActive: true,
      order: 1,
      userType: "all",
    },
    {
      name: "pets",
      title: "حيواناتي",
      description: "إدارة الحيوانات الأليفة",
      icon: "heart",
      color: "#FF6B6B",
      route: "/pets",
      isActive: true,
      order: 2,
      userType: "user",
    },
    {
      name: "store",
      title: "المتجر",
      description: "متجر مستلزمات الحيوانات",
      icon: "shopping-bag",
      color: "#4ECDC4",
      route: "/store",
      isActive: true,
      order: 3,
      userType: "all",
    },
    {
      name: "profile",
      title: "الملف الشخصي",
      description: "إعدادات المستخدم",
      icon: "user",
      color: "#45B7D1",
      route: "/profile",
      isActive: true,
      order: 4,
      userType: "all",
    },
  ]);

  // ==================== SUPER ADMIN USERS ====================
  console.log("Creating super admin users...");
  const superAdminPassword = await hashPassword("zuh000123000321zuh");
  const backupAdminPassword = await hashPassword("superadmin123");

  const superAdmins = await db
    .insert(users)
    .values([
      {
        email: "zuhairalrawi0@gmail.com",
        name: "زهير الراوي - مدير النظام العام",
        phone: "+964770000000",
        password: superAdminPassword,
        userType: "admin",
        isActive: true,
      },
      {
        email: "superadmin@petapp.com",
        name: "مدير النظام الأساسي",
        phone: "+964770000001",
        password: backupAdminPassword,
        userType: "admin",
        isActive: true,
      },
    ])
    .returning();

  const mainSuperAdmin = superAdmins[0];
  const backupSuperAdmin = superAdmins[1];

  // ==================== ADMIN USERS ====================
  console.log("Creating admin users...");
  const adminPassword = await hashPassword("admin123");

  const admins = await db
    .insert(users)
    .values([
      {
        email: "admin@petapp.com",
        name: "مشرف اختبار",
        phone: "+964770000002",
        password: adminPassword,
        userType: "admin",
        isActive: true,
      },
      {
        email: "vet.moderator@petapp.com",
        name: "د. أحمد محمد - مشرف الأطباء",
        phone: "+964770000003",
        password: adminPassword,
        userType: "admin",
        isActive: true,
      },
      {
        email: "user.moderator@petapp.com",
        name: "سارة علي - مشرف المستخدمين",
        phone: "+964770000004",
        password: adminPassword,
        userType: "admin",
        isActive: true,
      },
      {
        email: "content.manager@petapp.com",
        name: "محمد حسن - مدير المحتوى",
        phone: "+964770000005",
        password: adminPassword,
        userType: "admin",
        isActive: true,
      },
    ])
    .returning();

  const testAdminUser = admins[0];
  const vetModeratorUser = admins[1];
  const userModeratorUser = admins[2];
  const contentManagerUser = admins[3];

  // ==================== ASSIGN ROLES ====================
  console.log("Assigning roles to admin users...");
  await db.insert(userRoles).values([
    { userId: mainSuperAdmin.id, roleId: superAdminRole.id, assignedBy: mainSuperAdmin.id, isActive: true },
    { userId: backupSuperAdmin.id, roleId: superAdminRole.id, assignedBy: mainSuperAdmin.id, isActive: true },
    { userId: testAdminUser.id, roleId: contentManagerRole.id, assignedBy: mainSuperAdmin.id, isActive: true },
    { userId: vetModeratorUser.id, roleId: vetModeratorRole.id, assignedBy: mainSuperAdmin.id, isActive: true },
    { userId: userModeratorUser.id, roleId: userModeratorRole.id, assignedBy: mainSuperAdmin.id, isActive: true },
    { userId: contentManagerUser.id, roleId: contentManagerRole.id, assignedBy: mainSuperAdmin.id, isActive: true },
  ]);

  // ==================== ADMIN NOTIFICATIONS ====================
  // Added since mentioned in old stats but not seeded; creating 10 dummy ones
  console.log("Creating admin notifications...");
  for (let i = 1; i <= 10; i++) {
    await db.insert(adminNotifications).values({
      title: `إشعار إداري رقم ${i}`,
      content: `هذا إشعار اختباري رقم ${i} لاختبار النظام الإداري.`,
      type: "system",
      priority: i % 2 === 0 ? "high" : "normal",
      isRead: i % 2 === 0,
      recipientId: mainSuperAdmin.id,
    });
  }

  return {
    superAdmin: mainSuperAdmin,
    admins: {
      main: mainSuperAdmin,
      backup: backupSuperAdmin,
      test: testAdminUser,
      vetModerator: vetModeratorUser,
      userModerator: userModeratorUser,
      contentManager: contentManagerUser,
    },
  };
}
