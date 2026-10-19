
import mongoose, { Types, type PipelineStage } from 'mongoose';
import { connectDatabase } from '../src/config/db';
import { env } from '../src/config/env';
import { Session } from '../src/models/session.model';
import { Teacher } from '../src/models/teacher.model';
import { User } from '../src/models/user.model';
import { SessionStatus } from '../src/types/enums';
import {
  buildAvailableSessionsPipeline,
  buildUserSessionsPipeline,
} from '../src/services/session.pipeline';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const SEED_PREFIX = 'explain-seed-';
const TEACHER_EMAIL = `${SEED_PREFIX}teacher@example.com`;
const USER_COUNT = 50;
const SESSION_COUNT = 20_000;
const BATCH_SIZE = 1_000;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readNumber = (record: JsonRecord, key: string): number | undefined => {
  const value = record[key];
  return typeof value === 'number' ? value : undefined;
};


const findExecutionStats = (
  value: unknown,
): JsonRecord | undefined => {
  if (Array.isArray(value)) {
    for (const child of value) {
      const result = findExecutionStats(child);
      if (result) return result;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  if ('executionStats' in value && isRecord(value.executionStats)) {
    return value.executionStats;
  }

  for (const child of Object.values(value)) {
    const result = findExecutionStats(child);
    if (result) return result;
  }

  return undefined;
};

const collectPlanStages = (value: unknown, stages: Set<string>): void => {
  if (Array.isArray(value)) {
    for (const child of value) collectPlanStages(child, stages);
    return;
  }

  if (!isRecord(value)) return;

  const stage = value.stage;
  if (typeof stage === 'string') stages.add(stage);

  for (const child of Object.values(value)) {
    collectPlanStages(child, stages);
  }
};

const writeExplain = async (
  name: string,
  pipeline: PipelineStage[],
): Promise<void> => {
  const result: unknown = await Session.aggregate(pipeline)
    .explain('executionStats');

  const outputDirectory = path.resolve(process.cwd(), 'explain-output');
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, `${name}.json`),
    JSON.stringify(result, null, 2),
    'utf8',
  );

  const stats = findExecutionStats(result);
  const stages = new Set<string>();
  collectPlanStages(result, stages);

  console.log(`\n--- ${name} ---`);
  console.log(`Plan stages: ${[...stages].join(', ') || 'Not exposed by this MongoDB version'}`);
  console.log(`totalKeysExamined: ${stats ? readNumber(stats, 'totalKeysExamined') ?? 'Not exposed' : 'Not exposed'}`);
  console.log(`totalDocsExamined: ${stats ? readNumber(stats, 'totalDocsExamined') ?? 'Not exposed' : 'Not exposed'}`);
  console.log(`nReturned: ${stats ? readNumber(stats, 'nReturned') ?? 'Not exposed' : 'Not exposed'}`);
  console.log(`executionTimeMillis: ${stats ? readNumber(stats, 'executionTimeMillis') ?? 'Not exposed' : 'Not exposed'}`);
  console.log(`Saved: explain-output/${name}.json`);

  if (stages.has('COLLSCAN')) {
    console.warn(
      'COLLSCAN detected. Review the actual explain output before deciding whether an index change is needed.',
    );
  }
};

const main = async (): Promise<void> => {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run explain seeding in production.');
  }

  const seedUserIds: Types.ObjectId[] = [];
  const seedSessionIds: Types.ObjectId[] = [];
  let seedTeacherId: Types.ObjectId | undefined;

  try {
    await connectDatabase();

    await User.deleteMany({ email: new RegExp(`^${SEED_PREFIX}user-`) });
    await Session.deleteMany({ _id: { $in: seedSessionIds } });
    await Teacher.deleteMany({ email: TEACHER_EMAIL });

    const teacher = await Teacher.create({
      fullName: 'Explain Seed Teacher',
      email: TEACHER_EMAIL,
      specialization: 'Performance Testing',
      experience: 5,
    });
    seedTeacherId = teacher._id;

    const users = Array.from({ length: USER_COUNT }, (_, index) => ({
      fullName: `Explain Seed User ${index + 1}`,
      email: `${SEED_PREFIX}user-${index + 1}@example.com`,
      phone: `+1555${String(index + 1).padStart(7, '0')}`,
    }));

    for (let offset = 0; offset < users.length; offset += BATCH_SIZE) {
      const batch = users.slice(offset, offset + BATCH_SIZE);
      const inserted = await User.insertMany(batch);
      seedUserIds.push(...inserted.map((user) => user._id));
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ));
    const dayStart = new Date(todayStart);
    dayStart.setUTCDate(dayStart.getUTCDate() - 1);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    for (let offset = 0; offset < SESSION_COUNT; offset += BATCH_SIZE) {
      const count = Math.min(BATCH_SIZE, SESSION_COUNT - offset);
      const documents = Array.from({ length: count }, (_, index) => {
        const globalIndex = offset + index;
        const dayOffset = globalIndex % 30;
        const startTime = new Date(dayStart);
        startTime.setUTCDate(startTime.getUTCDate() + dayOffset);
        startTime.setUTCHours(globalIndex % 24, (globalIndex % 4) * 15, 0, 0);

        const status =
          globalIndex % 3 === 0
            ? SessionStatus.AVAILABLE
            : globalIndex % 3 === 1
              ? SessionStatus.BOOKED
              : SessionStatus.COMPLETED;

        const document = {
          teacherId: seedTeacherId,
          userId:
            status === SessionStatus.AVAILABLE
              ? null
              : seedUserIds[globalIndex % seedUserIds.length],
          startTime,
          endTime: new Date(startTime.getTime() + 60 * 60 * 1000),
          status,
          completedAt:
            status === SessionStatus.COMPLETED
              ? new Date(startTime.getTime() + 60 * 60 * 1000)
              : null,
        };

        return document;
      });

      const inserted = await Session.insertMany(documents);
      seedSessionIds.push(...inserted.map((session) => session._id));
    }

    const userId = seedUserIds[0];
    const pagination = { page: 1, limit: 20 };

    await writeExplain(
      'available-sessions',
      buildAvailableSessionsPipeline({ dayStart, dayEnd }),
    );
    await writeExplain(
      'available-sessions-paginated',
      buildAvailableSessionsPipeline({ dayStart, dayEnd, pagination }),
    );
    await writeExplain(
      'user-sessions',
      buildUserSessionsPipeline(userId),
    );
  } finally {
    if (seedSessionIds.length > 0) {
      await Session.deleteMany({ _id: { $in: seedSessionIds } });
    }

    if (seedUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: seedUserIds } });
    }

    if (seedTeacherId) {
      await Teacher.deleteOne({ _id: seedTeacherId });
    }

    await mongoose.connection.close();
  }
};

void main().catch((error: unknown) => {
  console.error('Explain script failed:', error);
  process.exitCode = 1;
});
