

import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const isoDateSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const createSessionSchema = z
  .object({
    teacherId: objectIdSchema,
    startTime: isoDateSchema,
    endTime: isoDateSchema
  })
  .strict()
  .refine(
    (value) => value.endTime.getTime() > value.startTime.getTime(),
    {
      message: 'endTime must be greater than startTime',
      path: ['endTime']
    }
  );

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const objectIdParamSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/)
  })
  .strict();

export const bookSessionSchema = z
  .object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/)
  })
  .strict();


export const availableSessionsQuerySchema = z.object({
  dateTimestamp: z.coerce
    .number()
    .finite()
    .int()
    .safe()
    .min(1)
    .max(8_640_000_000_000_000),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
}).strict();

export type AvailableSessionsQuery = z.infer<
  typeof availableSessionsQuerySchema
>;
