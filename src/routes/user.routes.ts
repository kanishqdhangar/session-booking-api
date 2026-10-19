
import { Router } from 'express';
import { createUserController } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { createUserSchema } from '../validators/user.validator';
import { asyncHandler } from '../utils/asyncHandler';
import { getUserSessionsController } from '../controllers/user-session.controller';
import { objectIdParamSchema } from '../validators/session.validator';

const router = Router();

router.post(
  '/',
  validate('body', createUserSchema),
  asyncHandler(createUserController)
);

router.get(
  '/:id/sessions',
  validate('params', objectIdParamSchema),
  asyncHandler(getUserSessionsController),
);

export default router;
