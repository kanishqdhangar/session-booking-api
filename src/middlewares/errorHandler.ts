
import type {
  ErrorRequestHandler
} from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message
      }))
    });
    return;
  }

  if (error instanceof MongooseError.CastError) {
    res.status(400).json({
      success: false,
      message: `Invalid ${error.path}`
    });
    return;
  }

  if (error instanceof MongooseError.ValidationError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed'
    });
    return;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  ) {
    res.status(409).json({
      success: false,
      message: 'Email already registered'
    });
    return;
  }

  if (env.NODE_ENV !== 'production') {
    console.error(error);
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
