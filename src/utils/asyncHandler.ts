
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler
} from 'express';

type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asyncHandler = (
  controller: AsyncController
): RequestHandler => {
  return (req, res, next): void => {
    void controller(req, res, next).catch(next);
  };
};
