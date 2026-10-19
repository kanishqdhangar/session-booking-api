
import { User } from '../models/user.model';
import type { CreateUserInput } from '../validators/user.validator';
import { AppError } from '../utils/AppError';

export const createUser = async (input: CreateUserInput) => {
  try {
    return await User.create(input);
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    ) {
      throw new AppError(409, 'Email already registered');
    }

    throw error;
  }
};
