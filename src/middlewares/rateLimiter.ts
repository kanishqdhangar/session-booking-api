
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError(
        429,
        'Too many requests, please try again later'
      )
    );
  }
});
