
import type { Request, Response } from 'express';
import { createTeacher } from '../services/teacher.service';
import type { CreateTeacherInput } from '../validators/teacher.validator';

export const createTeacherController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const teacher = await createTeacher(req.body as CreateTeacherInput);

  res.status(201).json({
    success: true,
    data: teacher
  });
};
