
import type {
  Request,
  Response,
  NextFunction,
  RequestHandler
} from 'express';
import type { ZodType } from 'zod';

type RequestPart = 'body' | 'params' | 'query';

export const validate = (
  part: RequestPart,
  schema: ZodType
): RequestHandler => {
  return (
    req: Request,
    _res: Response,
    next: NextFunction
  ): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      next(result.error);
      return;
    }

    if (part === 'body') {
      req.body = result.data;
    }

    resaveValidatedData(req, part, result.data);
    next();
  };
};

const resaveValidatedData = (
  req: Request,
  part: RequestPart,
  data: unknown
): void => {
  if (part === 'body') {
    req.body = data;
  }
};
