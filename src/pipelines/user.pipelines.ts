
import type { PipelineStage, Types } from 'mongoose';

export const userSessionsPipeline = (
  userId: Types.ObjectId,
): PipelineStage[] => [
  {
    $match: {
      userId,
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
    $unwind: {
      path: '$teacher',
      preserveNullAndEmptyArrays: false,
    },
  },
  {
    $project: {
      _id: 1,
      teacherId: 1,
      userId: 1,
      startTime: 1,
      endTime: 1,
      status: 1,
      completedAt: 1,
      createdAt: 1,
      updatedAt: 1,
      teacher: {
        _id: '$teacher._id',
        fullName: '$teacher.fullName',
        specialization: '$teacher.specialization',
        experience: '$teacher.experience',
      },
    },
  },
  {
    $sort: {
      startTime: -1,
    },
  },
];
