import { Request, Response, NextFunction } from 'express';

// Wraps an async controller so thrown errors reach errorHandler middleware.
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
