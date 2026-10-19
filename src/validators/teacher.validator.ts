
import { z } from 'zod';

export const createTeacherSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().transform((value) => value.toLowerCase()),
    specialization: z.string().trim().min(2).max(100),
    experience: z.number().int().min(0)
  })
  .strict();

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
