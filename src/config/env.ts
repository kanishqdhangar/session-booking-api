
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z.string().trim().min(1, 'MONGODB_URI is required'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  BASE_URL: z.string().url().default('http://localhost:3000')
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${parsedEnv.error.message}`
  );
}

export const env = parsedEnv.data;
