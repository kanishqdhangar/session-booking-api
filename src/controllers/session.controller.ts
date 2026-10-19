
import type { Request, Response } from 'express';
import {
  bookSession,
  completeSession,
  createSession
} from '../services/session.service';
import { Session } from '../models/session.model';
import {
  buildAvailableSessionsPipeline
} from '../services/session.pipeline';
import {
  availableSessionsQuerySchema
} from '../validators/session.validator';
import type { CreateSessionInput } from '../validators/session.validator';
import { AppError } from '../utils/AppError';

const getSessionId = (id: string | string[]): string => {
  if (typeof id !== 'string') {
    throw new AppError(400, 'Invalid sessionId');
  }

  return id;
};

export const createSessionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await createSession(
    req.body as CreateSessionInput
  );

  res.status(201).json({
    success: true,
    data: session
  });
};

export const bookSessionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId } = req.body as { userId: string };

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const session = await bookSession(
    getSessionId(req.params.id),
    userId
  );

  res.status(200).json({
    success: true,
    data: session
  });
};

export const completeSessionController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await completeSession(
    getSessionId(req.params.id)
  );

  res.status(200).json({
    success: true,
    data: session
  });
};

export const getAvailableSessionsController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsedQuery = availableSessionsQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    throw new AppError(
      400,
      'dateTimestamp must be a valid Unix timestamp in milliseconds'
    );
  }

  const { dateTimestamp, page, limit } = parsedQuery.data;

  if (
    !Number.isSafeInteger(dateTimestamp) ||
    dateTimestamp <= 0 ||
    !Number.isFinite(new Date(dateTimestamp).getTime())
  ) {
    throw new AppError(
      400,
      'dateTimestamp must be a valid Unix timestamp in milliseconds'
    );
  }

  const requestedDate = new Date(dateTimestamp);

  const startOfDay = new Date(
    Date.UTC(
      requestedDate.getUTCFullYear(),
      requestedDate.getUTCMonth(),
      requestedDate.getUTCDate()
    )
  );

  const endOfDay = new Date(
    startOfDay.getTime() + 24 * 60 * 60 * 1000
  );

  // Pagination is opt-in: without either query parameter,
  // retain the original response format.
  const paginationRequested =
    req.query.page !== undefined ||
    req.query.limit !== undefined;

  if (!paginationRequested) {
    const sessions = await Session.aggregate(
      buildAvailableSessionsPipeline({
        dayStart: startOfDay,
        dayEnd: endOfDay
      })
    );

    res.status(200).json({
      success: true,
      data: sessions
    });

    return;
  }

  const pagination = {
    page: page ?? 1,
    limit: limit ?? 20
  };

  const [result] = await Session.aggregate(
    buildAvailableSessionsPipeline({
      dayStart: startOfDay,
      dayEnd: endOfDay,
      pagination
    })
  );

  const sessions = result?.data ?? [];
  const total = result?.total?.[0]?.count ?? 0;

  res.status(200).json({
    success: true,
    data: sessions,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit)
    }
  });
};
