
import { Router } from 'express';

import {
  bookSessionController,
  completeSessionController,
  createSessionController,
  getAvailableSessionsController,
} from '../controllers/session.controller';

import { validate } from '../middlewares/validate';
import { asyncHandler } from '../utils/asyncHandler';

import {
  availableSessionsQuerySchema,
  bookSessionSchema,
  createSessionSchema,
  objectIdParamSchema,
} from '../validators/session.validator';

const router = Router();

// Create a session
router.post(
  '/',
  validate('body', createSessionSchema),
  asyncHandler(createSessionController),
);

// Find available sessions for a date
router.get(
  '/available',
  validate('query', availableSessionsQuerySchema),
  asyncHandler(getAvailableSessionsController),
);

// Book a session
router.post(
  '/:id/book',
  validate('params', objectIdParamSchema),
  validate('body', bookSessionSchema),
  asyncHandler(bookSessionController),
);

// Complete a booked session
router.patch(
  '/:id/complete',
  validate('params', objectIdParamSchema),
  asyncHandler(completeSessionController),
);

export default router;
