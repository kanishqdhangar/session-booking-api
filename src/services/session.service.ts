
import { Types } from 'mongoose';
import { Session } from '../models/session.model';
import { Teacher } from '../models/teacher.model';
import { User } from '../models/user.model';
import { SessionStatus } from '../types/enums';
import { AppError } from '../utils/AppError';
import type { CreateSessionInput } from '../validators/session.validator';

export const createSession = async (input: CreateSessionInput) => {
  if (!Types.ObjectId.isValid(input.teacherId)) {
    throw new AppError(400, 'Invalid teacherId');
  }

  const teacher = await Teacher.findById(input.teacherId);

  if (!teacher) {
    throw new AppError(404, 'Teacher not found');
  }

  return await Session.create({
    teacherId: new Types.ObjectId(input.teacherId),
    startTime: input.startTime,
    endTime: input.endTime,
    status: SessionStatus.AVAILABLE,
    userId: null,
    completedAt: null
  });
};

export const bookSession = async (
  sessionId: string,
  userId: string
) => {
  if (
    !Types.ObjectId.isValid(sessionId) ||
    !Types.ObjectId.isValid(userId)
  ) {
    throw new AppError(400, 'Invalid ObjectId');
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  // The status condition makes booking atomic: only one request can win.
  const session = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      status: SessionStatus.AVAILABLE
    },
    {
      $set: {
        status: SessionStatus.BOOKED,
        userId: new Types.ObjectId(userId)
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (session) {
    return session;
  }

  const existingSession = await Session.findById(sessionId);

  if (!existingSession) {
    throw new AppError(404, 'Session not found');
  }

  throw new AppError(409, 'Session is not available for booking');
};

export const completeSession = async (sessionId: string) => {
  if (!Types.ObjectId.isValid(sessionId)) {
    throw new AppError(400, 'Invalid sessionId');
  }

  const session = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      status: SessionStatus.BOOKED
    },
    {
      $set: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date()
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (session) {
    return session;
  }

  const existingSession = await Session.findById(sessionId);

  if (!existingSession) {
    throw new AppError(404, 'Session not found');
  }

  throw new AppError(
    409,
    'Only BOOKED sessions can be marked as completed'
  );
};
