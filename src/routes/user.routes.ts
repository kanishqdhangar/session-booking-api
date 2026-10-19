
import { Router } from 'express';
import { createUserController } from '../controllers/user.controller';
import { validate } from '../middlewares/validate';
import { createUserSchema } from '../validators/user.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/',
  validate('body', createUserSchema),
  asyncHandler(createUserController)
);

export default router;
