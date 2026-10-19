
import type { Request, Response } from 'express';
import { getUserSessions } from '../services/user-session.service';
import { AppError } from '../utils/AppError';

export const getUserSessionsController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const userId = req.params.id;

  if (typeof userId !== 'string') {
    throw new AppError(400, 'Invalid userId');
  }

  const sessions = await getUserSessions(userId);

  res.status(200).json({
    success: true,
    data: sessions,
  });
};
