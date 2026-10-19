
import { Types } from 'mongoose';
import { User } from '../models/user.model';
import { Session } from '../models/session.model';
import { AppError } from '../utils/AppError';
import { buildUserSessionsPipeline } from './session.pipeline';

export const getUserSessions = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError(400, 'Invalid userId');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  const result = await Session.aggregate(
    buildUserSessionsPipeline(new Types.ObjectId(userId)),
  );

  return result[0] ?? {
    upcomingSessions: [],
    completedSessions: [],
  };
};
