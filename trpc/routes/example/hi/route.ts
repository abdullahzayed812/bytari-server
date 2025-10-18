import { z } from "zod";
import { publicProcedure } from "../../../create-context";

// Test query for debugging
export const testQuery = publicProcedure.query(() => {
  console.log('Test query called successfully');
  return {
    greeting: 'Hello from tRPC!',
    timestamp: new Date().toISOString(),
    status: 'working',
    message: 'tRPC connection is working properly'
  };
});

// Original mutation
export default publicProcedure
  .input(z.object({ name: z.string() }))
  .mutation(({ input }) => {
    console.log('Hi mutation received:', input);
    return {
      hello: input.name,
      date: new Date(),
      success: true
    };
  });