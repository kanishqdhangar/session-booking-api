
import type { PipelineStage, Types } from 'mongoose';
import { SessionStatus } from '../types/enums';

interface AvailableSessionsPipelineOptions {
  dayStart: Date;
  dayEnd: Date;
  pagination?: {
    page: number;
    limit: number;
  };
}

export const buildAvailableSessionsPipeline = ({
  dayStart,
  dayEnd,
  pagination,
}: AvailableSessionsPipelineOptions): PipelineStage[] => {
  const matchStage: PipelineStage.Match = {
    $match: {
      status: SessionStatus.AVAILABLE,
      startTime: {
        $gte: dayStart,
        $lt: dayEnd,
      },
    },
  };

  const sortStage: PipelineStage.Sort = {
    $sort: {
      startTime: 1,
      _id: 1,
    },
  };

  const teacherStages: PipelineStage[] = [
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
        _id: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        teacher: {
          _id: '$teacher._id',
          fullName: '$teacher.fullName',
          specialization: '$teacher.specialization',
        },
      },
    },
  ];

  if (!pagination) {
    return [matchStage, sortStage, ...teacherStages];
  }

  const { page, limit } = pagination;

  return [
    matchStage,
    sortStage,
    {
        $facet: {
            data: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
                $lookup: {
                from: 'teachers',
                localField: 'teacherId',
                foreignField: '_id',
                as: 'teacher',
                },
            },
            { $unwind: '$teacher' },
            {
                $project: {
                _id: 1,
                startTime: 1,
                endTime: 1,
                status: 1,
                teacher: {
                    _id: '$teacher._id',
                    fullName: '$teacher.fullName',
                    specialization: '$teacher.specialization',
                },
                },
            },
            ],
            total: [{ $count: 'count' }],
        },
        }
  ];
};

export const buildUserSessionsPipeline = (
  userId: Types.ObjectId,
): PipelineStage[] => [
  {
    $match: {
      userId,
      status: {
        $in: [SessionStatus.BOOKED, SessionStatus.COMPLETED],
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
      _id: 1,
      startTime: 1,
      endTime: 1,
      status: 1,
      completedAt: 1,
      teacher: {
        _id: '$teacher._id',
        fullName: '$teacher.fullName',
        specialization: '$teacher.specialization',
      },
    },
  },
  {
    $facet: {
      upcomingSessions: [
        { $match: { status: SessionStatus.BOOKED } },
        { $sort: { startTime: 1, _id: 1 } },
      ],
      completedSessions: [
        { $match: { status: SessionStatus.COMPLETED } },
        { $sort: { completedAt: -1, _id: 1 } },
      ],
    },
  },
];
