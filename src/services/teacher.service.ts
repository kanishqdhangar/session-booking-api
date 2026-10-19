
import { Teacher } from '../models/teacher.model';
import type { CreateTeacherInput } from '../validators/teacher.validator';
import { AppError } from '../utils/AppError';

export const createTeacher = async (input: CreateTeacherInput) => {
  try {
    return await Teacher.create(input);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new AppError(409, 'Teacher email already registered');
    }

    throw error;
  }
};
