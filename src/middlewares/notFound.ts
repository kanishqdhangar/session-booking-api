
import type { RequestHandler } from 'express';

export const notFound: RequestHandler = (_req, res): void => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};
