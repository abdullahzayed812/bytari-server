import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { logger } from "hono/logger";
import { rateLimiter } from "hono-rate-limiter";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { testConnection } from "./db";

// Test database connection on startup
(async () => {
  try {
    console.log("🔄 Testing database connection...");
    const connected = await testConnection();
    if (connected) {
      console.log("✅ Database connection established successfully!");
    } else {
      console.error("❌ Failed to connect to database");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1);
  }
})();

// Create Hono app
const app = new Hono();

// Security middleware
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
    referrerPolicy: "strict-origin-when-cross-origin",
  })
);

// Request logging
if (process.env.NODE_ENV !== "test") {
  app.use("*", logger());
}

// Rate limiting
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || "100");
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW || "60000"); // 1 minute

app.use(
  "*",
  rateLimiter({
    windowMs: rateLimitWindow,
    limit: rateLimitMax,
    standardHeaders: "draft-6",
    keyGenerator: (c) => {
      // Use IP address for rate limiting
      return c.env?.CF_CONNECTING_IP || c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    },
    handler: (c) => {
      return c.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Max ${rateLimitMax} requests per ${rateLimitWindow / 1000} seconds.`,
          retryAfter: Math.ceil(rateLimitWindow / 1000),
        },
        429
      );
    },
  })
);

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:8081",
      "http://localhost:3000",
      "http://127.0.0.1:8081",
      "http://127.0.0.1:3000",
      "exp://192.168.0.128:8081",
    ];

// Add production origins
if (process.env.NODE_ENV === "production") {
  // Add your production domains here
  allowedOrigins.push(...(process.env.PRODUCTION_ORIGINS?.split(",").map((origin) => origin.trim()) || []));
}

app.use(
  "*",
  cors({
    origin: (origin) => {
      // If no origin (native app or curl), allow it
      if (!origin || origin === "null") return "*"; // or return true;

      // Allow if in allowed list
      if (allowedOrigins.includes(origin)) return origin;

      // Disallow everything else
      return ""; // will result in CORS error
    },
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    credentials: true,
    maxAge: 86400,
  })
);

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    status: "ok",
    message: "Veterinary API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Health check endpoint with database test
app.get("/health", async (c) => {
  const dbConnected = await testConnection();
  return c.json({
    status: dbConnected ? "healthy" : "unhealthy",
    database: dbConnected ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/trpc",
  })
);

// Start server
const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`🚀 Veterinary Backend Server starting on port ${port}`);
console.log(`📊 Health check available at http://localhost:${port}/health`);
console.log(`🔌 tRPC endpoint available at http://localhost:${port}/trpc`);

export default {
  port,
  fetch: app.fetch,
};
