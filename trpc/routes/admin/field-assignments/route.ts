import { publicProcedure } from "../../../create-context";
import { db, users, veterinarians } from "../../../../db";
import { eq } from "drizzle-orm";
import { getAssignmentRequestsProcedure } from "../../assignment-requests/route";

export const getFieldAssignments = getAssignmentRequestsProcedure;

export const getAvailableVets = publicProcedure.query(async () => {
  const vets = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      specialization: veterinarians.specialization,
    })
    .from(users)
    .leftJoin(veterinarians, eq(users.id, veterinarians.userId))
    .where(eq(users.userType, "vet"));
  return vets;
});

export const getAvailableSupervisors = publicProcedure.query(async () => {
  const supervisors = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.userType, "admin"));
  return supervisors;
});
