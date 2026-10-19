
import { z } from 'zod';

export const createUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/)
  })
  .strict();

export type CreateUserInput = z.infer<typeof createUserSchema>;
