import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../../create-context";
import {
  db,
  users,
  veterinarians,
  userRoles,
  adminRoles,
  rolePermissions,
  adminPermissions,
} from "../../../db";
import { eq, and } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateAuthTokens,
  refreshAccessToken,
  validatePassword,
  JWTPayload,
} from "../../../lib/auth";
import {
  AuthenticationError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from "../../../lib/errors";

// Input validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  userType: z.enum(["pet_owner", "veterinarian"]).default("pet_owner"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// User registration
export const registerProcedure = publicProcedure
  .input(registerSchema)
  .mutation(async ({ input }) => {
    try {
      const { email, password, name, phone, userType } = input;

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.message);
      }

      // Check if user already exists
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        throw new ConflictError("User with this email already exists");
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          phone,
          userType,
          isActive: true,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          userType: users.userType,
        });

      // Generate tokens
      const tokens = generateAuthTokens({
        userId: newUser.id,
        email: newUser.email,
        userType: newUser.userType,
      });

      return {
        success: true,
        message: "User registered successfully",
        user: newUser,
        tokens,
      };
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      console.error("Registration error:", error);
      throw new ValidationError("Failed to register user");
    }
  });

// User login
export const loginProcedure = publicProcedure
  .input(loginSchema)
  .mutation(async ({ input }) => {
    try {
      const { email, password } = input;

      // Find user by email
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          userType: users.userType,
          password: users.password,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      console.log({ email, password, user });

      if (!user) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AuthenticationError(
          "Account is inactive. Please contact support."
        );
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new AuthenticationError("Invalid email or password");
      }

      // Fetch user roles
      const userRoleData = await db
        .select({
          roleName: adminRoles.name,
        })
        .from(userRoles)
        .innerJoin(adminRoles, eq(userRoles.roleId, adminRoles.id))
        .where(
          and(
            eq(userRoles.userId, user.id),
            eq(userRoles.isActive, true),
            eq(adminRoles.isActive, true)
          )
        );

      const roles = userRoleData.map((r) => r.roleName);

      // Determine permissions
      const isSuperAdmin = roles.includes("super_admin");

      let isVerifiedVet = false;
      if (user.userType === "veterinarian") {
        const [vet] = await db
          .select({ isVerified: veterinarians.isVerified })
          .from(veterinarians)
          .where(eq(veterinarians.userId, user.id))
          .limit(1);
        if (vet) {
          isVerifiedVet = vet.isVerified;
        }
      }

      const isModerator =
        roles.some((r) => r.includes("moderator") || r.includes("manager")) ||
        isSuperAdmin;
      const hasAdminAccess = isSuperAdmin || isModerator;

      // Fetch moderator permissions
      let moderatorPermissions: any = {};
      if (isModerator) {
        const permissionsData = await db
          .select({
            permissionName: adminPermissions.name,
          })
          .from(rolePermissions)
          .innerJoin(
            adminPermissions,
            eq(rolePermissions.permissionId, adminPermissions.id)
          )
          .innerJoin(userRoles, eq(rolePermissions.roleId, userRoles.roleId))
          .where(
            and(
              eq(userRoles.userId, user.id),
              eq(adminPermissions.isActive, true)
            )
          );

        const permissionNames = permissionsData.map((p) => p.permissionName);

        // Build the complex moderatorPermissions object
        moderatorPermissions = {
          userManagement: permissionNames.includes("manage_users"),
          generalMessages: permissionNames.includes("send_notifications"),
          consultations: permissionNames.includes("reply_consultations"),
          inquiries: permissionNames.includes("reply_inquiries"),
          superPermissions: isSuperAdmin,
          advertisements: permissionNames.includes("manage_ads"),
          homePageManagement: permissionNames.includes("manage_content"),
          unionManagement: permissionNames.includes("manage_union"),
          hospitalsManagement: permissionNames.includes("manage_hospitals"),
          coursesManagement: permissionNames.includes("manage_courses"),
          approvals: permissionNames.some(
            (p) => p.startsWith("manage_") && p.endsWith("_approvals")
          ),
          pets: permissionNames.includes("manage_pets"),
          stats: permissionNames.includes("view_analytics"),
          clinics: permissionNames.includes("manage_clinics"),
          products: permissionNames.includes("manage_products"),
          content: permissionNames.includes("manage_content"),
          sections: [
            "stores",
            "clinics",
            "pets",
            "tips",
            "articles",
            "books",
          ].filter((section) => permissionNames.includes(`manage_${section}`)),
          storeManagement: {
            vetStores: permissionNames.includes("manage_vet_stores"),
            petOwnerStores: permissionNames.includes("manage_user_stores"),
          },
          approvalsSubPermissions: permissionNames.filter(
            (p) => p.startsWith("manage_") && p.endsWith("_approvals")
          ),
          storeManagementSubPermissions: [
            "manage_vet_stores",
            "manage_user_stores",
          ].filter((p) => permissionNames.includes(p)),
        };
      }

      // Generate tokens
      const tokens = generateAuthTokens({
        userId: user.id,
        email: user.email,
        userType: user.userType,
        roles,
      });

      // Return user data (without password)
      const { password: _, ...userWithoutPassword } = user;

      console.log("Current user: ", {
        ...userWithoutPassword,
        accountType: user.userType,
        licenseVerified: isVerifiedVet,
        hasAdminAccess,
        isSuperAdmin,
        isModerator,
        moderatorPermissions,
      });

      return {
        success: true,
        message: "Login successful",
        user: {
          ...userWithoutPassword,
          accountType: user.userType,
          licenseVerified: isVerifiedVet,
          hasAdminAccess,
          isSuperAdmin,
          isModerator,
          moderatorPermissions,
        },
        tokens,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      console.error("Login error:", error);
      throw new AuthenticationError("Login failed");
    }
  });

// Refresh access token
export const refreshTokenProcedure = publicProcedure
  .input(refreshTokenSchema)
  .mutation(async ({ input }) => {
    try {
      const { refreshToken } = input;

      // Generate new access token
      const newAccessToken = refreshAccessToken(refreshToken);

      return {
        success: true,
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }
  });

// Get current user profile
export const getProfileProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string().optional(),
    })
  )
  .query(async ({ input, ctx }) => {
    return {
      success: true,
      user: ctx.user,
    };
  });

// Update user profile
export const updateProfileProcedure = protectedProcedure
  .input(
    z.object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      const { name, phone } = input;
      const userId = ctx.user.id;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;

      if (Object.keys(updateData).length === 0) {
        throw new ValidationError("No fields provided for update");
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          phone: users.phone,
          userType: users.userType,
        });

      return {
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error("Profile update error:", error);
      throw new ValidationError("Failed to update profile");
    }
  });

// Change password
export const changePasswordProcedure = protectedProcedure
  .input(changePasswordSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const { currentPassword, newPassword } = input;
      const userId = ctx.user.id;

      // Validate new password strength
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.message);
      }

      // Get user's current password hash
      const [user] = await db
        .select({ password: users.password })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Verify current password
      const isValidCurrentPassword = await verifyPassword(
        currentPassword,
        user.password
      );
      if (!isValidCurrentPassword) {
        throw new AuthenticationError("Current password is incorrect");
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password
      await db
        .update(users)
        .set({
          password: hashedNewPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: "Password changed successfully",
      };
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }
      console.error("Password change error:", error);
      throw new ValidationError("Failed to change password");
    }
  });

// Logout (client-side token removal, server-side we could implement token blacklisting)
export const logoutProcedure = protectedProcedure.mutation(async ({ ctx }) => {
  // In a full implementation, you might want to blacklist the token
  // For now, we'll just return success and rely on client-side token removal

  return {
    success: true,
    message: "Logout successful",
  };
});

// Validate token (useful for checking if token is still valid)
export const validateTokenProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    return {
      success: true,
      valid: true,
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        userType: ctx.user.userType,
      },
    };
  }
);
