import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { verifyToken, extractTokenFromHeader, JWTPayload } from "../lib/auth";
import { AuthenticationError, AuthorizationError } from "../lib/errors";
import { db, users } from "../db";
import { eq } from "drizzle-orm";

// Extended context with user information
interface AuthenticatedContext {
  req: Request;
  user: {
    id: number;
    email: string;
    userType: string;
    name: string;
    isActive: boolean;
  };
}

interface PublicContext {
  req: Request;
  user?: undefined;
}

export type Context = AuthenticatedContext | PublicContext;

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions): Promise<PublicContext> => {
  return {
    req: opts.req,
    // User will be added by authentication middleware
  };
};

// Helper function to create user-friendly error messages
const createUserFriendlyMessage = (zodError: any): string => {
  if (!zodError || !zodError.issues) {
    return "Please check your input and try again";
  }

  const issue = zodError.issues[0];
  const field = issue.path?.join(".") || "field";

  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "string") return `Please enter a valid ${field}`;
      if (issue.expected === "number") return `Please enter a valid number for ${field}`;
      if (issue.expected === "object") return `Please provide required information`;
      return `Please enter a valid ${field}`;

    case "too_small":
      if (field === "password") return "Password must be at least 8 characters long";
      if (field === "name") return "Name must be at least 2 characters long";
      return `${field} is too short`;

    case "invalid_string":
      if (issue.validation === "email") return "Please enter a valid email address";
      return `Please enter a valid ${field}`;

    case "invalid_enum_value":
      return `Please select a valid option for ${field}`;

    default:
      return issue.message || `Please check your ${field} and try again`;
  }
};

// Initialize tRPC with improved error handling
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const isDev = process.env.NODE_ENV === "development";

    // Create user-friendly error response
    const userFriendlyError = {
      success: false,
      error: {
        code: error.code,
        type: "UNKNOWN_ERROR",
        message: "Something went wrong. Please try again.",
      },
    };

    // Handle validation errors (Zod errors)
    if (error.code === "BAD_REQUEST" && error.cause) {
      userFriendlyError.error.type = "VALIDATION_ERROR";
      userFriendlyError.error.message = createUserFriendlyMessage(error.cause);
    }

    // Handle authentication errors
    else if (error.code === "UNAUTHORIZED") {
      userFriendlyError.error.type = "AUTHENTICATION_REQUIRED";
      userFriendlyError.error.message = error.message || "Please log in to continue";
    }

    // Handle authorization errors
    else if (error.code === "FORBIDDEN") {
      userFriendlyError.error.type = "ACCESS_DENIED";
      userFriendlyError.error.message = error.message || "You do not have permission to perform this action";
    }

    // Handle not found errors
    else if (error.code === "NOT_FOUND") {
      userFriendlyError.error.type = "NOT_FOUND";
      userFriendlyError.error.message = error.message || "The requested resource was not found";
    }

    // Handle conflict errors
    else if (error.code === "CONFLICT") {
      userFriendlyError.error.type = "ALREADY_EXISTS";
      userFriendlyError.error.message = error.message || "This resource already exists";
    }

    // Handle rate limiting
    else if (error.code === "TOO_MANY_REQUESTS") {
      userFriendlyError.error.type = "RATE_LIMITED";
      userFriendlyError.error.message = "Too many requests. Please try again later";
    }

    // Handle internal server errors
    else if (error.code === "INTERNAL_SERVER_ERROR") {
      userFriendlyError.error.type = "SERVER_ERROR";
      userFriendlyError.error.message = "We are experiencing technical difficulties. Please try again later";
    }

    // Custom error message if provided
    else if (error.message) {
      userFriendlyError.error.message = error.message;
    }

    // In development, add debug information
    if (isDev) {
      return {
        ...userFriendlyError,
        _debug: {
          originalError: shape,
          stack: error.stack,
          cause: error.cause,
        },
      };
    }

    return userFriendlyError;
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Authentication middleware
const isAuthenticated = t.middleware(async ({ next, ctx }) => {
  const authHeader = ctx.req.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError("No authentication token provided");
  }

  try {
    // Verify JWT token
    const payload: JWTPayload = verifyToken(token);

    // Fetch user from database to ensure they still exist and are active
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        userType: users.userType,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    if (!user.isActive) {
      throw new AuthenticationError("User account is inactive");
    }

    // Return context with authenticated user
    return next({
      ctx: {
        ...ctx,
        user,
      } as AuthenticatedContext,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError("Invalid or expired token");
  }
});

// Admin authentication middleware
const isAdmin = t.middleware(async ({ next, ctx }) => {
  const authHeader = ctx.req.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError("No authentication token provided");
  }

  try {
    // Verify JWT token
    const payload: JWTPayload = verifyToken(token);

    // Fetch user from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        userType: users.userType,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    if (!user.isActive) {
      throw new AuthenticationError("User account is inactive");
    }

    if (user.userType !== "admin") {
      throw new AuthorizationError("Admin access required");
    }

    // Return context with authenticated admin user
    return next({
      ctx: {
        ...ctx,
        user,
      } as AuthenticatedContext,
    });
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new AuthenticationError("Invalid or expired token");
  }
});

// Veterinarian authentication middleware
const isVeterinarian = t.middleware(async ({ next, ctx }) => {
  const authHeader = ctx.req.headers.get("authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError("No authentication token provided");
  }

  try {
    // Verify JWT token
    const payload: JWTPayload = verifyToken(token);

    // Fetch user from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        userType: users.userType,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw new AuthenticationError("User not found");
    }

    if (!user.isActive) {
      throw new AuthenticationError("User account is inactive");
    }

    if (user.userType !== "vet" && user.userType !== "admin") {
      throw new AuthorizationError("Veterinarian access required");
    }

    // Return context with authenticated veterinarian user
    return next({
      ctx: {
        ...ctx,
        user,
      } as AuthenticatedContext,
    });
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error;
    }
    throw new AuthenticationError("Invalid or expired token");
  }
});

// Protected procedures
export const protectedProcedure = publicProcedure.use(isAuthenticated);
export const adminProcedure = publicProcedure.use(isAdmin);
export const vetProcedure = publicProcedure.use(isVeterinarian);
