
import { Router } from 'express';
import { createTeacherController } from '../controllers/teacher.controller';
import { validate } from '../middlewares/validate';
import { createTeacherSchema } from '../validators/teacher.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/',
  validate('body', createTeacherSchema),
  asyncHandler(createTeacherController)
);

export default router;
