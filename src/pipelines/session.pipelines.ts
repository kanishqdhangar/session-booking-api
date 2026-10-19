
import type { PipelineStage } from 'mongoose';
import { SessionStatus } from '../types/enums';

export const availableSessionsPipeline = (
  startOfDay: Date,
  endOfDay: Date,
): PipelineStage[] => [
  {
    $match: {
      status: SessionStatus.AVAILABLE,
      startTime: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    },
  },
  {
    $lookup: {
      from: 'teachers',
      localField: 'teacherId',
      foreignField: '_id',
      as: 'teacher',
    },
  },
  {
    $unwind: '$teacher',
  },
  {
    $project: {
      teacherId: 1,
      startTime: 1,
      endTime: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      teacher: {
        _id: '$teacher._id',
        fullName: '$teacher.fullName',
        email: '$teacher.email',
        specialization: '$teacher.specialization',
        experience: '$teacher.experience',
      },
    },
  },
  {
    $sort: {
      startTime: 1,
    },
  },
];
