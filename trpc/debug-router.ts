// Create this file: server/trpc/debug-router.ts
// This will help identify the exact conflict

import type { AppRouter } from "./app-router";

// This type will extract all route keys recursively
type ExtractRouteKeys<T> = T extends { _def: any } ? keyof T : never;

// Force TypeScript to show us the router structure
type RouterKeys = keyof AppRouter;

// This will cause a type error showing all keys
const showRouterKeys: RouterKeys = "" as any;

// Reserved names that cause conflicts
type ReservedNames =
  | "useContext"
  | "useUtils"
  | "Provider"
  | "createClient"
  | "useQuery"
  | "useMutation"
  | "useQueries"
  | "useInfiniteQuery"
  | "useSubscription"
  | "useSuspenseQuery"
  | "useSuspenseInfiniteQuery";

// Check if any router key matches reserved names
type CheckConflicts<T> = Extract<keyof T, ReservedNames>;

// This will show conflicts at the top level
type TopLevelConflicts = CheckConflicts<AppRouter>;

// Check nested routers
type AdminConflicts = CheckConflicts<AppRouter["admin"]>;
type AuthConflicts = CheckConflicts<AppRouter["auth"]>;
type PetsConflicts = CheckConflicts<AppRouter["pets"]>;
type UsersConflicts = CheckConflicts<AppRouter["users"]>;
type StoresConflicts = CheckConflicts<AppRouter["stores"]>;
type ClinicsConflicts = CheckConflicts<AppRouter["clinics"]>;
type WarehousesConflicts = CheckConflicts<AppRouter["warehouses"]>;
type CoursesConflicts = CheckConflicts<AppRouter["courses"]>;
type AiConflicts = CheckConflicts<AppRouter["ai"]>;

// Export types to see them in IDE
export type DebugInfo = {
  topLevel: TopLevelConflicts;
  admin: AdminConflicts;
  auth: AuthConflicts;
  pets: PetsConflicts;
  users: UsersConflicts;
  stores: StoresConflicts;
  clinics: ClinicsConflicts;
  warehouses: WarehousesConflicts;
  courses: CoursesConflicts;
  ai: AiConflicts;
};

// Log all router keys
console.log("=== tRPC Router Structure ===\n");

import { appRouter } from "./app-router";

function getAllKeys(obj: any, prefix = ""): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);

      // Check if it's an object with nested properties
      if (obj[key] && typeof obj[key] === "object" && !obj[key]._def) {
        keys.push(...getAllKeys(obj[key], fullKey));
      }
    }
  }

  return keys;
}

const allKeys = getAllKeys(appRouter);
const reservedNames = [
  "useContext",
  "useUtils",
  "Provider",
  "createClient",
  "useQuery",
  "useMutation",
  "useQueries",
  "useInfiniteQuery",
  "useSubscription",
  "useSuspenseQuery",
  "useSuspenseInfiniteQuery",
];

console.log("All router keys:");
allKeys.forEach((key) => {
  const lastPart = key.split(".").pop() || "";
  const isReserved = reservedNames.includes(lastPart);
  console.log(`${isReserved ? "❌" : "✅"} ${key}${isReserved ? " (CONFLICT!)" : ""}`);
});

const conflicts = allKeys.filter((key) => {
  const lastPart = key.split(".").pop() || "";
  return reservedNames.includes(lastPart);
});

if (conflicts.length > 0) {
  console.log("\n=== CONFLICTS FOUND ===");
  console.log("The following routes conflict with tRPC reserved names:\n");
  conflicts.forEach((conflict) => {
    console.log(`❌ ${conflict}`);
  });
  console.log("\nPlease rename these procedures in your route files.");
} else {
  console.log("\n✅ No obvious conflicts found in router keys.");
  console.log("The issue might be in the procedure definitions themselves.");
}
