
import type { Request, Response } from 'express';
import {
  bookSession,
  completeSession,
  createSession
} from '../services/session.service';
import type { CreateSessionInput } from '../validators/session.validator';
import { AppError } from '../utils/AppError';
import { Session } from '../models/session.model';
import { availableSessionsPipeline } from '../pipelines/session.pipelines';

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
  const { id } = req.params;
  const { userId } = req.body as { userId: string };

  if (!userId) {
    throw new AppError(400, 'userId is required');
  }

  const session = await bookSession(getSessionId(id), userId);

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
  res: Response,
): Promise<void> => {
  const timestamp = Number(req.query.dateTimestamp);

  if (
    !Number.isSafeInteger(timestamp) ||
    timestamp < 0 ||
    !Number.isFinite(new Date(timestamp).getTime())
  ) {
    throw new AppError(400, 'dateTimestamp must be a valid Unix timestamp in milliseconds');
  }

  const requestedDate = new Date(timestamp);
  const startOfDay = new Date(
    Date.UTC(
      requestedDate.getUTCFullYear(),
      requestedDate.getUTCMonth(),
      requestedDate.getUTCDate(),
    ),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const sessions = await Session.aggregate(
    availableSessionsPipeline(startOfDay, endOfDay),
  );

  res.status(200).json({
    success: true,
    count: sessions.length,
    data: sessions,
  });
};

