
import type { Request, Response } from 'express';
import { createUser } from '../services/user.service';
import type { CreateUserInput } from '../validators/user.validator';

export const createUserController = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await createUser(req.body as CreateUserInput);

  res.status(201).json({
    success: true,
    data: user
  });
};
